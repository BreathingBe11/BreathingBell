// ============================================================
// audio.js — Supabase audio service
// Fetches Omi's voice files from omi-audio bucket.
// Falls back to Web Audio synthesis when files not yet uploaded.
// To add real files: upload to omi-audio bucket following the
// naming convention below, then flip is_placeholder to false
// in the audio_tracks table.
//
// Naming convention:
//   /{technique}/{duration}min/guide.mp3       — full voice guide
//   /{technique}/{duration}min/soundscape.mp3  — background loop
//   /{technique}/{duration}min/interval-Xmin.mp3 — cue at X minutes
//
// Example: /box/7min/guide.mp3
// ============================================================

'use strict';

const SUPABASE_URL    = 'https://pnkufpzvajjdesnizbco.supabase.co';
const SUPABASE_ANON   = null; // Set via environment — never hardcode

// ── Track registry (mirrors audio_tracks table structure)
// When Omi uploads files, update file_path and set is_placeholder: false
const AUDIO_TRACKS = {
  // Format: 'technique:duration' -> track config
  'box:7':       { guide: null, soundscape: null, intervals: [], is_placeholder: true },
  'box:10':      { guide: null, soundscape: null, intervals: [], is_placeholder: true },
  '478:7':       { guide: null, soundscape: null, intervals: [], is_placeholder: true },
  '478:10':      { guide: null, soundscape: null, intervals: [], is_placeholder: true },
  'nidra:7':     { guide: null, soundscape: null, intervals: [], is_placeholder: true },
  'nidra:10':    { guide: null, soundscape: null, intervals: [], is_placeholder: true },
  'pranayama:7': { guide: null, soundscape: null, intervals: [], is_placeholder: true },
  'pranayama:10':{ guide: null, soundscape: null, intervals: [], is_placeholder: true },
  'sound:7':     { guide: null, soundscape: null, intervals: [], is_placeholder: true },
  'sound:10':    { guide: null, soundscape: null, intervals: [], is_placeholder: true },
  // Locked durations — Omi's voice guide required
  'box:20':      { guide: null, soundscape: null, intervals: [], is_placeholder: true, locked: true },
  'box:30':      { guide: null, soundscape: null, intervals: [], is_placeholder: true, locked: true },
  'nidra:20':    { guide: null, soundscape: null, intervals: [], is_placeholder: true, locked: true },
  'nidra:30':    { guide: null, soundscape: null, intervals: [], is_placeholder: true, locked: true },
};

// ── Audio session state
let _activeSource     = null;
let _activeContext    = null;
let _intervalTimers   = [];

// ── Get track for technique + duration
function getTrack(technique, duration) {
  const key = technique + ':' + duration;
  return AUDIO_TRACKS[key] || null;
}

// ── Build Supabase Storage public URL
function buildStorageUrl(filePath) {
  return SUPABASE_URL + '/storage/v1/object/public/omi-audio' + filePath;
}

// ── Load and play an audio file from Supabase Storage
async function playAudioFile(url, loop = false) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    await ctx.resume();
    const response = await fetch(url);
    if (!response.ok) throw new Error('Audio fetch failed: ' + response.status);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer  = await ctx.decodeAudioData(arrayBuffer);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.loop   = loop;
    source.connect(ctx.destination);
    source.start(0);
    _activeSource  = source;
    _activeContext = ctx;
    return { source, ctx };
  } catch (e) {
    console.warn('Audio playback failed:', e.message);
    return null;
  }
}

// ── Stop active audio
function stopAudio() {
  _intervalTimers.forEach(t => clearTimeout(t));
  _intervalTimers = [];
  try {
    if (_activeSource) { _activeSource.stop(); _activeSource = null; }
    if (_activeContext) { _activeContext.close(); _activeContext = null; }
  } catch (_) { /* already stopped */ }
}

// ── Schedule interval cues (Omi's voice check-ins)
function scheduleIntervals(intervals) {
  _intervalTimers.forEach(t => clearTimeout(t));
  _intervalTimers = intervals.map(({ url, at_seconds }) =>
    setTimeout(() => playAudioFile(url, false), at_seconds * 1000)
  );
}

// ── Main entry: start session audio
// Falls back to Web Audio synth when placeholder = true
async function startSessionAudio({ technique, duration, volume = 0.7, onGuideEnd }) {
  const track = getTrack(technique, duration);

  if (!track || track.is_placeholder) {
    // Placeholder: synthesized bowl only (existing behavior)
    _playBowlAudio(volume);
    return { mode: 'synthesized' };
  }

  // Real audio: play soundscape loop + schedule intervals
  const soundscapeUrl = track.soundscape ? buildStorageUrl(track.soundscape) : null;
  const guideUrl      = track.guide      ? buildStorageUrl(track.guide)      : null;
  const intervalUrls  = (track.intervals || []).map(i => ({
    url:        buildStorageUrl(i.file_path),
    at_seconds: i.at_seconds,
  }));

  if (soundscapeUrl) {
    await playAudioFile(soundscapeUrl, true); // loop soundscape
  }

  if (intervalUrls.length) {
    scheduleIntervals(intervalUrls);
  }

  // Guide plays for Nidra always; for others only at 20/30min
  if (guideUrl && (technique === 'nidra' || duration >= 20)) {
    const result = await playAudioFile(guideUrl, false);
    if (result && onGuideEnd) {
      result.source.addEventListener('ended', onGuideEnd);
    }
  }

  return { mode: 'real_audio' };
}
