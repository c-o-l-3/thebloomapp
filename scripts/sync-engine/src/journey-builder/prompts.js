export function buildJourneyPromptPack(params) {
  const { brandProfile, venueFacts, journeys } = params;

  const header = [
    'You are creating customer journeys for a wedding venue in TheBloomApp.',
    '',
    'Non-negotiable rules:',
    '- Optimize for the next milestone, not maximum information.',
    '- Keep detailed pricing after the tour; staff frames options post-tour.',
    '- Each touchpoint has one primary CTA.',
    '- Provide Email and SMS variants; each must stand alone if the other is opted out.',
    '- Use only the facts provided. If something is unknown, omit it.',
    '',
    'Inputs:',
    `Brand Profile JSON:\n${JSON.stringify(brandProfile, null, 2)}`,
    '',
    `Venue Facts JSON:\n${JSON.stringify(venueFacts, null, 2)}`,
    '',
    `Journey Structure JSON:\n${JSON.stringify(journeys, null, 2)}`,
    '',
    'Task:',
    '1) For each journey, write copy for every touchpoint (Email + SMS) following the structure and info-gating.',
    '2) Email output must include: subject, previewText, and contentBlocks populated with on-brand language.',
    '3) SMS output must be <= 320 characters and include the CTA link token where specified.',
    '4) Do not invent pricing, capacities, or policies. If missing, ask a question at the end.',
    '',
    'Output format:',
    '- Return valid JSON only.',
    '- Schema:',
    '  { "journeys": [{ "key": "...", "touchpoints": [{ "key": "...", "email": {...}, "sms": {...} }] }], "questions": ["..."] }'
  ].join('\n');

  return header;
}

