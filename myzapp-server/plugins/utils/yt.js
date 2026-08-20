const yts = require("youtube-sr").default;
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');

/**
 * Nettoie les fichiers temporaires intermédiaires (ex: .f140.m4a, .webm) et les fichiers obsolètes
 */
function cleanupTempFiles(currentId = '', preservePath = null) {
  try {
    const files = fs.readdirSync('.');
    const now = Date.now();
    for (const file of files) {
      if (file.startsWith('temp_')) {
        const fullPath = path.resolve(file);
        if (preservePath && path.resolve(preservePath) === fullPath) {
          continue; // Ne pas supprimer le fichier final valide
        }
        // Supprime si c'est un fichier intermédiaire lié à l'ID en cours ou s'il a plus de 10 minutes (abandonné)
        if ((currentId && file.includes(String(currentId))) || (fs.statSync(file).mtimeMs < now - 10 * 60 * 1000)) {
          try { fs.unlinkSync(file); } catch (e) {}
        }
      }
    }
  } catch (e) {
    console.error("Temp cleanup error:", e.message);
  }
}

/**
 * Construit les options pour youtube-dl-exec en y injectant les cookies si configurés
 */
function getDlOptions(baseOptions) {
  const options = {
    noWarnings: true,
    noCheckCertificate: true,
    extractorArgs: 'youtube:player_client=android',
    ...baseOptions
  };
  
  // Utiliser la variable d'environnement ou le fichier existant
  if (process.env.YOUTUBE_COOKIES) {
    // Écrire les cookies depuis l'environnement (Render) vers le fichier
    if (!fs.existsSync('cookies.txt')) {
      try {
        fs.writeFileSync('cookies.txt', process.env.YOUTUBE_COOKIES);
      } catch (e) {
         console.error("Failed to write cookies.txt", e);
      }
    }
    options.cookies = 'cookies.txt';
  } else if (fs.existsSync('cookies.txt')) {
    options.cookies = 'cookies.txt';
  }

  return options;
}

/**
 * Get video info from a YouTube URL
 * @param {string} url 
 * @returns {Promise<Object>}
 */
async function getVideoInfo(url) {
  try {
    const output = await youtubedl(url, getDlOptions({ dumpJson: true }));
    
    return {
      title: output.title,
      duration: output.duration_string || output.duration,
      views: output.view_count,
      channel: { name: output.uploader },
      url: output.webpage_url,
      thumbnail: output.thumbnail,
      formats: [
         { type: "video", quality: "360p", size: "10MB" },
         { type: "audio", quality: "128kbps", size: "3MB" }
      ]
    };
  } catch (error) {
    console.error("Error in getVideoInfo:", error);
    throw new Error("Could not parse video metadata!");
  }
}

/**
 * Search YouTube for a query
 * @param {string} query 
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
async function searchYoutube(query, limit = 10) {
  try {
    const results = await yts.search(query, { limit });
    return results.map(video => ({
      title: video.title,
      duration: video.durationFormatted,
      views: video.views,
      channel: { name: video.channel.name },
      url: video.url,
      thumbnail: video.thumbnail?.url
    }));
  } catch (error) {
    console.error("Error in searchYoutube:", error);
    return [];
  }
}

/**
 * Download Audio from a YouTube URL
 * @param {string} url 
 * @returns {Promise<{path: string, title: string, info: any}>}
 */
async function downloadAudio(url) {
  const info = await getVideoInfo(url);
  const title = info.title;
  const id = Date.now();
  const filePath = `./temp_${id}.mp3`;
  const ffmpegPath = require('ffmpeg-static');
  
  try {
    await youtubedl(url, getDlOptions({
      extractAudio: true,
      audioFormat: 'mp3',
      output: filePath,
      ffmpegLocation: ffmpegPath
    }));
  } catch (err) {
    cleanupTempFiles(id); // En cas d'échec, supprimer tous les morceaux téléchargés
    throw err;
  }

  cleanupTempFiles(id, filePath); // Supprimer les fichiers intermédiaires mais conserver l'mp3 final
  return { path: filePath, title, info };
}

/**
 * Download Video from a YouTube URL
 * @param {string} url 
 * @param {string} quality 
 * @returns {Promise<{path: string, title: string, info: any}>}
 */
async function downloadVideo(url, quality) {
  const info = await getVideoInfo(url);
  const title = info.title;
  const id = Date.now();
  const filePath = `./temp_${id}.mp4`;
  const ffmpegPath = require('ffmpeg-static');

  try {
    await youtubedl(url, getDlOptions({
      format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      output: filePath,
      ffmpegLocation: ffmpegPath
    }));
  } catch (err) {
    cleanupTempFiles(id); // En cas d'échec, supprimer les flux vidéo/audio non fusionnés
    throw err;
  }

  cleanupTempFiles(id, filePath); // Supprimer les fragments intermédiaires mais conserver l'mp4 final
  return { path: filePath, title, info };
}

/**
 * Convert m4a to mp3
 * @param {string} inputPath 
 * @param {Object} metadata 
 * @returns {Promise<string>}
 */
async function convertM4aToMp3(inputPath, metadata) {
  return inputPath; // youtube-dl-exec handles format implicitly
}

module.exports = {
  getVideoInfo,
  searchYoutube,
  downloadAudio,
  downloadVideo,
  convertM4aToMp3
};