<?php
/**
 * Luna Nihongo - Secure Gemini proxy for writing-quiz grading.
 * API key stays server-side via luna_get_gemini_api_key().
 */

require_once __DIR__ . '/bootstrap.php';

luna_send_cors_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

const WRITING_PASS_SCORE_THRESHOLD = 70;

const WRITING_GRADING_SYSTEM_PROMPT = <<<'PROMPT'
You are Luna, a warm and encouraging Japanese tutor grading a free-writing exercise for a beginner student.

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
- passed=true when essential rubric criteria are satisfied (typically score >= 70), even if not identical to the model answer
- perCriterion must include one entry per rubric item (same order); criterion text in the response language
- overallComment and encouragement must be warm, constructive, and in the student's UI language — never harsh or humiliating
- empty, gibberish, or clearly off-topic answers: passed=false with gentle guidance to try again
PROMPT;

function luna_pick_lang(array $obj, string $language): string
{
    if ($language === 'en' && !empty($obj['en'])) {
        return (string) $obj['en'];
    }
    if (!empty($obj['it'])) {
        return (string) $obj['it'];
    }
    return (string) ($obj['en'] ?? '');
}

function luna_build_writing_grade_user_message(array $body, string $language): string
{
    $lang = $language === 'en' ? 'en' : 'it';
    $task = luna_pick_lang($body['task'] ?? [], $lang);

    $rubricLines = [];
    foreach ($body['rubric'] ?? [] as $index => $item) {
        if (!is_array($item)) {
            continue;
        }
        $rubricLines[] = ($index + 1) . '. ' . luna_pick_lang($item, $lang);
    }

    $grammarRefs = implode(', ', $body['expectsGrammarRefs'] ?? []) ?: '(none listed)';
    $vocabRefs = implode(', ', $body['expectsVocabRefs'] ?? []) ?: '(none listed)';
    $responseLanguage = $lang === 'en' ? 'English' : 'Italian';

    return implode("\n", [
        "UI language for comments: {$responseLanguage}",
        '',
        '## Task',
        $task,
        '',
        '## Rubric criteria',
        implode("\n", $rubricLines),
        '',
        '## Expected grammar refs (context)',
        $grammarRefs,
        '',
        '## Expected vocab refs (context)',
        $vocabRefs,
        '',
        '## Model answer (reference only — not the only correct answer)',
        (string) ($body['modelAnswer'] ?? ''),
        '',
        '## Student answer',
        (string) ($body['studentAnswer'] ?? ''),
    ]);
}

function luna_strip_json_fence(string $text): string
{
    $trimmed = trim($text);
    if (preg_match('/^```(?:json)?\s*([\s\S]*?)```$/i', $trimmed, $matches)) {
        return trim($matches[1]);
    }
    return $trimmed;
}

function luna_parse_writing_grade_response(string $rawText): ?array
{
    $decoded = json_decode(luna_strip_json_fence($rawText), true);
    if (!is_array($decoded)) {
        return null;
    }

    if (!isset($decoded['score']) || !is_numeric($decoded['score'])) {
        return null;
    }

    $score = (int) round(max(0, min(100, (float) $decoded['score'])));
    $overallComment = (string) ($decoded['overallComment'] ?? '');
    $encouragement = (string) ($decoded['encouragement'] ?? '');
    if ($overallComment === '' && $encouragement === '') {
        return null;
    }

    $perCriterion = [];
    if (is_array($decoded['perCriterion'] ?? null)) {
        foreach ($decoded['perCriterion'] as $item) {
            if (!is_array($item)) {
                continue;
            }
            $perCriterion[] = [
                'criterion' => (string) ($item['criterion'] ?? ''),
                'met' => (bool) ($item['met'] ?? false),
                'comment' => (string) ($item['comment'] ?? ''),
            ];
        }
    }

    $passed = $score >= WRITING_PASS_SCORE_THRESHOLD && !empty($decoded['passed']);

    return [
        'passed' => $passed,
        'score' => $score,
        'perCriterion' => $perCriterion,
        'overallComment' => $overallComment,
        'encouragement' => $encouragement,
    ];
}

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request body.']);
    exit;
}

$studentAnswer = trim((string) ($body['studentAnswer'] ?? ''));
if ($studentAnswer === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Missing studentAnswer.']);
    exit;
}

if (
    !is_array($body['task'] ?? null)
    || !is_array($body['rubric'] ?? null)
    || count($body['rubric']) === 0
    || trim((string) ($body['modelAnswer'] ?? '')) === ''
) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid grading payload.']);
    exit;
}

$language = ($body['language'] ?? '') === 'en' ? 'en' : 'it';
$userMessage = luna_build_writing_grade_user_message($body, $language);

$geminiPayload = [
    'system_instruction' => [
        'parts' => [['text' => WRITING_GRADING_SYSTEM_PROMPT]],
    ],
    'contents' => [
        [
            'role' => 'user',
            'parts' => [['text' => $userMessage]],
        ],
    ],
    'generationConfig' => [
        'maxOutputTokens' => 900,
        'temperature' => 0.35,
        'responseMimeType' => 'application/json',
    ],
];

$apiKey = luna_get_gemini_api_key();
$model = 'gemini-2.5-flash';
$apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($geminiPayload));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_TIMEOUT, 35);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false || $httpCode !== 200) {
    http_response_code(502);
    echo json_encode(['error' => 'Gemini grading call failed.', 'status' => $httpCode]);
    exit;
}

$data = json_decode($response, true);
$rawText = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
$grade = luna_parse_writing_grade_response($rawText);

if ($grade === null) {
    http_response_code(502);
    echo json_encode(['error' => 'Could not parse grading response.']);
    exit;
}

echo json_encode(['grade' => $grade]);
