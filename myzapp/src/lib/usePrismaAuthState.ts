// src/lib/usePrismaAuthState.ts
import { AuthenticationState, initAuthCreds } from '@whiskeysockets/baileys';
import { prisma } from '@/lib/prisma';

/**
 * Adaptateur pour stocker les clés d'authentification WhatsApp dans PostgreSQL
 */
export async function usePrismaAuthState(sessionId: string, userId: string) {
    
    /**
     * Écrire une donnée dans la base de données
     */
    const writeData = async (dataId: string, data: any): Promise<void> => {
        try {
            // Convertir les BigInt en String pour JSON
            const stringifiedData = JSON.stringify(data, (_, value) =>
                typeof value === 'bigint' ? value.toString() : value
            );

            await prisma.whatsAppSession.upsert({
                where: {
                    sessionId_dataId: {
                        sessionId,
                        dataId,
                    }
                },
                update: {
                    data: stringifiedData,
                    updatedAt: new Date(),
                },
                create: {
                    sessionId,
                    userId,
                    dataId,
                    data: stringifiedData,
                }
            });

            // Log uniquement pour creds (éviter spam de logs)
            if (dataId === 'creds') {
                console.log(`💾 [${sessionId}] Credentials sauvegardées`);
            }
        } catch (error) {
            console.error(`❌ [${sessionId}] Erreur sauvegarde ${dataId}:`, error);
            throw error;
        }
    };

    /**
     * Lire une donnée depuis la base de données
     */
    const readData = async (dataId: string): Promise<any> => {
        try {
            const record = await prisma.whatsAppSession.findUnique({
                where: {
                    sessionId_dataId: {
                        sessionId,
                        dataId,
                    }
                }
            });

            if (!record) return null;

            return JSON.parse(record.data);
        } catch (error) {
            console.error(`❌ [${sessionId}] Erreur lecture ${dataId}:`, error);
            return null;
        }
    };

    /**
     * Supprimer une donnée de la base de données
     */
    const removeData = async (dataId: string): Promise<void> => {
        try {
            await prisma.whatsAppSession.delete({
                where: {
                    sessionId_dataId: {
                        sessionId,
                        dataId,
                    }
                }
            });
        } catch (error) {
            // Ignorer si la clé n'existe pas (P2025)
            if ((error as any).code !== 'P2025') {
                console.error(`❌ [${sessionId}] Erreur suppression ${dataId}:`, error);
            }
        }
    };

    /**
     * Supprimer toutes les données d'une session
     */
    const removeAllData = async (): Promise<void> => {
        try {
            await prisma.whatsAppSession.deleteMany({
                where: { sessionId }
            });
            console.log(`🗑️ [${sessionId}] Toutes les clés supprimées de la BDD`);
        } catch (error) {
            console.error(`❌ [${sessionId}] Erreur suppression session:`, error);
        }
    };

    // ============================================================================
    // CHARGER OU INITIALISER LES CREDENTIALS
    // ============================================================================
    let creds = await readData('creds');
    if (!creds) {
        console.log(`🆕 [${sessionId}] Initialisation nouvelles credentials`);
        creds = initAuthCreds();
        await writeData('creds', creds);
    } else {
        console.log(`♻️ [${sessionId}] Credentials chargées depuis la BDD`);
    }

    // ============================================================================
    // STATE OBJECT
    // ============================================================================
    const state: AuthenticationState = {
        creds,
        keys: {
            get: async (type: string, ids: string[]) => {
                const data: { [id: string]: any } = {};
                
                for (const id of ids) {
                    const key = `${type}-${id}`;
                    const value = await readData(key);
                    if (value) {
                        data[id] = value;
                    }
                }

                return data;
            },
            set: async (data: any) => {
                const tasks: Promise<void>[] = [];

                for (const category in data) {
                    for (const id in data[category]) {
                        const value = data[category][id];
                        const key = `${category}-${id}`;
                        
                        if (value) {
                            tasks.push(writeData(key, value));
                        } else {
                            tasks.push(removeData(key));
                        }
                    }
                }

                await Promise.all(tasks);
            }
        }
    };

    // ============================================================================
    // FONCTION DE SAUVEGARDE DES CREDENTIALS
    // ============================================================================
    const saveCreds = async () => {
        await writeData('creds', state.creds);
    };

    return {
        state,
        saveCreds,
        removeData,
        removeAllData
    };
}
