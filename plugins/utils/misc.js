/**
 * Utility functions for the bot
 */

function parseUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

function isNumeric(num) {
  return !isNaN(num) && !isNaN(parseFloat(num));
}

function isAdmin(participants, jid) {
  const admin = participants.find((p) => p.id === jid);
  return admin ? admin.admin === 'admin' || admin.admin === 'superadmin' : false;
}

function mentionjid(jid) {
  return jid.replace('@s.whatsapp.net', '');
}

async function getJson(url, options = {}) {
  const axios = require('axios');
  try {
    const res = await axios.get(url, options);
    return res.data;
  } catch (error) {
    throw error;
  }
}

function bytesToSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function isFake(jid) {
  return false;
}

async function processOnwa(data) {
  return data;
}

async function findMusic(buffer) {
  return { title: "Unknown", artists: "Unknown" };
}

async function searchYT(query) {
  const yts = require("youtube-sr").default;
  return await yts.search(query, { limit: 5 });
}

async function downloadGram(url) {
  return { url: null, type: "error" };
}

async function pinterestDl(url) {
  return [];
}

async function fb(url) {
  return { sd: null, hd: null };
}

async function igStalk(username) {
  return { username, followers: 0, following: 0 };
}

async function tiktok(url) {
  return { video: null, audio: null };
}

async function story(url) {
  return [];
}

async function getThumb(url) {
  try {
    const axios = require('axios');
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(res.data, 'utf-8');
  } catch (e) {
    return Buffer.from([]);
  }
}

async function gtts(text, lang = 'en') {
  try {
    const googleTTS = require('google-tts-api');
    const url = googleTTS.getAudioUrl(text, { lang, slow: false, host: 'https://translate.google.com' });
    const axios = require('axios');
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(res.data, 'utf-8');
  } catch (e) {
    return Buffer.from([]);
  }
}

async function getBuffer(url, options = {}) {
  const axios = require('axios');
  try {
    const res = await axios({
      method: 'get',
      url,
      headers: {
        'DNT': 1,
        'Upgrade-Insecure-Request': 1
      },
      ...options,
      responseType: 'arraybuffer'
    });
    return res.data;
  } catch (error) {
    throw error;
  }
}

async function lyrics(query) {
  return "Lyrics not found.";
}

async function pinterestSearch(query) {
  return [];
}

async function spotifyTrack(url) {
  try {
    const axios = require('axios');
    const cheerio = require('cheerio');
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);
    const title = $('meta[property="og:title"]').attr('content') || "Unknown Title";
    const description = $('meta[property="og:description"]').attr('content') || "Unknown Artist";
    const artist = description.split('·')[0].trim() || "Unknown Artist";
    const cover = $('meta[property="og:image"]').attr('content');
    return { title, artist, cover, url };
  } catch (err) {
    return { title: "Spotify Track", artist: "Unknown", cover: "", url };
  }
}

async function callGenerativeAI(prompt) {
  return "Generative AI response not available.";
}

module.exports = {
  parseUptime,
  isNumeric,
  isAdmin,
  mentionjid,
  getJson,
  bytesToSize,
  isFake,
  processOnwa,
  findMusic,
  searchYT,
  downloadGram,
  pinterestDl,
  fb,
  igStalk,
  tiktok,
  story,
  getThumb,
  gtts,
  getBuffer,
  lyrics,
  pinterestSearch,
  spotifyTrack,
  callGenerativeAI
};