/** Shared writing-quiz grading logic (dev API + documented mirror in writing-grade.php). */

export const WRITING_PASS_SCORE_THRESHOLD = 70;

export const WRITING_GRADING_SYSTEM_PROMPT = `You are Luna, a warm and encouraging Japanese tutor grading a free-writing exercise for a beginner student.

Evaluate the student's Japanese text against the task and rubric. The model answer is ONE example — alternate valid wording, synonyms, different word order, or romaji vs kana are acceptable when meaning and grammar are correct.

Respond ONLY with valid JSON (no markdown fences) using this exact shape:
{
  "passed": boolean,
  "score": number,
  "perCriterion": [{ "criterion": string, "met": boolean, "comment": string }],
  "overallComment": string,
  "encouragement": string
}

Rules:
- score is 0–100
- passed=true when essential rubric criteria are satisfied (typically score >= ${WRITING_PASS_SCORE_THRESHOLD}), even if not identical to the model answer
- perCriterion must include one entry per rubric item (same order); criterion text in the response language
- overallComment and encouragement must be warm, constructive, and in the student's UI language — never harsh or humiliating
- empty, gibberish, or clearly off-topic answers: passed=false with gentle guidance to try again`;

const GRADE_MODEL = 'gemini-2.5-flash';

function pickLang(obj, language) {
  if (!obj || typeof obj !== 'object') return '';
  return obj[language] ?? obj.it ?? obj.en ?? '';
}

export function buildWritingGradeUserMessage(body, language) {
  const lang = language === 'en' ? 'en' : 'it';
  const task = pickLang(body.task, lang);
  const rubricLines = (body.rubric ?? [])
    .map((item, index) => `${index + 1}. ${pickLang(item, lang)}`)
    .join('\n');

  const grammarRefs = (body.expectsGrammarRefs ?? []).join(', ') || '(none listed)';
  const vocabRefs = (body.expectsVocabRefs ?? []).join(', ') || '(none listed)';
  const responseLanguage = lang === 'en' ? 'English' : 'Italian';

  return [
    `UI language for comments: ${responseLanguage}`,
    '',
    '## Task',
    task,
    '',
    '## Rubric criteria',
    rubricLines,
    '',
    '## Expected grammar refs (context)',
    grammarRefs,
    '',
    '## Expected vocab refs (context)',
    vocabRefs,
    '',
    '## Model answer (reference only — not the only correct answer)',
    body.modelAnswer ?? '',
    '',
    '## Student answer',
    body.studentAnswer ?? '',
  ].join('\n');
}

function stripJsonFence(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export function parseWritingGradeResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  let parsed;
  try {
    parsed = JSON.parse(stripJsonFence(rawText));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;

  const score = Number(parsed.score);
  if (!Number.isFinite(score)) return null;

  const perCriterion = Array.isArray(parsed.perCriterion)
    ? parsed.perCriterion
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
          criterion: String(item.criterion ?? ''),
          met: Boolean(item.met),
          comment: String(item.comment ?? ''),
        }))
    : [];

  const overallComment = String(parsed.overallComment ?? '');
  const encouragement = String(parsed.encouragement ?? '');
  if (!overallComment && !encouragement) return null;

  const clampedScore = Math.round(Math.max(0, Math.min(100, score)));
  const passed =
    clampedScore >= WRITING_PASS_SCORE_THRESHOLD && Boolean(parsed.passed);

  return {
    passed,
    score: clampedScore,
    perCriterion,
    overallComment,
    encouragement,
  };
}

export async function gradeWritingSubmission(body, { geminiFetch, getApiKey }) {
  const studentAnswer =
    typeof body?.studentAnswer === 'string' ? body.studentAnswer.trim() : '';
  if (!studentAnswer) {
    throw Object.assign(new Error('Missing studentAnswer.'), { status: 400 });
  }
  if (!body?.task || !Array.isArray(body.rubric) || !body.rubric.length) {
    throw Object.assign(new Error('Invalid grading payload.'), { status: 400 });
  }
  if (typeof body.modelAnswer !== 'string' || !body.modelAnswer.trim()) {
    throw Object.assign(new Error('Missing modelAnswer.'), { status: 400 });
  }

  const language = body.language === 'en' ? 'en' : 'it';
  const apiKey = getApiKey();
  const userMessage = buildWritingGradeUserMessage(body, language);

  const payload = {
    system_instruction: {
      parts: [{ text: WRITING_GRADING_SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 900,
      temperature: 0.35,
      responseMimeType: 'application/json',
    },
  };

  const { response, data } = await geminiFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GRADE_MODEL}:generateContent`,
    apiKey,
    payload,
    35000,
  );

  if (!response.ok) {
    const message =
      data?.error?.message ??
      data?.error ??
      'Gemini grading call failed.';
    throw Object.assign(new Error(String(message)), {
      status: 502,
      geminiStatus: response.status,
    });
  }

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const grade = parseWritingGradeResponse(rawText);
  if (!grade) {
    throw Object.assign(new Error('Could not parse grading response.'), { status: 502 });
  }

  return { grade };
}
