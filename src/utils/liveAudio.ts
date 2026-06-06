/** PCM helpers for Gemini Live (16 kHz in, 24 kHz out). */

export const INPUT_SAMPLE_RATE = 16000;
export const OUTPUT_SAMPLE_RATE = 24000;

export function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const s = Math.max(-1, Math.min(1, input[i] ?? 0));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

export function int16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

export function base64ToInt16(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

export function downsampleBuffer(
  buffer: Float32Array,
  inputRate: number,
  outputRate: number,
): Float32Array {
  if (outputRate === inputRate) return buffer;
  const ratio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i += 1) {
    const idx = Math.floor(i * ratio);
    result[i] = buffer[idx] ?? 0;
  }
  return result;
}

export class PcmPlaybackQueue {
  private ctx: AudioContext;

  private nextTime = 0;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.nextTime = ctx.currentTime;
  }

  enqueuePcm16(pcm: Int16Array, sampleRate: number): void {
    const float = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i += 1) {
      float[i] = (pcm[i] ?? 0) / 32768;
    }
    const buffer = this.ctx.createBuffer(1, float.length, sampleRate);
    buffer.copyToChannel(float, 0);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);
    const start = Math.max(this.ctx.currentTime, this.nextTime);
    source.start(start);
    this.nextTime = start + buffer.duration;
  }

  reset(): void {
    this.nextTime = this.ctx.currentTime;
  }
}
