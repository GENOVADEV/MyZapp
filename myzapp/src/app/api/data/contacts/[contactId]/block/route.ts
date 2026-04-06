import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
// BINGO ! Tu importes directement tes fonctions
import { updateBlockStatus, getUserSessions } from '@/lib/server-ws'; 

export async function PATCH(req: Request, { params }: { params: { contactId: string } }) {
  try {
    const user = await getUserFromToken();
    const { contactId } = params;

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    const newBlockStatus = !contact?.isBlocked;
    const action = newBlockStatus ? 'block' : 'unblock';

    // 1. Tu récupères l'ID de session directement en mémoire !
    const sessions = getUserSessions((user as any)?.userId);
    const sessionId = sessions[0];


    if (sessionId) {
        // 2. Tu appelles la fonction Baileys directement !
        await updateBlockStatus((sessionId as any), (contact as any)?.phone, action);
    } else {
        return NextResponse.json({ error: "WhatsApp n'est pas connecté." }, { status: 400 });
    }

    // 3. Tu mets à jour ta base de données
    const updatedContact = await prisma.contact.update({
      where: { id: contactId },
      data: { isBlocked: newBlockStatus },
    });

    return NextResponse.json(updatedContact);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}