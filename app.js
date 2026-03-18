// ============================================================
// app.js — state management and screen orchestration
// No localStorage (PHI risk), no god file, no duplicates
// ============================================================

'use strict';

// ── App State (single source of truth)
const STATE = {
  name:      '',
  age:       '',
  stress:    '',
  tech:      '',
  pillar:    '',
  duration:  7,
  rounds:    1,
  volume:    0.7,
  prescText: null,
  soundDone: false,
  offline:   false,
};

// Duration config — 20 and 30 min are locked (require Omi's audio files)
const DURATION_OPTIONS = [
  { value: 7,  label: '7 min',  locked: false },
  { value: 10, label: '10 min', locked: false },
  { value: 20, label: '20 min', locked: true  },
  { value: 30, label: '30 min', locked: true  },
];

// ── Screen Management
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Setup Setters
function setAge(val, el) {
  STATE.age = val;
  document.querySelectorAll('#ageChips .chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('ageWarning').style.display =
    (val === '50s' || val === '60+') ? 'block' : 'none';
  checkReady();
}

function setStress(val, el) {
  STATE.stress = val;
  document.querySelectorAll('.stress-chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  checkReady();
}

function setTech(val, el) {
  STATE.tech = val;
  document.querySelectorAll('#techChips .chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('techDesc').textContent = TECH_DESCS[val];
  const warn = document.getElementById('techWarning');
  const isSenior = STATE.age === '50s' || STATE.age === '60+';
  warn.style.display = (isSenior && val === '478') ? 'block' : 'none';
  if (isSenior && val === '478') {
    warn.textContent = 'Note: The hold has been shortened for safety. Stop if you feel dizzy.';
  }
  checkReady();
}

function setRounds(val, el) {
  STATE.rounds = parseInt(val, 10);
  document.querySelectorAll('#roundChips .chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

function setVolume(val) {
  STATE.volume = parseFloat(val);
  const label = document.getElementById('volLabel');
  if (label) label.textContent = Math.round(STATE.volume * 100) + '%';
}

function setPillar(val, el) {
  STATE.pillar = val;
  document.querySelectorAll('#pillarChips .chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  checkReady();
}

function setDuration(val, el) {
  if (el.classList.contains('locked')) return; // locked durations non-interactive
  STATE.duration = parseInt(val, 10);
  document.querySelectorAll('#durationChips .chip:not(.locked)').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

function checkReady() {
  STATE.name = (document.getElementById('inputName').value || '').trim();
  document.getElementById('btnStart').disabled =
    !(STATE.name && STATE.age && STATE.stress && STATE.tech && STATE.pillar);
}

// ── Session Flow
function startSession() {
  showScreen('screen-breath');
  document.getElementById('breathTechName').textContent = TECH_LABELS[STATE.tech];
  const senior = STATE.age === '50s' || STATE.age === '60+';
  runBreathTimer({ tech: STATE.tech, senior, rounds: STATE.rounds, onComplete: startSoundBowl });
}

function startSoundBowl() {
  showScreen('screen-sound');
  _fetchAndStore();
  runSoundBowl({
    volume: STATE.volume,
    onComplete() {
      STATE.soundDone = true;
      if (STATE.prescText !== null) {
        _renderPrescription();
      } else {
        showScreen('screen-loading');
      }
    },
  });
}

async function _fetchAndStore() {
  if (!navigator.onLine) {
    STATE.offline   = true;
    STATE.prescText = fallbackPrescription(STATE.name, STATE.tech);
    if (STATE.soundDone) _renderPrescription();
    return;
  }

  const msgTimer = startLoadingMessages();
  try {
    const text = await fetchPrescription({
      name: STATE.name, age: STATE.age, stress: STATE.stress, tech: STATE.tech,
      pillar: STATE.pillar, duration: STATE.duration,
    });
    STATE.prescText = text;
    STATE.offline   = false;
  } catch (err) {
    console.error('Claude API error:', err.message);
    STATE.offline   = true;
    STATE.prescText = fallbackPrescription(STATE.name, STATE.tech);
  } finally {
    clearInterval(msgTimer);
    if (STATE.soundDone) _renderPrescription();
  }
}

function _renderPrescription() {
  document.getElementById('prescLabel').textContent = 'Your Rest Prescription \u00b7 ' + STATE.name;
  document.getElementById('prescBody').textContent  = STATE.prescText;
  const notice = document.getElementById('offlineNotice');
  if (notice) notice.style.display = STATE.offline ? 'block' : 'none';
  showScreen('screen-done');
}

// ── Done Screen Actions
function downloadPrescription() {
  const date    = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const content = [
    CONFIG.initiativeName,
    'Rest Prescription for ' + STATE.name,
    date,
    '',
    STATE.prescText || '',
    '',
    '\u2014 ' + CONFIG.facilitatorName,
    CONFIG.facilitatorSite,
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'rest-prescription-' + STATE.name.toLowerCase().replace(/\s+/g, '-') + '.txt';
  a.click();
  URL.revokeObjectURL(url);
}

function copyPrescription() {
  const btn = document.getElementById('btnCopy');
  navigator.clipboard.writeText(STATE.prescText || '').then(() => {
    btn.textContent = '\u2713 Copied';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '\ud83d\udccb Copy';
      btn.classList.remove('copied');
    }, 2500);
  }).catch(err => console.error('Copy failed:', err.message));
}

function sharePrescription() {
  if (navigator.share) {
    navigator.share({
      title: CONFIG.initiativeName + ' \u2014 Rest Prescription',
      text:  STATE.prescText || '',
      url:   window.location.href,
    }).catch(err => console.warn('Share cancelled:', err.message));
  } else {
    copyPrescription();
  }
}

// Smart reset — keep name + age, reset only stress + tech
function resetApp() {
  STATE.stress    = '';
  STATE.tech      = '';
  STATE.pillar    = '';
  STATE.duration  = 7;
  STATE.rounds    = 1;
  STATE.prescText = null;
  STATE.soundDone = false;
  STATE.offline   = false;

  document.querySelectorAll('.stress-chip').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('#techChips .chip').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('#pillarChips .chip').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('#durationChips .chip:not(.locked)').forEach((c, i) => {
    c.classList.toggle('selected', i === 0);
  });
  document.querySelectorAll('#roundChips .chip').forEach((c, i) => {
    c.classList.toggle('selected', i === 0);
  });

  const techDesc = document.getElementById('techDesc');
  if (techDesc) techDesc.textContent = 'Select a technique above';
  const techWarn = document.getElementById('techWarning');
  if (techWarn) techWarn.style.display = 'none';

  const btn = document.getElementById('btnStart');
  if (btn) btn.disabled = true;

  showScreen('screen-setup');
}

// ── Bootstrap brand on load
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('hInitiative').textContent = CONFIG.initiativeName;
  document.getElementById('hName').innerHTML =
    CONFIG.heroHeadline + ' <em>' + CONFIG.heroSubline + '</em>';
  document.getElementById('hSub').textContent     = CONFIG.tagline;
  document.getElementById('scienceBox').innerHTML =
    '<strong>The science:</strong> ' + CONFIG.scienceStat + ' ' + CONFIG.scienceSource;
  document.getElementById('footerLink').textContent =
    CONFIG.facilitatorSite.replace('https://', '');
  document.getElementById('footerLink').href = CONFIG.facilitatorSite;

  document.getElementById('communityCard').innerHTML =
    '<div class="c-title">Join the community</div>' +
    '<div class="c-sub">' + CONFIG.communityLabel + '<br>' + CONFIG.communitySubtext + '</div>' +
    '<a class="c-action" href="sms:' + CONFIG.communityPhone +
    '?body=' + CONFIG.communityKeyword + '" target="_blank">' +
    'Text ' + CONFIG.communityKeyword + ' to join \u2192</a>';
});
