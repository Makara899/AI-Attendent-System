// Sound effect & Text-to-Speech service for AI Attendance feedback

class SoundService {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
    this.speechEnabled = true;
    this.isUnlocked = false;

    // Auto-unlock audio and speech on first user interaction (crucial for mobile iOS/Android)
    if (typeof window !== 'undefined') {
      const unlockHandler = () => {
        this.unlockAudio();
        window.removeEventListener('click', unlockHandler);
        window.removeEventListener('touchstart', unlockHandler);
        window.removeEventListener('touchend', unlockHandler);
      };
      window.addEventListener('click', unlockHandler, { passive: true });
      window.addEventListener('touchstart', unlockHandler, { passive: true });
      window.addEventListener('touchend', unlockHandler, { passive: true });
    }
  }

  getAudioContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Explicitly unlock audio on mobile when user taps Start Camera or screen
  unlockAudio() {
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }

      // Unlock mobile speech synthesis (iOS Safari / Android Chrome requirement)
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        const dummyUtterance = new SpeechSynthesisUtterance('');
        dummyUtterance.volume = 0;
        window.speechSynthesis.speak(dummyUtterance);
      }
      this.isUnlocked = true;
    } catch (e) {
      console.warn('Audio unlock warning:', e);
    }
  }

  // Pleasant success chime using Web Audio API oscillator
  playSuccessChime() {
    if (!this.enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // High pleasant two-tone chime (E5 -> G#5 -> B5)
      const notes = [659.25, 830.61, 987.77];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.3, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.4);
      });
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  }

  // Duplicate warning sound (gentle double tone)
  playWarningSound() {
    if (!this.enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const notes = [440, 370];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);

        gain.gain.setValueAtTime(0.2, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.25);
      });
    } catch (e) {
      console.warn('Audio warning error:', e);
    }
  }

  // Convert Khmer Unicode text to readable Latin phonetics if no English name provided
  transliterateKhmer(khmerText) {
    if (!khmerText) return '';
    const consonantMap = {
      'ក': 'K', 'ខ': 'Kh', 'គ': 'K', 'ឃ': 'Kh', 'ង': 'Ng',
      'ច': 'Ch', 'ឆ': 'Ch', 'ជ': 'Ch', 'ឈ': 'Ch', 'ញ': 'Nh',
      'ដ': 'D', 'ឋ': 'Th', 'ឌ': 'D', 'ឍ': 'Th', 'ណ': 'N',
      'ត': 'T', 'ថ': 'Th', 'ទ': 'T', 'ធ': 'Th', 'ន': 'N',
      'ប': 'B', 'ផ': 'Ph', 'ព': 'P', 'ភ': 'Ph', 'ម': 'M',
      'យ': 'Y', 'រ': 'R', 'ល': 'L', 'វ': 'V',
      'ស': 'S', 'ហ': 'H', 'ឡ': 'L', 'អ': 'A'
    };
    const vowelMap = {
      'ា': 'a', 'ិ': 'i', 'ី': 'ey', 'ឹ': 'eu', 'ឺ': 'eu',
      'ុ': 'u', 'ូ': 'ou', 'ួ': 'uo', 'ើ': 'er', 'ឿ': 'ue',
      'ៀ': 'ie', 'េ': 'e', 'ែ': 'ae', 'ៃ': 'ai', 'ោ': 'ao',
      'ៅ': 'au', 'ំ': 'om', 'ះ': 'ah', 'ៈ': 'ak', '៉': '', '៊': '', '់': '', '៌': '', '៍': '', '៏': '', '័': 'a', '្': ''
    };

    let result = '';
    for (let i = 0; i < khmerText.length; i++) {
      const char = khmerText[i];
      if (char === ' ') {
        result += ' ';
      } else if (consonantMap[char]) {
        result += (result.length === 0 || result.slice(-1) === ' ' ? consonantMap[char] : consonantMap[char].toLowerCase());
      } else if (vowelMap[char]) {
        result += vowelMap[char];
      } else if (/[a-zA-Z0-9]/.test(char)) {
        result += char;
      }
    }
    return result.trim();
  }

  // Speak student name upon check-in with high clarity
  speakName(rawName, preferredLang = 'en-US') {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Stop prior speech
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      if (!rawName) return;

      const voices = window.speechSynthesis.getVoices() || [];
      const khmerVoice = voices.find(v => v.lang.startsWith('km') || v.lang.includes('Khmer'));

      // Check if rawName contains Latin letters (e.g. "Chan Dara (ចាន់ ដារ៉ា)" or "ចាន់ ដារ៉ា (Chan Dara)")
      const latinSegments = (rawName.match(/[a-zA-Z\s]{2,}/g) || [])
        .map(s => s.trim())
        .filter(s => s.length >= 2);

      let spokenText = '';
      let selectedVoice = null;
      let targetLang = 'en-US';

      if (latinSegments.length > 0) {
        // Sort by length to pick the most complete English name
        const bestLatinName = latinSegments.sort((a, b) => b.length - a.length)[0];
        spokenText = `Welcome, ${bestLatinName}`;
      } else if (khmerVoice) {
        // Use native Khmer voice if installed on system
        spokenText = `សូមស្វាគមន៍ ${rawName}`;
        selectedVoice = khmerVoice;
        targetLang = khmerVoice.lang;
      } else {
        // Transliterate Khmer name to natural Latin phonetics so English voice speaks it smoothly
        const phoneticName = this.transliterateKhmer(rawName);
        spokenText = phoneticName ? `Welcome, ${phoneticName}` : 'Welcome, Attendance Recorded';
      }

      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.rate = 0.90;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = targetLang;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      } else if (voices.length > 0) {
        // Natural English voice
        const preferredVoice = voices.find(v => 
          v.lang.startsWith('en') && 
          (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.name.includes('Guy'))
        ) || voices.find(v => v.lang.startsWith('en'));

        if (preferredVoice) utterance.voice = preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS Error:', e);
    }
  }
}

export const soundService = new SoundService();
