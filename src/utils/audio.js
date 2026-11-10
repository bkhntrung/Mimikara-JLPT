// Web Speech API wrapper for Native Japanese TTS with preloaded voices and speed control

let currentUtterance = null;
let jaVoice = null;

function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  jaVoice = voices.find(v => 
    v.lang.startsWith('ja') || 
    v.lang === 'ja_JP' || 
    v.name.includes('Japanese') || 
    v.name.includes('Kyoko') || 
    v.name.includes('Otoya') || 
    v.name.includes('Google 日本語')
  );
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

export function speakJapanese(text, rate = 1.0) {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this browser.');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  if (!text) return;

  // Clean text from any HTML tags, furigana annotations, or symbols
  const cleanText = text.replace(/<rt>[\s\S]*?<\/rt>/gi, '')
                        .replace(/<rp>[\s\S]*?<\/rp>/gi, '')
                        .replace(/<[^>]+>/g, '')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/[―_【】？]/g, '')
                        .trim();

  if (!cleanText) return;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'ja-JP';
  utterance.rate = rate;
  utterance.pitch = 1.0;

  if (!jaVoice) loadVoices();
  if (jaVoice) {
    utterance.voice = jaVoice;
  }

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
