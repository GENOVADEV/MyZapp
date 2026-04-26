import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
// 🧠 LE CERVEAU : Traite le paiement peu importe si c'est un GET ou un POST
async function processCampayCallback(status: string | null, external_reference: string | null) {
  if (!external_reference) return;

  const transaction = await prisma.transaction.findUnique({
    where: { reference: external_reference }
  });

  if (!transaction || transaction.status === "SUCCESS") return;

  if (status === "SUCCESSFUL" || status === "SUCCESS") {
    await prisma.transaction.update({
      where: { reference: external_reference },
      data: { status: "SUCCESS" }
    });

    await prisma.user.update({
      where: { id: transaction.userId },
      data: { plan: (transaction.planPurchased as any) }
    });

    console.log(`✅ [CAMPAY] SUCCÈS ! Forfait ${transaction.planPurchased} activé.`);
  } 
  else if (status === "FAILED") {
    await prisma.transaction.update({
      where: { reference: external_reference },
      data: { status: "FAILED" }
    });
    console.log(`❌ [CAMPAY] ÉCHEC du paiement pour : ${external_reference}`);
  }
}

// 📥 Écoute les requêtes POST
export async function POST(req: Request) {
  try {
    const body = await req.json();
    await processCampayCallback(body.status, body.external_reference);
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Erreur POST Webhook Campay:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// 📥 Écoute les requêtes GET (Celle de tes logs !)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const external_reference = url.searchParams.get("external_reference");

    await processCampayCallback(status, external_reference);
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Erreur GET Webhook Campay:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}