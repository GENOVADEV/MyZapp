import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export async function POST(req: Request) {
  // Avec Stripe, on doit récupérer le corps de la requête en texte brut (pour vérifier la signature)
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event;

  try {
    // 1. Vérification de la signature cryptographique
    event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  } catch (err: any) {
    console.error(`❌ Erreur de signature Webhook Stripe : ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // 2. Traitement de l'événement (On écoute uniquement quand le paiement est validé)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // On récupère les métadonnées qu'on avait cachées à l'étape 2
    const userId = session.metadata?.userId;
    const planName = session.metadata?.planName;

    if (userId && planName) {
      // A. Mettre à jour la Transaction
      await prisma.transaction.update({
        where: { reference: session.id },
        data: { status: "SUCCESS" }
      });

      // B. Mettre à jour l'Utilisateur
      await prisma.user.update({
        where: { id: userId },
        data: { plan: (planName as any) }
      });

      console.log(`✅ [STRIPE WEBHOOK] Succès ! User ${userId} -> Forfait ${planName}`);
    }
  }

  // 3. Toujours répondre 200 OK rapidement
  return NextResponse.json({ received: true }, { status: 200 });
}