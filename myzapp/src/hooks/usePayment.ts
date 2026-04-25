import { useState, useCallback } from 'react';

interface PaymentDetails {
  amount: number;
  planName: string;
  userId: string;
  phoneNumber?: string; // Requis uniquement pour Campay
}

export function usePayment() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 🌍 1. INITIATION STRIPE
  const initiateStripePayment = async ({ amount, planName, userId }: PaymentDetails) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, planName, userId }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erreur lors de l'initialisation Stripe");

      // Redirection immédiate vers la page de paiement Stripe
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  // 🇨🇲 2. INITIATION CAMPAY (Mobile Money)
  const initiateCampayPayment = async ({ phoneNumber, amount, planName, userId }: PaymentDetails) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/checkout/campay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, amount, planName, userId }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erreur lors de l'initialisation Campay");

      setSuccessMessage(data.message); // "Veuillez valider sur votre téléphone"
      setIsLoading(false);
      
      // On retourne la référence pour que le composant puisse lancer la vérification
      return data.campayReference; 
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
      return null;
    }
  };

  // 🔍 3. VÉRIFICATION DU STATUT EN TEMPS RÉEL (Polling)
  const verifyPaymentStatus = useCallback(async (reference: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/transactions/${reference}`);
      const data = await res.json();

      if (data.status === 'SUCCESS') {
        return true;
      }
      return false;
    } catch (err) {
      console.error("Erreur de vérification :", err);
      return false;
    }
  }, []);

  return {
    initiateStripePayment,
    initiateCampayPayment,
    verifyPaymentStatus,
    isLoading,
    error,
    successMessage,
  };
}