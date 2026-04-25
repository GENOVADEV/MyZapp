import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: Request) {
  try {
    const { amount, planName, userId } = await req.json();

    if (!amount || !planName || !userId) {
      return NextResponse.json({ error: "Informations manquantes" }, { status: 400 });
    }

    const unitAmount = Math.round(parseFloat(amount) * 100);

    // 1. On crée une intention de paiement (au lieu d'une session de redirection)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: unitAmount,
      currency: 'eur', // ou 'xaf' si tu as configuré Stripe pour l'Afrique, sinon garde 'eur'
      metadata: { userId, planName },
      automatic_payment_methods: { enabled: true }, // Active Apple Pay / Google Pay auto
    });

    // 2. On sauvegarde la transaction avec l'ID du PaymentIntent (pi_...)
    await prisma.transaction.create({
      data: {
        userId: userId,
        amount: parseFloat(amount),
        currency: "EUR",
        provider: "STRIPE",
        status: "PENDING",
        reference: paymentIntent.id, 
        planPurchased: planName,
      }
    });

    // 3. On renvoie le sésame au frontend
    return NextResponse.json({ clientSecret: paymentIntent.client_secret });

  } catch (error: any) {
    console.error("❌ ERREUR STRIPE INTENT :", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}