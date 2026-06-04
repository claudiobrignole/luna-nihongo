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

function luna_load_api_key_from_secret_files(): string
{
    $secretFiles = [
        __DIR__ . '/gemini-secret.php',
        __DIR__ . '/bootstrap.local.php',
        __DIR__ . '/../private/luna-gemini.php',
        __DIR__ . '/../../private/luna-gemini.php',
    ];

    foreach ($secretFiles as $localFile) {
        if (!file_exists($localFile)) {
            continue;
        }
        require_once $localFile;
        if (defined('LUNA_GEMINI_API_KEY') && LUNA_GEMINI_API_KEY !== '') {
            return LUNA_GEMINI_API_KEY;
        }
    }

    return '';
}

function luna_get_gemini_api_key(): string
{
    $apiKey = getenv('GEMINI_API_KEY');

    if (empty($apiKey)) {
        $apiKey = luna_load_api_key_from_secret_files();
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

function luna_gemini_error_message(?array $decoded): string
{
    if (!is_array($decoded)) {
        return 'Gemini TTS call failed.';
    }

    if (!empty($decoded['error']['message'])) {
        return (string) $decoded['error']['message'];
    }

    if (!empty($decoded['error']) && is_string($decoded['error'])) {
        return $decoded['error'];
    }

    $feedback = $decoded['promptFeedback']['blockReason'] ?? null;
    if ($feedback) {
        return 'Request blocked: ' . $feedback;
    }

    return 'Gemini TTS call failed.';
}

/**
 * @return array{audioBase64: string, mimeType: string, source: string, model: string, sampleRate: int}|array{error: string, status: int, model?: string}
 */
function luna_call_gemini_tts(string $apiKey, string $text, string $language = 'ja-JP'): array
{
    $models = [
        'gemini-3.1-flash-tts-preview',
        'gemini-2.5-flash-preview-tts',
        'gemini-2.5-pro-preview-tts',
    ];

    $prompt = "Read the following Japanese text aloud naturally, clearly, and at a moderate pace for a language learner:\n\n" . $text;

    $payload = [
        'contents' => [
            ['parts' => [['text' => $prompt]]],
        ],
        'generationConfig' => [
            'responseModalities' => ['AUDIO'],
            'speechConfig' => [
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
        $apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";

        $ch = curl_init($apiUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'x-goog-api-key: ' . $apiKey,
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 45);

        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            $lastError = [
                'error' => $curlError !== '' ? $curlError : 'Network error calling Gemini TTS.',
                'status' => 0,
                'model' => $model,
            ];
            continue;
        }

        $data = json_decode($response, true);

        if ($httpCode !== 200) {
            $lastError = [
                'error' => luna_gemini_error_message(is_array($data) ? $data : null),
                'status' => $httpCode,
                'model' => $model,
            ];
            continue;
        }

        if (!is_array($data)) {
            $lastError = [
                'error' => 'Invalid JSON from Gemini TTS.',
                'status' => 502,
                'model' => $model,
            ];
            continue;
        }

        $candidate = $data['candidates'][0] ?? null;
        $part = $candidate['content']['parts'][0] ?? null;

        if (!$part || empty($part['inlineData']['data'])) {
            $finish = $candidate['finishReason'] ?? 'unknown';
            $lastError = [
                'error' => 'No audio returned from Gemini (finish: ' . $finish . ').',
                'status' => 502,
                'model' => $model,
            ];
            continue;
        }

        $mimeType = $part['inlineData']['mimeType'] ?? 'audio/L16;codec=pcm;rate=24000';
        $pcm = base64_decode($part['inlineData']['data'], true);

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

    return $lastError;
}
