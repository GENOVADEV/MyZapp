import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';

export default function StripeForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    setErrorMessage("");

    // 🚀 Lancement du paiement sans redirection !
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required', // 👈 LE SECRET EST ICI : "Ne redirige que si la banque l'exige (ex: 3D Secure)"
    });

    if (error) {
      setErrorMessage(error.message || "Une erreur est survenue");
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // 🎉 Succès immédiat !
      onSuccess();
    }
    
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* C'est ici que Stripe va injecter magiquement ses champs de carte */}
      <PaymentElement options={{ layout: 'tabs' }} /> 
      
      {errorMessage && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
          {errorMessage}
        </div>
      )}

      <button 
        disabled={!stripe || isLoading} 
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 disabled:opacity-50 transition-colors"
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Payer de manière sécurisée"}
      </button>
    </form>
  );
}