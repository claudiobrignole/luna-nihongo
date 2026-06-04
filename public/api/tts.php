<?php
/**
 * Luna Nihongo - Secure Gemini TTS Proxy
 *
 * Converts Japanese text to natural speech using Gemini 2.5 Flash TTS.
 * Upload to public_html/api/tts.php on Hostinger alongside tutor.php.
 */

require_once __DIR__ . '/bootstrap.php';

luna_send_cors_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

$apiKey = luna_get_gemini_api_key();
$body = json_decode(file_get_contents('php://input'), true);

if (!$body || empty($body['text'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing text field.']);
    exit;
}

$text = trim((string) $body['text']);
$language = $body['language'] ?? 'ja-JP';

if ($text === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Text cannot be empty.']);
    exit;
}

if (mb_strlen($text) > 120) {
    http_response_code(400);
    echo json_encode(['error' => 'Text too long for TTS (max 120 characters).']);
    exit;
}

$result = luna_call_gemini_tts($apiKey, $text, $language);

if (empty($result['audioBase64'])) {
    $status = isset($result['status']) && (int) $result['status'] > 0 ? (int) $result['status'] : 502;
    http_response_code($status >= 400 && $status < 600 ? $status : 502);
    echo json_encode([
        'error' => $result['error'] ?? 'Gemini TTS unavailable.',
        'status' => $status,
        'model' => $result['model'] ?? null,
    ]);
    exit;
}

echo json_encode($result);
