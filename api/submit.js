const GMAIL_SEND_URL = 'https://gateway.maton.ai/google-mail/gmail/v1/users/me/messages/send';
const TO_EMAIL = 'jasoncfblaze@me.com';
const FROM_EMAIL = 'jason@crossfitblaze.com';

function escapeText(value) {
  return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

function generateSeed(payload) {
  const submittedAt = escapeText(payload.submittedAt || new Date().toISOString());
  const questionMap = new Map((payload.questions || []).map(q => [q.id, q.title]));
  const answers = payload.answers || {};
  const orderedIds = (payload.questions || []).map(q => q.id).filter(id => Object.prototype.hasOwnProperty.call(answers, id));

  const lines = [
    '# AutoNovel Seed Submission',
    '',
    `Submitted: ${submittedAt}`,
    '',
    '## Story Seed',
    '',
  ];

  for (const id of orderedIds) {
    const title = escapeText(questionMap.get(id) || id.replace(/_/g, ' '));
    const answer = escapeText(answers[id]).trim();
    lines.push(`### ${title}`);
    lines.push(answer || '(blank)');
    lines.push('');
  }

  lines.push('## AutoNovel Field Summary');
  lines.push('');
  lines.push(`Story spark: ${escapeText(answers.story_spark || '')}`);
  lines.push(`Main character: ${escapeText(answers.main_character || '')}`);
  lines.push(`World / setting: ${escapeText(answers.world_setting || '')}`);
  lines.push(`Conflict: ${escapeText(answers.central_conflict || '')}`);
  lines.push(`Stakes: ${escapeText(answers.stakes || '')}`);
  lines.push(`Tone: ${escapeText(answers.tone || '')}`);
  lines.push(`Genre / style: ${escapeText(answers.genre_style || '')}`);
  lines.push(`Comfort boundaries: ${escapeText(answers.comfort_boundaries || '')}`);
  lines.push(`Must include: ${escapeText(answers.must_include || '')}`);
  lines.push(`Ending preference: ${escapeText(answers.ending_preference || '')}`);
  lines.push(`Reading level: ${escapeText(answers.reading_level || '')}`);
  lines.push(`Extra notes: ${escapeText(answers.extra_notes || '')}`);
  lines.push('');

  return lines.join('\n');
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') return 'Missing payload.';
  if (payload.website) return 'OK_SPAM_HONEYPOT';
  if (!payload.answers || typeof payload.answers !== 'object') return 'Missing answers.';
  if (!Array.isArray(payload.questions) || payload.questions.length < 1) return 'Missing questions.';
  for (const q of payload.questions) {
    const answer = String(payload.answers[q.id] || '').trim();
    if (!answer) return `Missing answer for ${q.id}.`;
    if (answer.length > 3000) return `Answer too long for ${q.id}.`;
  }
  return null;
}

function makeMime(seedText) {
  const subject = `AutoNovel Seed Submission - ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}`;
  const body = [
    'A new AutoNovel questionnaire was submitted.',
    '',
    'The generated seed is below.',
    '',
    seedText
  ].join('\n');

  return [
    `From: ${FROM_EMAIL}`,
    `To: ${TO_EMAIL}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    body
  ].join('\r\n');
}

async function sendEmail(seedText) {
  const apiKey = process.env.MATON_API_KEY;
  if (!apiKey) throw new Error('MATON_API_KEY is not configured');

  const raw = Buffer.from(makeMime(seedText), 'utf8').toString('base64url');
  const response = await fetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Maton Gmail send failed: ${response.status} ${text}`);
  }
  return response.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body || {};
    const validationError = validatePayload(payload);
    if (validationError === 'OK_SPAM_HONEYPOT') return res.status(200).json({ ok: true });
    if (validationError) return res.status(400).json({ error: validationError });

    const seed = generateSeed(payload);
    await sendEmail(seed);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Submission failed' });
  }
}

export { generateSeed, validatePayload, makeMime };
