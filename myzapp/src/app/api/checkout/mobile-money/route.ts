import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    // 1. On récupère les infos envoyées par le frontend
    const body = await req.json();
    const { phoneNumber, amount, planName, userId } = body;

    if (!phoneNumber || !amount || !planName || !userId) {
      return NextResponse.json({ error: "Informations manquantes" }, { status: 400 });
    }

    // 2. Définir l'URL de l'API Campay (Dev ou Prod)
    const baseURL = process.env.CAMPAY_ENVIRONMENT === "PROD" 
      ? "https://www.campay.net/api" 
      : "https://demo.campay.net/api";

    // 3. Obtenir le Token d'accès Campay
    const tokenResponse = await fetch(`${baseURL}/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: process.env.CAMPAY_USERNAME,
        password: process.env.CAMPAY_PASSWORD,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      throw new Error("Impossible de s'authentifier chez Campay");
    }

    // 4. Générer une référence unique pour cette transaction
    const reference = `MYZAPP_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // 5. Enregistrer la transaction "PENDING" (En attente) dans notre base de données
    await prisma.transaction.create({
      data: {
        userId: userId,
        amount: parseFloat(amount),
        currency: "XAF",
        provider: "CAMPAY",
        status: "PENDING",
        reference: reference,
        planPurchased: planName,
      }
    });

    // 6. Lancer la demande de paiement (Push USSD) sur le téléphone du client
    const collectResponse = await fetch(`${baseURL}/collect/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${tokenData.token}`
      },
      body: JSON.stringify({
        amount: amount.toString(),
        currency: "XAF",
        from: phoneNumber, // Le numéro Mobile Money (ex: 2376XXXXXXXX)
        description: `Abonnement MyZapp - Forfait ${planName}`,
        external_reference: reference // Très important pour que Campay nous reconnaisse plus tard
      }),
    });

    const collectData = await collectResponse.json();

    if (!collectResponse.ok) {
      throw new Error(collectData.message || "Échec de l'initiation du paiement");
    }

    // 7. Succès ! Le pop-up est sur le téléphone du client
    return NextResponse.json({ 
      success: true, 
      message: "Veuillez valider le paiement sur votre téléphone.",
      campayReference: reference 
    });

  } catch (error: any) {
    console.error("❌ ERREUR CAMPAY :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}