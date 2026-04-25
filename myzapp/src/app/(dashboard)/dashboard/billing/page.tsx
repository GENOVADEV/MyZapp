"use client";

import { useState, useEffect } from 'react';
import { usePayment } from '@/hooks/usePayment';
import {
  CreditCard,
  Smartphone,
  CheckCircle2,
  Loader2,
  Zap,
  ShieldCheck,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripeForm from '@/components/ui/StripeForm'; // Ajuste le chemin selon où tu l'as mis

// On charge Stripe en dehors du composant pour ne pas le recharger à chaque rendu
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);

// --- MOCKS (À remplacer par les vraies données de ton botContext plus tard) ---
const PLANS = [
  { id: 'YOUNG', name: 'Young 🌱', price: 25, commands: 150, popular: false },
  { id: 'AGENT', name: 'Agent 🕵️‍♂️', price: 25, commands: 300, popular: true },
  { id: 'BUSINESS', name: 'Business 💼', price: 25, commands: 1000, popular: false },
];


export default function BillingPage() {
  const { user } = useAuth();
  const { initiateStripePayment, initiateCampayPayment, verifyPaymentStatus, isLoading, successMessage, error } = usePayment();
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // États de l'UI
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'momo' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [txReference, setTxReference] = useState<string | null>(null);

  // 🔄 Effet de Polling pour Campay (Vérifie si le client a tapé son code PIN)
  useEffect(() => {
    // On s'assure que le code s'exécute bien dans le navigateur
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);

      if (params.get('success')) {
        alert("🎉 Paiement Stripe réussi ! Votre compte a été mis à jour.");
        // Nettoie l'URL pour ne pas réafficher l'alerte si l'utilisateur rafraîchit la page
        window.history.replaceState({}, '', '/dashboard/billing');
      }
      else if (params.get('canceled')) {
        alert("⚠️ Le paiement Stripe a été annulé.");
        window.history.replaceState({}, '', '/dashboard/billing');
      }
    }
  }, []); // 👈 Le tableau vide [] signifie "Exécute ceci 1 seule fois au démarrage"


  // 🇨🇲 2. EFFET POUR CAMPAY (S'exécute et boucle quand on a une txReference)
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (txReference) {
      interval = setInterval(async () => {
        const isSuccess = await verifyPaymentStatus(txReference);
        if (isSuccess) {
          setTxReference(null); // Arrête la boucle
          setSelectedPlan(null); // Ferme la modale
          alert("🎉 Paiement Mobile Money validé avec succès !");

          // Optionnel : recharger la page ou le contexte pour afficher le nouveau forfait
          // window.location.reload(); 
        }
      }, 3000);
    }

    // Fonction de nettoyage quand le composant se démonte ou change d'état
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [txReference, verifyPaymentStatus]);

  // 🚀 Gestionnaire de paiement
  const handleCheckout = async (method: 'stripe' | 'momo') => {
    if (method === 'stripe') {
      await initiateStripePayment({
        amount: selectedPlan.price,
        planName: selectedPlan.id,
        userId: user?.id // (Ou realUserId selon ce que tu as mis)
      });
    } else if (method === 'momo') {
      const ref = await initiateCampayPayment({
        phoneNumber: phoneNumber,
        amount: selectedPlan.price,
        planName: selectedPlan.id,
        userId: user?.id
      });
      if (ref) setTxReference(ref);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">

      {/* HEADER */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Abonnement & Facturation</h1>
        <p className="text-gray-500 dark:text-gray-400">Gérez votre forfait MyZapp et suivez votre consommation.</p>
      </div>

      {/* CURRENT PLAN OVERVIEW */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Forfait Actuel</p>
          <div className="flex items-center gap-3 mt-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user?.plan}</h2>
            <span className="px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Actif
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Consommation : <strong className="text-gray-900 dark:text-white">{user?.usage}</strong> / {user?.maxUsage} requêtes
          </p>
        </div>
        <div className="w-full md:w-64">
          <div className="h-2 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${(user?.usage / user?.maxUsage) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* PRICING CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white dark:bg-zinc-900 border rounded-2xl p-6 flex flex-col shadow-sm transition-all hover:shadow-md ${plan.popular ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 dark:border-zinc-800'}`}
          >
            {plan.popular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 bg-indigo-500 text-white text-xs font-bold uppercase rounded-full">
                Le plus choisi
              </div>
            )}
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
            <div className="mt-4 flex items-baseline text-4xl font-extrabold text-gray-900 dark:text-white">
              {plan.price.toLocaleString()} <span className="text-lg text-gray-500 font-medium ml-1">FCFA</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">par mois</p>

            <ul className="mt-6 space-y-3 flex-1">
              <li className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Zap className="w-5 h-5 text-indigo-500 shrink-0" />
                Jusqu'à {plan.commands} commandes / jour
              </li>
              <li className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0" />
                Support prioritaire
              </li>
            </ul>

            <button
              onClick={() => { setSelectedPlan(plan); setPaymentMethod(null); }}
              className={`mt-8 w-full py-3 px-4 rounded-xl font-semibold transition-colors ${plan.popular ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white'}`}
            >
              Passer à {plan.name.split(' ')[0]}
            </button>
          </div>
        ))}
      </div>

      {/* MODAL DE PAIEMENT (Frictionless Experience) */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            <div className="p-5 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Paiement - {selectedPlan.name}</h3>
              <button onClick={() => { setSelectedPlan(null); setTxReference(null); }} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-6">

              {/* --- VUE 1 : CHOIX DE LA MÉTHODE (Si aucune n'est choisie) --- */}
              {!paymentMethod && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 mb-4">
                    Choisissez votre méthode de paiement pour un montant de <strong>{selectedPlan.price} FCFA</strong>.
                  </p>

                  {/* BOUTON MOBILE MONEY */}
                  <button
                    onClick={() => setPaymentMethod('momo')}
                    className="w-full flex items-center justify-between p-4 border border-gray-200 dark:border-zinc-800 rounded-xl hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 text-orange-600 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-colors">
                        <Smartphone className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 dark:text-white">Mobile Money</p>
                        <p className="text-xs text-gray-500">MTN & Orange (Cameroun)</p>
                      </div>
                    </div>
                  </button>

                  {/* BOUTON STRIPE (Il lance l'API au clic !) */}
                  <button
                    onClick={async () => {
                      setPaymentMethod('stripe');
                      // On demande le secret à notre nouvelle API
                      const res = await fetch('/api/checkout/stripe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          amount: selectedPlan.price,
                          planName: selectedPlan.id,
                          userId: user?.id // Ou ton vrai utilisateur
                        })
                      });
                      const data = await res.json();
                      setClientSecret(data.clientSecret);
                    }}
                    className="w-full flex items-center justify-between p-4 border border-gray-200 dark:border-zinc-800 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 dark:text-white">Carte Bancaire</p>
                        <p className="text-xs text-gray-500">Paiement international sécurisé</p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* --- VUE 2 : FORMULAIRE MOBILE MONEY --- */}
              {paymentMethod === 'momo' && (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                  {/* ... (Ton code pour le numéro de téléphone et le loader momo reste le même ici) ... */}
                </div>
              )}

              {/* --- VUE 3 : CHARGEMENT STRIPE (Plus de bouton ici !) --- */}
              {paymentMethod === 'stripe' && (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                  {!clientSecret ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-4">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                      <p className="text-sm text-gray-500">Sécurisation de la connexion...</p>
                    </div>
                  ) : (
                    <Elements stripe={stripePromise} options={{ clientSecret }}>
                      <StripeForm
                        onSuccess={() => {
                          alert("🎉 Paiement validé ! Bienvenue dans votre nouveau forfait.");
                          setSelectedPlan(null);
                          setPaymentMethod(null);
                          // Tu peux recharger la page ou le contexte ici
                        }}
                      />
                    </Elements>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}