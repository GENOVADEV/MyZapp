import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export async function GET(
  req: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const resolvedParams = await params;
    const reference = resolvedParams.reference;

    console.log("🔍 [POLLING] Vérification de la transaction :", reference);

    const transaction = await prisma.transaction.findUnique({
      where: { reference: reference },
      select: { status: true }
    });

    if (!transaction) {
      console.log("⚠️ [POLLING] Transaction introuvable !");
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    return NextResponse.json({ status: transaction.status }, { status: 200 });
  } catch (error) {
    console.error("❌ [POLLING] Erreur lors de la vérification de la transaction :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}