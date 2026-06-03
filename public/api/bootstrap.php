<?php
/**
 * Shared helpers for Luna Nihongo PHP API endpoints.
 */

function luna_send_cors_headers(): void
{
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Content-Type: application/json; charset=utf-8');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function luna_get_gemini_api_key(): string
{
    $apiKey = getenv('GEMINI_API_KEY');

    if (empty($apiKey)) {
        $localFile = __DIR__ . '/bootstrap.local.php';
        if (file_exists($localFile)) {
            require_once $localFile;
            if (defined('LUNA_GEMINI_API_KEY')) {
                $apiKey = LUNA_GEMINI_API_KEY;
            }
        }
    }

    if (empty($apiKey)) {
        $apiKey = 'YOUR_GEMINI_API_KEY_HERE';
    }

    if (empty($apiKey) || $apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        http_response_code(500);
        echo json_encode(['error' => 'API key not configured on server.']);
        exit;
    }

    return $apiKey;
}

function luna_pcm_to_wav(string $pcm, int $sampleRate = 24000): string
{
    $channels = 1;
    $bitsPerSample = 16;
    $byteRate = $sampleRate * $channels * ($bitsPerSample / 8);
    $blockAlign = $channels * ($bitsPerSample / 8);
    $dataSize = strlen($pcm);
    $chunkSize = 36 + $dataSize;

    $header = 'RIFF' . pack('V', $chunkSize) . 'WAVE';
    $header .= 'fmt ' . pack('V', 16);
    $header .= pack('v', 1);
    $header .= pack('v', $channels);
    $header .= pack('V', $sampleRate);
    $header .= pack('V', $byteRate);
    $header .= pack('v', $blockAlign);
    $header .= pack('v', $bitsPerSample);
    $header .= 'data' . pack('V', $dataSize);

    return $header . $pcm;
}

function luna_parse_pcm_sample_rate(?string $mimeType): int
{
    if ($mimeType && preg_match('/rate=(\d+)/i', $mimeType, $matches)) {
        return (int) $matches[1];
    }

    return 24000;
}

function luna_call_gemini_tts(string $apiKey, string $text, string $language = 'ja-JP'): array
{
    $models = [
        'gemini-2.5-flash-preview-tts',
        'gemini-2.5-flash-tts',
    ];

    $prompt = "Read the following Japanese text aloud naturally, clearly, and at a moderate pace for a language learner:\n\n" . $text;

    $payload = [
        'contents' => [
            ['parts' => [['text' => $prompt]]],
        ],
        'generationConfig' => [
            'responseModalities' => ['AUDIO'],
            'speechConfig' => [
                'languageCode' => $language,
                'voiceConfig' => [
                    'prebuiltVoiceConfig' => [
                        'voiceName' => 'Kore',
                    ],
                ],
            ],
        ],
    ];

    $lastError = ['error' => 'Gemini TTS call failed.', 'status' => 0];

    foreach ($models as $model) {
        $apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

        $ch = curl_init($apiUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 45);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false || $httpCode !== 200) {
            $lastError = [
                'error' => 'Gemini TTS call failed.',
                'status' => $httpCode,
                'model' => $model,
            ];
            continue;
        }

        $data = json_decode($response, true);
        $part = $data['candidates'][0]['content']['parts'][0] ?? null;

        if (!$part || empty($part['inlineData']['data'])) {
            $lastError = [
                'error' => 'No audio returned from Gemini.',
                'status' => 502,
                'model' => $model,
            ];
            continue;
        }

        $mimeType = $part['inlineData']['mimeType'] ?? 'audio/L16;codec=pcm;rate=24000';
        $pcm = base64_decode($part['inlineData']['data']);

        if ($pcm === false) {
            $lastError = [
                'error' => 'Invalid audio payload from Gemini.',
                'status' => 502,
                'model' => $model,
            ];
            continue;
        }

        $sampleRate = luna_parse_pcm_sample_rate($mimeType);
        $wav = luna_pcm_to_wav($pcm, $sampleRate);

        return [
            'audioBase64' => base64_encode($wav),
            'mimeType' => 'audio/wav',
            'source' => 'gemini',
            'model' => $model,
            'sampleRate' => $sampleRate,
        ];
    }

    http_response_code(502);
    echo json_encode($lastError);
    exit;
}
