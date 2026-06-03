<?php
/**
 * Luna Nihongo - Secure Gemini API Proxy (Chat Tutor)
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

if (!$body || empty($body['messages'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request body.']);
    exit;
}

$systemPrompt = $body['systemPrompt'] ?? 'You are Luna-sensei, a Japanese language tutor.';
$messages     = $body['messages'] ?? [];

$geminiPayload = [
    'system_instruction' => [
        'parts' => [['text' => $systemPrompt]]
    ],
    'contents' => [],
    'generationConfig' => [
        'maxOutputTokens' => 400,
        'temperature'     => 0.75,
    ]
];

foreach ($messages as $msg) {
    $role = $msg['role'] === 'assistant' ? 'model' : 'user';
    $geminiPayload['contents'][] = [
        'role'  => $role,
        'parts' => [['text' => $msg['content']]]
    ];
}

$model   = 'gemini-2.5-flash';
$apiUrl  = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($geminiPayload));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false || $httpCode !== 200) {
    http_response_code(502);
    echo json_encode(['error' => 'Gemini API call failed.', 'status' => $httpCode]);
    exit;
}

$data  = json_decode($response, true);
$reply = $data['candidates'][0]['content']['parts'][0]['text'] ?? 'No response from Gemini.';

echo json_encode(['reply' => $reply]);
