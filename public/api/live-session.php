<?php
/**
 * Luna Nihongo — Gemini Live ephemeral token (Hostinger / PHP proxy).
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

if (!is_array($body) || empty($body['systemPrompt']) || !is_string($body['systemPrompt'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing systemPrompt.']);
    exit;
}

$systemPrompt = $body['systemPrompt'];
$models = [
    'gemini-2.5-flash-native-audio-preview-12-2025',
    'gemini-2.0-flash-live-001',
];

$expireTime = gmdate('Y-m-d\TH:i:s\Z', time() + 30 * 60);
$newSessionExpireTime = gmdate('Y-m-d\TH:i:s\Z', time() + 2 * 60);
$apiUrl = 'https://generativelanguage.googleapis.com/v1alpha/auth_tokens';

$lastError = ['error' => 'Could not create live session token.', 'status' => 502];

foreach ($models as $model) {
    $payload = [
        'expireTime' => $expireTime,
        'newSessionExpireTime' => $newSessionExpireTime,
        'uses' => 1,
        'bidi_generate_content_setup' => [
            'model' => 'models/' . $model,
            'generation_config' => [
                'response_modalities' => ['AUDIO'],
                'speech_config' => [
                    'voice_config' => [
                        'prebuilt_voice_config' => [
                            'voice_name' => 'Kore',
                        ],
                    ],
                ],
            ],
            'system_instruction' => [
                'parts' => [['text' => $systemPrompt]],
            ],
            'input_audio_transcription' => new stdClass(),
            'output_audio_transcription' => new stdClass(),
        ],
    ];

    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'x-goog-api-key: ' . $apiKey,
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    $response = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        $lastError = [
            'error' => $curlError !== '' ? $curlError : 'Network error calling Gemini Live API.',
            'status' => 502,
        ];
        continue;
    }

    $data = json_decode($response, true);

    if ($httpCode !== 200 || !is_array($data)) {
        $lastError = [
            'error' => luna_gemini_error_message(is_array($data) ? $data : null),
            'status' => $httpCode > 0 ? $httpCode : 502,
        ];
        continue;
    }

    $tokenName = $data['name'] ?? '';
    if ($tokenName === '') {
        $lastError = ['error' => 'Empty live session token from Gemini.', 'status' => 502];
        continue;
    }

    echo json_encode([
        'token' => $tokenName,
        'model' => $model,
    ]);
    exit;
}

http_response_code($lastError['status'] > 0 ? $lastError['status'] : 502);
echo json_encode(['error' => $lastError['error']]);
