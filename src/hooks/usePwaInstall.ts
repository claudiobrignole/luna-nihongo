import { useCallback, useEffect, useMemo, useState } from 'react';
import { PWA_INSTALL_DISMISSED_KEY } from '../constants/pwa';

type InstallResult = 'native' | 'ios' | 'android' | 'desktop' | 'unavailable';
export type PwaInstallHelpVariant = 'ios' | 'android' | 'desktop';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const isIosDevice = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent);

const isAndroidDevice = () => /android/i.test(window.navigator.userAgent);

const isStandaloneMode = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installHelpVariant, setInstallHelpVariant] = useState<PwaInstallHelpVariant | null>(null);
  const [isInstalled, setIsInstalled] = useState(() =>
    typeof window !== 'undefined' ? isStandaloneMode() : false,
  );
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== 'undefined'
      ? window.localStorage.getItem(PWA_INSTALL_DISMISSED_KEY) === '1'
      : false,
  );

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setDismissed(true);
      window.localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, '1');
    };

    const media = window.matchMedia('(display-mode: standalone)');
    const onDisplayMode = () => setIsInstalled(isStandaloneMode());

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    media.addEventListener('change', onDisplayMode);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      media.removeEventListener('change', onDisplayMode);
    };
  }, []);

  const isIos = useMemo(() => (typeof window !== 'undefined' ? isIosDevice() : false), []);
  const isAndroid = useMemo(
    () => (typeof window !== 'undefined' ? isAndroidDevice() : false),
    [],
  );

  const canInstall = !isInstalled && (Boolean(deferredPrompt) || isIos);

  const promptInstall = useCallback(async (): Promise<InstallResult> => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDismissed(true);
        window.localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, '1');
      }
      setDeferredPrompt(null);
      return 'native';
    }
    if (isIos) {
      setInstallHelpVariant('ios');
      return 'ios';
    }
    if (isAndroid) {
      setInstallHelpVariant('android');
      return 'android';
    }
    setInstallHelpVariant('desktop');
    return 'desktop';
  }, [deferredPrompt, isAndroid, isIos]);

  const dismissInstallPrompt = useCallback(() => {
    setDismissed(true);
    window.localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, '1');
  }, []);

  return {
    isInstalled,
    isIos,
    canInstall,
    dismissed,
    installHelpVariant,
    setInstallHelpVariant,
    promptInstall,
    dismissInstallPrompt,
  };
}
