/** 3 min in production; short delay in dev for manual PWA banner testing */
export const INSTALL_PROMPT_DELAY_MS = import.meta.env.DEV ? 5_000 : 3 * 60 * 1000;
export const PWA_INSTALL_DISMISSED_KEY = 'luna-pwa-install-dismissed';
