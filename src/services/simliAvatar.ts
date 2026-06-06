/**
 * Phase 2 — Simli real-time avatar (optional).
 *
 * After Luna Live voice is stable, pipe Gemini Live audio output (PCM 16 kHz)
 * into Simli WebRTC for lip-sync video (~$0.009/min).
 *
 * Docs: https://docs.simli.com/overview
 * Requires: VITE_SIMLI_API_KEY, VITE_SIMLI_FACE_ID
 *
 * export async function connectSimliAvatar(audioStream: MediaStream): Promise<SimliSession> { ... }
 */

export const SIMLI_PHASE2_ENABLED = false;

export function isSimliConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SIMLI_API_KEY && import.meta.env.VITE_SIMLI_FACE_ID);
}
