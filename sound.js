// ============================================================
// sound.js — Web Audio API singing bowl synthesizer
// No external files, no licensing issues, works offline
// ============================================================

const BOWL_DURATION_SECS = 60;
const BOWL_FREQ_HZ       = 296; // D4 — warm Tibetan bowl tone

// Runs a 60-second sound bowl countdown.
// onComplete() is called when the countdown reaches zero.
function runSoundBowl({ onComplete, volume = 0.7 }) {
  _playBowlAudio(volume);

  let secs    = BOWL_DURATION_SECS;
  const timerEl = document.getElementById('soundTimer');
  const barEl   = document.getElementById('soundBar');

  if (timerEl) timerEl.textContent = secs;
  if (barEl)   barEl.style.width   = '100%';

  const interval = setInterval(() => {
    secs--;
    if (timerEl) timerEl.textContent = secs;
    if (barEl)   barEl.style.width   = (secs / BOWL_DURATION_SECS * 100) + '%';

    if (secs <= 0) {
      clearInterval(interval);
      onComplete();
    }
  }, 1000);
}

function _playBowlAudio(volume = 0.7) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const vol = Math.max(0.05, Math.min(1, volume));

    // Resume suspended context (Chrome/Safari auto-suspend until user gesture)
    ctx.resume().then(() => _scheduleStrikes(ctx, vol));
  } catch (e) {
    console.warn('Bowl audio unavailable:', e.message);
  }
}

function _scheduleStrikes(ctx, vol) {
  try {
    function strike(freq, startTime, duration, gain) {
      const g = gain * vol;
      const osc  = ctx.createOscillator();
      const gn   = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.998, startTime + duration);
      gn.gain.setValueAtTime(0, startTime);
      gn.gain.linearRampToValueAtTime(g, startTime + 0.015);
      gn.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gn); gn.connect(ctx.destination);
      osc.start(startTime); osc.stop(startTime + duration);

      const osc2 = ctx.createOscillator();
      const gn2  = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2.756, startTime);
      gn2.gain.setValueAtTime(g * 0.12, startTime);
      gn2.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.35);
      osc2.connect(gn2); gn2.connect(ctx.destination);
      osc2.start(startTime); osc2.stop(startTime + duration * 0.35);
    }

    // Small buffer so ctx.currentTime is valid after resume
    const t = ctx.currentTime + 0.1;
    strike(BOWL_FREQ_HZ, t,      18, 0.25);
    strike(BOWL_FREQ_HZ, t + 20, 18, 0.20);
    strike(BOWL_FREQ_HZ, t + 40, 18, 0.18);
    strike(BOWL_FREQ_HZ, t + 58, 10, 0.14);

  } catch (e) {
    // Silent fallback — countdown still runs, experience still works
    console.warn('Bowl schedule error:', e.message);
  }
}
