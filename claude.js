// ============================================================
// claude.js — Anthropic API call for personalized prescription
// ============================================================

const CLAUDE_MODEL      = 'claude-sonnet-4-20250514';
const CLAUDE_MAX_TOKENS = 1000;
const API_ENDPOINT      = 'https://api.anthropic.com/v1/messages';

const LOADING_MESSAGES = [
  'Writing your prescription…',
  'Reading your session…',
  'Almost ready…',
  'Preparing your rest plan…',
];

// Builds the prompt sent to Claude
function buildPrompt({ name, age, stress, tech, pillar, duration }) {
  const techContext = {
    box:       'Box Breathing (4-4-4-4) — a structured, rhythmic technique that regulates the nervous system through equal inhale, hold, exhale, hold counts.',
    '478':     '4-7-8 Breathing — a vagus nerve activation technique with a long exhale that rapidly shifts the body out of fight-or-flight.',
    nidra:     'Yoga Nidra body scan — a guided awareness practice that moves attention through the body systematically, releasing held tension and inducing deep rest.',
    pranayama: 'Nadi Shodhana (alternate nostril breathing) — balances left and right brain hemispheres, clears mental fog, and creates a bridge between action and rest.',
    sound:     'Sound Healing with singing bowl — the person breathed with the bowl sound, using resonance and vibration to regulate the nervous system without effortful technique.',
  };

  const pillarContext = {
    body:      'Their focus is the Body pillar — physical wellbeing, somatic awareness, and treating their body as the foundation of everything else they build.',
    business:  'Their focus is the Business pillar — performance, leadership capacity, and using rest as a strategic tool to sustain high output.',
    belonging: 'Their focus is the Belonging pillar — community, connection, and the rest that comes from feeling whole rather than constantly producing.',
  };

  const ageContext = {
    '20s': 'in their 20s',
    '30s': 'in their 30s',
    '40s': 'in their 40s',
    '50s': 'in their 50s — use language that honors their experience and wisdom',
    '60+': '60 or older — acknowledge their body\'s wisdom and keep next steps gentle',
  };

  const pillarLine = pillar ? `\nPillar focus: ${pillarContext[pillar] || pillar}` : '';
  const durationLine = duration ? `\nSession duration selected: ${duration} minutes` : '';

  return `You are the AI companion for ${CONFIG.facilitatorName}'s "${CONFIG.initiativeName}" program. ${CONFIG.facilitatorName} is a certified Breathwork facilitator, sound healer, CEO of Black Girl Ventures, and wellness advocate whose core teaching is: rest is not a luxury — it's a performance strategy.

A person just completed a breathwork session followed by 60 seconds of singing bowl sound healing. Write them a warm, grounded, personal rest prescription in ${CONFIG.facilitatorName}'s voice.

Person's name: ${name}
Age: ${ageContext[age] || age}
Stress level coming in: ${STRESS_LABELS[stress]}
Technique they used: ${TECH_FULL[tech]}
What that technique does: ${techContext[tech]}${pillarLine}${durationLine}

Write a prescription that:
1. Opens by acknowledging exactly where they were when they started (their stress state) — make them feel seen
2. Names the specific technique they used and affirms what it did for their body — be precise, not generic
3. If a pillar focus was selected, weave it naturally into the next steps — Body (physical recovery), Business (performance recharge), Belonging (relational presence)
4. Gives 2-3 actionable next steps for the next 20-30 minutes, calibrated to their stress level and age
5. Closes with one powerful sentence in ${CONFIG.facilitatorName}'s voice — the kind that stays with you

IMPORTANT: The prescription must reflect the specific technique they chose. Do not reference Yoga Nidra if they did Box Breathing or 4-7-8. Do not reference breathwork counting if they did Yoga Nidra. Be specific to what they actually did.

Tone: warm but direct. Grounded. Not overly spiritual, not clinical. Like a mentor who knows you and tells the truth. About 180-220 words. No headers, no bullets — flowing prose only.`;
}

// Fallback if API call fails — technique-aware
function fallbackPrescription(name, tech) {
  const techMsg = {
    box:   'The rhythm you just practiced — four counts in, four held, four out, four held — is one of the most researched tools for nervous system regulation on the planet.',
    '478': 'That long exhale you just practiced activated your vagus nerve. Your body chemistry literally shifted.',
    nidra: 'Moving your awareness through your body the way you just did — that\'s not relaxation. That\'s nervous system medicine.',
  };
  return `${name}, what you just did took courage — not the dramatic kind, the quiet kind that most leaders never give themselves permission for.\n\n${techMsg[tech] || techMsg.box}\n\nTake the next 20 minutes away from your screen. Drink water. Don't make a single decision. Let the work of that session settle.\n\nRest is not a reward for finishing. It's the fuel that makes finishing possible.`;
}

// Calls Claude API and returns prescription text
async function fetchPrescription({ name, age, stress, tech, pillar, duration }) {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:      CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      messages:   [{ role: 'user', content: buildPrompt({ name, age, stress, tech, pillar, duration }) }],
    }),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const data = await response.json();
  const text = data.content?.find(b => b.type === 'text')?.text;
  if (!text) throw new Error('No text in response');
  return text;
}

// Manages loading screen messages while API call runs
function startLoadingMessages() {
  let i = 0;
  const el = document.getElementById('loadingText');
  if (el) el.textContent = LOADING_MESSAGES[0];
  return setInterval(() => {
    i = (i + 1) % LOADING_MESSAGES.length;
    if (el) el.textContent = LOADING_MESSAGES[i];
  }, 2200);
}
