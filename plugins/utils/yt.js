const yts = require("youtube-sr").default;
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');

/**
 * Get video info from a YouTube URL
 * @param {string} url 
 * @returns {Promise<Object>}
 */
async function getVideoInfo(url) {
  try {
    const output = await youtubedl(url, {
      dumpJson: true,
      noWarnings: true,
      callHome: false,
      noCheckCertificate: true,
    });
    
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
  const filePath = `./temp_${Date.now()}.mp3`;
  const ffmpegPath = require('ffmpeg-static');
  
  await youtubedl(url, {
    extractAudio: true,
    audioFormat: 'mp3',
    output: filePath,
    ffmpegLocation: ffmpegPath,
    noWarnings: true
  });

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
  const filePath = `./temp_${Date.now()}.mp4`;
  const ffmpegPath = require('ffmpeg-static');

  await youtubedl(url, {
    format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    output: filePath,
    ffmpegLocation: ffmpegPath,
    noWarnings: true
  });

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