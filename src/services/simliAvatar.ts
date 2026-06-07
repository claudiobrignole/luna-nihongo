/**
 * Simli real-time avatar (Phase 4 — optional).
 * Pipe Gemini Live audio into Simli WebRTC for lip-sync video.
 * Docs: https://docs.simli.com/overview
 */

export const SIMLI_PHASE2_ENABLED = true;

export interface SimliSession {
  videoElement: HTMLVideoElement;
  disconnect: () => void;
}

export function isSimliConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SIMLI_API_KEY && import.meta.env.VITE_SIMLI_FACE_ID);
}

/**
 * Connect Simli avatar to an audio stream from Gemini Live playback.
 * Returns null when Simli is not configured or WebRTC is unavailable.
 */
export async function connectSimliAvatar(
  audioStream: MediaStream,
): Promise<SimliSession | null> {
  if (!SIMLI_PHASE2_ENABLED || !isSimliConfigured()) {
    return null;
  }

  const apiKey = import.meta.env.VITE_SIMLI_API_KEY as string;
  const faceId = import.meta.env.VITE_SIMLI_FACE_ID as string;

  try {
    const response = await fetch('https://api.simli.ai/startAudioToVideoSession', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ faceId }),
    });

    if (!response.ok) {
      console.warn('Simli session start failed', response.status);
      return null;
    }

    const data = (await response.json()) as { sdp?: { type: string; sdp: string }; iceServers?: RTCIceServer[] };
    if (!data.sdp) {
      return null;
    }

    const pc = new RTCPeerConnection({ iceServers: data.iceServers ?? [] });
    const videoElement = document.createElement('video');
    videoElement.autoplay = true;
    videoElement.playsInline = true;
    videoElement.muted = true;
    videoElement.className = 'luna-simli-video';

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        videoElement.srcObject = stream;
      }
    };

    audioStream.getTracks().forEach((track) => {
      pc.addTrack(track, audioStream);
    });

    await pc.setRemoteDescription(data.sdp as RTCSessionDescriptionInit);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    return {
      videoElement,
      disconnect: () => {
        pc.close();
        videoElement.srcObject = null;
      },
    };
  } catch (err) {
    console.warn('Simli avatar unavailable', err);
    return null;
  }
}
