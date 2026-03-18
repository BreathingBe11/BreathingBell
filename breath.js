// ============================================================
// breath.js — sequences, rounds, labels, descriptions
// ============================================================

const SEQUENCES = {
  box:   [
    { p: 'Inhale',  c: 4, s: 'expand' },
    { p: 'Hold',    c: 4, s: 'hold'   },
    { p: 'Exhale',  c: 4, s: 'shrink' },
    { p: 'Hold',    c: 4, s: 'hold'   },
  ],
  '478': [
    { p: 'Inhale',  c: 4, s: 'expand' },
    { p: 'Hold',    c: 7, s: 'hold'   },
    { p: 'Exhale',  c: 8, s: 'shrink' },
  ],
  nidra: [
    { p: 'Breathe in',          c: 4, s: 'expand' },
    { p: 'Soften your jaw',     c: 4, s: 'hold'   },
    { p: 'Drop your shoulders', c: 5, s: 'shrink' },
    { p: 'Unclench your hands', c: 4, s: 'hold'   },
    { p: 'Breathe out slowly',  c: 5, s: 'shrink' },
  ],
  pranayama: [
    { p: 'Inhale left',  c: 4, s: 'expand' },
    { p: 'Hold',         c: 4, s: 'hold'   },
    { p: 'Exhale right', c: 4, s: 'shrink' },
    { p: 'Inhale right', c: 4, s: 'expand' },
    { p: 'Hold',         c: 4, s: 'hold'   },
    { p: 'Exhale left',  c: 4, s: 'shrink' },
  ],
  sound: [
    { p: 'Breathe in',         c: 5, s: 'expand' },
    { p: 'Rest',               c: 5, s: 'hold'   },
    { p: 'Breathe out slowly', c: 6, s: 'shrink' },
    { p: 'Rest',               c: 4, s: 'hold'   },
  ],
};

const SEQUENCES_SENIOR = {
  box:   [
    { p: 'Inhale',  c: 5, s: 'expand' },
    { p: 'Hold',    c: 3, s: 'hold'   },
    { p: 'Exhale',  c: 6, s: 'shrink' },
    { p: 'Rest',    c: 3, s: 'hold'   },
  ],
  '478': [
    { p: 'Inhale',  c: 4, s: 'expand' },
    { p: 'Hold',    c: 4, s: 'hold'   },
    { p: 'Exhale',  c: 6, s: 'shrink' },
  ],
  nidra: [
    { p: 'Breathe in',             c: 5, s: 'expand' },
    { p: 'Soften your face',       c: 5, s: 'hold'   },
    { p: 'Release your shoulders', c: 6, s: 'shrink' },
    { p: 'Let your hands open',    c: 5, s: 'hold'   },
    { p: 'Breathe out slowly',     c: 6, s: 'shrink' },
  ],
  pranayama: [
    { p: 'Inhale left',  c: 5, s: 'expand' },
    { p: 'Hold',         c: 3, s: 'hold'   },
    { p: 'Exhale right', c: 5, s: 'shrink' },
    { p: 'Inhale right', c: 5, s: 'expand' },
    { p: 'Hold',         c: 3, s: 'hold'   },
    { p: 'Exhale left',  c: 5, s: 'shrink' },
  ],
  sound: [
    { p: 'Breathe in',         c: 6, s: 'expand' },
    { p: 'Rest',               c: 6, s: 'hold'   },
    { p: 'Breathe out slowly', c: 7, s: 'shrink' },
    { p: 'Rest',               c: 5, s: 'hold'   },
  ],
};

const TOTAL_ROUNDS = { box: 4, '478': 4, nidra: 3, pranayama: 4, sound: 3 };

const TECH_LABELS = {
  box:       'Box Breathing — 4 rounds',
  '478':     '4-7-8 Breathing — 4 rounds',
  nidra:     'Yoga Nidra Body Scan — 3 rounds',
  pranayama: 'Pranayama (Nadi Shodhana) — 4 rounds',
  sound:     'Sound Healing — 3 rounds',
};

const TECH_DESCS = {
  box:       'Inhale 4 · Hold 4 · Exhale 4 · Hold 4. Proven to regulate the nervous system before high-stakes moments.',
  '478':     'Inhale 4 · Hold 7 · Exhale 8. Activates the vagus nerve for rapid, deep calm.',
  nidra:     "Omi's signature Yoga Nidra body scan. Softens tension from head to toe in minutes.",
  pranayama: 'Alternate nostril breathing. Balances the left and right brain hemispheres for clarity and calm.',
  sound:     'Breathe with the bowl. Let the sound do the work — your only job is to follow your breath.',
};

const TECH_FULL = {
  box:       'Box Breathing (4-4-4-4)',
  '478':     '4-7-8 Breathing',
  nidra:     'Yoga Nidra Body Scan',
  pranayama: 'Pranayama — Nadi Shodhana (Alternate Nostril)',
  sound:     'Sound Healing (Breath & Bowl)',
};

const STRESS_LABELS = {
  regulated: 'regulated and calm',
  mild:      'mildly stressed and needing a reset',
  high:      'overwhelmed and running on fumes',
  crisis:    'on the edge — everything feels like too much',
};

// Runs the breath timer. Calls onComplete() when all rounds finish.
function runBreathTimer({ tech, senior, rounds = 1, onComplete }) {
  const seq       = senior ? SEQUENCES_SENIOR[tech] : SEQUENCES[tech];
  const totalRnds = TOTAL_ROUNDS[tech] * rounds;   // Fix 1: multiply by user-selected rounds

  const circle   = document.getElementById('breathCircle');
  const phaseEl  = document.getElementById('breathPhase');
  const countEl  = document.getElementById('breathCount');
  const progEl   = document.getElementById('breathProgress');
  const ring     = document.getElementById('breathRing');

  ring.classList.add('pulse');
  let round = 0, stepIdx = 0, cd = 0;

  function applyStep(step) {
    circle.className    = 'breath-circle ' + step.s;
    phaseEl.textContent = step.p;
    cd = step.c;
    countEl.textContent = cd;
    progEl.textContent  = 'Round ' + (round + 1) + ' of ' + totalRnds;
  }

  applyStep(seq[0]);

  const timer = setInterval(() => {
    cd--;
    if (cd > 0) { countEl.textContent = cd; return; }

    stepIdx++;
    if (stepIdx >= seq.length) { stepIdx = 0; round++; }

    if (round >= totalRnds) {
      clearInterval(timer);
      ring.classList.remove('pulse');
      circle.className    = 'breath-circle';
      phaseEl.textContent = '✦';
      countEl.textContent = '';
      progEl.textContent  = 'Complete';
      setTimeout(onComplete, 800);
      return;
    }

    applyStep(seq[stepIdx]);
  }, 1000);
}
