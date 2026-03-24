import fs from 'fs';
import path from 'path';

/**
 * Supprime le dossier auth_info_baileys et tout son contenu
 * @returns {boolean} true si la suppression a réussi, false sinon
 */
export function deleteAuthFolder(): boolean {
  const authFolder = path.join(process.cwd(), "auth_info_baileys");
  
  // Vérifier si le dossier existe
  if (!fs.existsSync(authFolder)) {
    console.log("Le dossier auth_info_baileys n'existe pas");
    return true;
  }

  try {
    // Suppression récursive du dossier et de son contenu
    fs.rmdirSync(authFolder, { 
      recursive: true,
    });
    console.log("Dossier auth_info_baileys supprimé avec succès");
    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression du dossier auth_info_baileys:", error);
    return false;
  }
}
