import { useEffect, useMemo, useRef, useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { getFirebaseAuth } from './lib/firebase';
import { LearningPath } from './components/LearningPath';
import { Flashcards } from './components/Flashcards';
import { TeacherProfile } from './components/TeacherProfile';
import { type BookingMode } from './components/BookingCalendar';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminPanel, type AdminPanelSection } from './components/AdminPanel';
import { TeacherDashboard } from './components/TeacherDashboard';
import { AITutor } from './components/AITutor';
import { Header, type TabType } from './components/Header';
import { HomeLanding } from './components/HomeLanding';
import { Onboarding } from './components/Onboarding';
import { PublicLanding } from './components/PublicLanding';
import { AuthPage } from './components/AuthPage';
import { RegisterPrompt } from './components/RegisterPrompt';
import { CreditsModal } from './components/CreditsModal';
import { GuestTutorPreview } from './components/GuestTutorPreview';
import { GuestFlashcardsPreview } from './components/GuestFlashcardsPreview';
import { PageHero, type PageHeroKey } from './components/PageHero';
import { LegalPage } from './components/LegalPage';
import { SiteFooter } from './components/SiteFooter';
import { LunaLogo } from './components/LunaLogo';
import { CookieConsent } from './components/CookieConsent';
import { LanguageSuggestModal } from './components/LanguageSuggestModal';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { PwaInstallModal } from './components/PwaInstallModal';
import { ConsentProvider } from './contexts/ConsentContext';
import { useConsent } from './contexts/useConsent';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';
import { usePwaInstall } from './hooks/usePwaInstall';
import {
  readLanguageSuggestDismissed,
  readStoredLanguage,
  shouldSuggestEnglish,
} from './utils/language';
import { isStaffRole, hasActiveSubscription, canAccessTeacherDashboard } from './types/user';
import type { LunaUser } from './types/user';
import { logStudyActivity } from './services/studyActivityService';
import { startFreeTrial } from './services/trialService';
import { syncMarketingConsent } from './services/emailService';
import { CURRICULUM_LEVELS } from './data/curriculum';
import { BlogListPage } from './components/BlogListPage';
import { BlogPostPage } from './components/BlogPostPage';

type RegisterReason = 'study' | 'tutor' | 'flashcards' | 'booking';

// Immagine Luna + banda manga per ogni pagina (segnaposto, vedi PageHero).
const HERO_FOR: Partial<Record<TabType, PageHeroKey>> = {
  path: 'study',
  flashcards: 'decks',
  tutor: 'tutor',
  teacher: 'teacher',
  blog: 'blog',
  dashboard: 'dashboard',
};

function isLegalTab(tab: TabType): tab is 'privacy' | 'cookies' | 'terms' {
  return tab === 'privacy' || tab === 'cookies' || tab === 'terms';
}

const AUTH_TABS = new Set<TabType>([
  'path',
  'flashcards',
  'tutor',
  'teacher',
  'booking',
  'dashboard',
  'admin',
  'teacher-dashboard',
]);

function isKnownTab(tab: string): tab is TabType {
  return AUTH_TABS.has(tab as TabType) || tab === 'home' || tab === 'auth' || tab === 'blog' || isLegalTab(tab as TabType);
}

function canOpenTab(tab: TabType, user: LunaUser | null): boolean {
  if (tab === 'admin' || tab === 'teacher-dashboard') {
    if (!user) return false;
    if (tab === 'admin') return isStaffRole(user.role);
    return canAccessTeacherDashboard(user.role);
  }
  if (tab === 'dashboard' || tab === 'booking' || tab === 'path' || tab === 'flashcards' || tab === 'tutor') {
    return Boolean(user);
  }
  return true;
}

function AppInner() {
  const { currentUser, firebaseUser, loading, signOut, updateUser, refreshUser } = useAuth();
  const { openPreferences, decision, bannerOpen, prefsOpen } = useConsent();
  const { language } = useLanguage();
  const [verifyEmailBusy, setVerifyEmailBusy] = useState(false);
  const [verifyEmailInfo, setVerifyEmailInfo] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [blogSlug, setBlogSlug] = useState<string | null>(null);
  const [bookingMode, setBookingMode] = useState<BookingMode>('intro');
  const [rescheduleBookingId, setRescheduleBookingId] = useState<string | null>(null);
  const [authSignupMode, setAuthSignupMode] = useState(true);
  const [registerPromptOpen, setRegisterPromptOpen] = useState(false);
  const [registerReason, setRegisterReason] = useState<RegisterReason>('study');
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [subscribeBookOpen, setSubscribeBookOpen] = useState(false);
  const [adminSection, setAdminSection] = useState<AdminPanelSection>('users');
  const onboardingAutoOpened = useRef(false);
  const lunaBookingRef = useRef<HTMLElement>(null);
  const pwa = usePwaInstall();

  const languageSuggestOpen = useMemo(
    () =>
      decision !== null &&
      !bannerOpen &&
      !prefsOpen &&
      shouldSuggestEnglish(
        readStoredLanguage(),
        readLanguageSuggestDismissed(),
        language,
      ),
    [decision, bannerOpen, prefsOpen, language],
  );

  const openRegister = (reason: RegisterReason = 'study') => {
    setRegisterReason(reason);
    setAuthSignupMode(true);
    setActiveTab('auth');
    setRegisterPromptOpen(false);
  };

  const openLogin = () => {
    setAuthSignupMode(false);
    setActiveTab('auth');
  };

  const promptRegister = (reason: RegisterReason) => {
    setRegisterReason(reason);
    setRegisterPromptOpen(true);
  };

  const handleLogout = async () => {
    await signOut();
    setActiveTab('home');
  };

  const handleCompleteUnit = async (unitId: string) => {
    if (!currentUser) return;
    if (currentUser.completedUnits.includes(unitId)) return;

    await updateUser({
      completedUnits: [...currentUser.completedUnits, unitId],
      xp: (currentUser.xp || 0) + 10,
    });

    void logStudyActivity(currentUser.id, {
      type: 'unit_completed',
      label: unitId,
      unitId,
    });
  };

  const handleEarnQuizXp = async (xp: number) => {
    if (!currentUser || xp <= 0) return;
    await updateUser({ xp: (currentUser.xp || 0) + xp });
  };

  const handleUnitOpen = (unitId: string, level: number) => {
    if (!currentUser) return;
    void logStudyActivity(currentUser.id, {
      type: 'unit_opened',
      label: unitId,
      unitId,
      level,
    });
  };

  const handleOnboardingComplete = async (preferredStartLevel: number, marketingConsent: boolean) => {
    if (!currentUser) return;
    const levelMeta = CURRICULUM_LEVELS.find((l) => l.level === preferredStartLevel);
    const now = new Date().toISOString();
    await updateUser({
      onboardingCompleted: true,
      preferredStartLevel,
      preferredLanguage: language,
      ...(marketingConsent
        ? { marketingConsent: true, marketingConsentAt: now }
        : {}),
    });
    if (marketingConsent) {
      void syncMarketingConsent().catch((err) => console.warn('SendFox sync failed', err));
    }
    void logStudyActivity(currentUser.id, {
      type: 'level_selected',
      label: levelMeta?.title[language] ?? `Level ${preferredStartLevel}`,
      level: preferredStartLevel,
    });
    setOnboardingOpen(false);

    const shouldStartTrial = !currentUser.trialUsed && !hasActiveSubscription(currentUser);
    if (shouldStartTrial) {
      try {
        await startFreeTrial();
        await refreshUser();
      } catch (err) {
        console.warn('Auto trial start skipped', err);
      }
      openLunaBooking('intro');
      return;
    }

    setActiveTab('path');
  };

  const openOnboarding = () => setOnboardingOpen(true);

  const handleUserUpdate = async (updates: Partial<LunaUser>) => {
    await updateUser(updates);
  };

  const handleMarketingConsentChange = async (consent: boolean) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    await updateUser({
      marketingConsent: consent,
      marketingConsentAt: consent ? now : null,
    });
    if (consent) {
      void syncMarketingConsent().catch((err) => console.warn('SendFox sync failed', err));
    }
  };

  const handleResendVerification = async () => {
    const fbUser = getFirebaseAuth().currentUser;
    if (!fbUser || fbUser.emailVerified) return;
    setVerifyEmailBusy(true);
    setVerifyEmailInfo('');
    try {
      await sendEmailVerification(fbUser);
      setVerifyEmailInfo(
        language === 'en'
          ? 'Verification email sent — check your inbox.'
          : 'Email di verifica inviata — controlla la posta.',
      );
    } catch {
      setVerifyEmailInfo(
        language === 'en'
          ? 'Could not send verification email. Try again later.'
          : 'Impossibile inviare l\'email di verifica. Riprova più tardi.',
      );
    } finally {
      setVerifyEmailBusy(false);
    }
  };

  const scrollToLunaBooking = () => {
    window.setTimeout(() => {
      (lunaBookingRef.current ?? document.getElementById('luna-booking'))?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 50);
  };

  const openLunaBooking = (mode: BookingMode = 'regular', bookingId?: string | null) => {
    setBookingMode(mode);
    setRescheduleBookingId(bookingId ?? null);
    setActiveTab('teacher');
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    scrollToLunaBooking();
  };

  const navigateApp = (tab: TabType, slug?: string | null) => {
    if (tab === 'booking') {
      openLunaBooking('regular');
      return;
    }
    setActiveTab(tab);
    if (typeof window === 'undefined') return;
    if (tab === 'blog') {
      const nextSlug = slug ?? null;
      setBlogSlug(nextSlug);
      window.location.hash = nextSlug ? `blog/${nextSlug}` : 'blog';
    } else {
      setBlogSlug(null);
      if (isLegalTab(tab)) {
        window.location.hash = tab;
      } else if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
    window.scrollTo({ top: 0 });
  };

  const openAdmin = (section: AdminPanelSection = 'users') => {
    setAdminSection(section);
    navigateApp('admin');
  };

  // Navigazione con hash per legal e blog (link condivisibili).
  const navigateTab = (tab: TabType) => {
    navigateApp(tab);
  };

  useEffect(() => {
    const applyHash = () => {
      const h = window.location.hash.replace('#', '');
      if (h === 'privacy' || h === 'cookies' || h === 'terms') {
        setActiveTab(h);
        setBlogSlug(null);
        return;
      }
      if (h === 'blog' || h.startsWith('blog/')) {
        setActiveTab('blog');
        setBlogSlug(h.startsWith('blog/') ? h.slice(5) : null);
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  // After login: first-time users see onboarding; returning users land on Studio.
  useEffect(() => {
    if (!currentUser) {
      setOnboardingOpen(false);
      onboardingAutoOpened.current = false;
      return;
    }

    const pendingTab = sessionStorage.getItem('luna_pending_tab');
    if (pendingTab && isKnownTab(pendingTab) && canOpenTab(pendingTab, currentUser)) {
      sessionStorage.removeItem('luna_pending_tab');
      setActiveTab(pendingTab);
    } else {
      setActiveTab((tab) => (tab === 'auth' ? 'path' : tab));
    }

    if (!currentUser.onboardingCompleted && !onboardingAutoOpened.current) {
      setOnboardingOpen(true);
      onboardingAutoOpened.current = true;
    }

    if (currentUser.onboardingCompleted && !pendingTab) {
      setActiveTab((tab) => (tab === 'auth' || tab === 'home' ? 'path' : tab));
    }
  }, [currentUser?.id, currentUser?.onboardingCompleted]);

  // Deep links: ?tab=teacher-dashboard (emails), ?checkout= (Stripe).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && isKnownTab(tab)) {
      sessionStorage.setItem('luna_pending_tab', tab);
      params.delete('tab');
    }

    const checkout = params.get('checkout');
    if (checkout === 'success' && params.get('book') === '1') {
      sessionStorage.setItem('luna_pending_subscribe_book', '1');
    }
    if (checkout === 'extra') {
      sessionStorage.setItem('luna_pending_extra_refresh', '1');
    }
    if (checkout === 'gift') {
      sessionStorage.setItem('luna_pending_gift_refresh', '1');
    }

    params.delete('checkout');
    params.delete('book');
    params.delete('slotId');
    params.delete('lang');
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, '', next);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const pendingBook = sessionStorage.getItem('luna_pending_subscribe_book');
    if (pendingBook === '1') {
      sessionStorage.removeItem('luna_pending_subscribe_book');
      void refreshUser().then(() => setSubscribeBookOpen(true));
      return;
    }

    if (sessionStorage.getItem('luna_pending_extra_refresh') === '1') {
      sessionStorage.removeItem('luna_pending_extra_refresh');
      void refreshUser();
    }

    if (sessionStorage.getItem('luna_pending_gift_refresh') === '1') {
      sessionStorage.removeItem('luna_pending_gift_refresh');
      void refreshUser();
    }
  }, [currentUser, refreshUser]);

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <LunaLogo layout="icon" className="luna-logo--loading" />
          <p>{language === 'en' ? 'Loading...' : 'Caricamento...'}</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="app-container">
        <Header
          variant="guest"
          activeTab={activeTab}
          onTabChange={navigateApp}
          language={language}
          onRegister={() => openRegister('study')}
          onLogin={openLogin}
        />
        <main className="main-content">
          {HERO_FOR[activeTab] && activeTab !== 'home' && (
            <PageHero page={HERO_FOR[activeTab]!} language={language} />
          )}
          {isLegalTab(activeTab) && <LegalPage doc={activeTab} language={language} />}
          {activeTab === 'home' && (
            <PublicLanding
              language={language}
              onRegister={() => openRegister('study')}
              onExploreStudy={() => navigateApp('path')}
              onNavigate={navigateApp}
            />
          )}

          {activeTab === 'blog' && !blogSlug && (
            <BlogListPage language={language} onOpenPost={(slug) => navigateApp('blog', slug)} />
          )}
          {activeTab === 'blog' && blogSlug && (
            <BlogPostPage
              slug={blogSlug}
              language={language}
              onBack={() => navigateApp('blog')}
              onOpenPost={(slug) => navigateApp('blog', slug)}
            />
          )}

          {activeTab === 'path' && (
            <LearningPath
              language={language}
              completedUnits={[]}
              onCompleteUnit={() => {}}
              guestMode
              onRequireAuth={() => promptRegister('study')}
            />
          )}

          {activeTab === 'flashcards' && (
            <GuestFlashcardsPreview
              language={language}
              onRequireAuth={() => promptRegister('flashcards')}
            />
          )}

          {activeTab === 'tutor' && (
            <GuestTutorPreview
              language={language}
              onRequireAuth={() => promptRegister('tutor')}
            />
          )}

          {activeTab === 'teacher' && (
            <TeacherProfile
              language={language}
              bookingSectionRef={lunaBookingRef}
              onScrollToBooking={(mode) => openLunaBooking(mode)}
              onRequireAuth={() => promptRegister('booking')}
            />
          )}

          {activeTab === 'auth' && (
            <AuthPage
              language={language}
              initialSignup={authSignupMode}
            />
          )}
        </main>

        <RegisterPrompt
          language={language}
          open={registerPromptOpen}
          reason={registerReason}
          onClose={() => setRegisterPromptOpen(false)}
          onRegister={() => openRegister(registerReason)}
        />

        <CreditsModal language={language} open={creditsOpen} onClose={() => setCreditsOpen(false)} />

        <SiteFooter
          onNavigate={navigateTab}
          onOpenCookieSettings={openPreferences}
          onInstallApp={() => void pwa.promptInstall()}
        />

        <PwaInstallBanner
          language={language}
          visible={pwa.canInstall && !pwa.dismissed}
          onInstall={() => void pwa.promptInstall()}
          onDismiss={pwa.dismissInstallPrompt}
        />
        <PwaInstallModal
          language={language}
          variant={pwa.installHelpVariant}
          open={pwa.installHelpVariant !== null}
          onClose={() => pwa.setInstallHelpVariant(null)}
        />
        <CookieConsent language={language} onOpenPolicy={navigateTab} />
        <LanguageSuggestModal open={languageSuggestOpen} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header
        variant="app"
        activeTab={activeTab}
        onTabChange={navigateApp}
        language={language}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenOnboarding={openOnboarding}
        onOpenAdmin={openAdmin}
      />

      {firebaseUser && !firebaseUser.emailVerified && (
        <div className="email-verify-banner" role="status">
          <p>
            {language === 'en'
              ? 'Please verify your email address to secure your account.'
              : 'Verifica il tuo indirizzo email per proteggere l\'account.'}
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void handleResendVerification()}
            disabled={verifyEmailBusy}
          >
            {verifyEmailBusy
              ? (language === 'en' ? 'Sending…' : 'Invio…')
              : (language === 'en' ? 'Resend verification email' : 'Reinvia email di verifica')}
          </button>
          {verifyEmailInfo && <span className="email-verify-banner-info">{verifyEmailInfo}</span>}
        </div>
      )}

      {onboardingOpen && (
        <Onboarding
          language={language}
          username={currentUser.username}
          initialLevel={currentUser.preferredStartLevel}
          startAtLevelStep={currentUser.onboardingCompleted}
          showMarketingOptIn={currentUser.onboardingCompleted && !currentUser.marketingConsent}
          onComplete={(level, marketingConsent) => void handleOnboardingComplete(level, marketingConsent)}
          onClose={() => setOnboardingOpen(false)}
        />
      )}

      <main className="main-content">
        {HERO_FOR[activeTab] && activeTab !== 'home' && activeTab !== 'tutor' && (
          <PageHero
            page={HERO_FOR[activeTab]!}
            language={language}
            subOverride={
              activeTab === 'dashboard'
                ? (language === 'en'
                    ? `Welcome back, ${currentUser.username}`
                    : `Bentornato, ${currentUser.username}`)
                : undefined
            }
          />
        )}
        {isLegalTab(activeTab) && <LegalPage doc={activeTab} language={language} />}
        {activeTab === 'home' && (
          <HomeLanding
            language={language}
            currentUser={currentUser}
            onNavigate={navigateApp}
            onOpenOnboarding={openOnboarding}
          />
        )}

        {activeTab === 'blog' && !blogSlug && (
          <BlogListPage language={language} onOpenPost={(slug) => navigateApp('blog', slug)} />
        )}
        {activeTab === 'blog' && blogSlug && (
          <BlogPostPage
            slug={blogSlug}
            language={language}
            onBack={() => navigateApp('blog')}
            onOpenPost={(slug) => navigateApp('blog', slug)}
          />
        )}

        {activeTab === 'path' && (
          <LearningPath
            language={language}
            completedUnits={currentUser.completedUnits}
            onCompleteUnit={handleCompleteUnit}
            initialLevel={currentUser.preferredStartLevel}
            onUnitOpen={handleUnitOpen}
            onOpenOnboarding={openOnboarding}
            showRomaji={currentUser.showRomaji}
            onEarnQuizXp={handleEarnQuizXp}
            onOpenCredits={() => setCreditsOpen(true)}
          />
        )}

        {activeTab === 'flashcards' && (
          <Flashcards language={language} userId={currentUser.id} />
        )}

        {activeTab === 'tutor' && (
          <AITutor
            language={language}
            currentUser={currentUser}
            onUserUpdate={handleUserUpdate}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
            onTutorMessage={(label) => {
              void logStudyActivity(currentUser.id, {
                type: 'tutor_message',
                label,
              });
            }}
            onLiveSession={(durationSeconds) => {
              void logStudyActivity(currentUser.id, {
                type: 'live_session',
                label: language === 'en' ? 'Luna Live session' : 'Sessione Luna Live',
                meta: { durationSeconds },
              });
            }}
          />
        )}

        {activeTab === 'teacher' && (
          <TeacherProfile
            language={language}
            currentUser={currentUser}
            bookingMode={bookingMode}
            rescheduleBookingId={rescheduleBookingId}
            bookingSectionRef={lunaBookingRef}
            onScrollToBooking={(mode) => openLunaBooking(mode)}
            onTrialRefresh={() => refreshUser()}
            onBookingSuccess={() => {
              void refreshUser();
              setRescheduleBookingId(null);
              setActiveTab('dashboard');
            }}
          />
        )}

        {activeTab === 'dashboard' && (
          <StudentDashboard
            language={language}
            onNavigateToBooking={(mode, bookingId) => openLunaBooking(mode, bookingId)}
            currentUser={currentUser}
            onLogout={handleLogout}
            onUserUpdate={handleUserUpdate}
            onMarketingConsentChange={handleMarketingConsentChange}
            onBookingCancelled={() => void refreshUser()}
          />
        )}

        {activeTab === 'admin' && isStaffRole(currentUser.role) && (
          <AdminPanel language={language} currentUser={currentUser} initialSection={adminSection} />
        )}

        {activeTab === 'teacher-dashboard' && currentUser && canAccessTeacherDashboard(currentUser.role) && (
          <TeacherDashboard language={language} currentUser={currentUser} />
        )}
      </main>

      {subscribeBookOpen && (
        <div className="onboarding-overlay">
          <div className="onboarding-panel glass-panel" style={{ maxWidth: 480 }}>
            <h2>{language === 'en' ? 'Welcome to Premium!' : 'Benvenuto in Premium!'}</h2>
            <p style={{ color: 'var(--text-muted)' }}>
              {language === 'en'
                ? 'Your subscription is active. Book your 2 included 60-minute lessons for this billing cycle. Extra lessons are available at 49 EUR/CHF each.'
                : 'Il tuo abbonamento è attivo. Prenota le 2 lezioni incluse da 60 minuti per questo ciclo. Lezioni extra disponibili a 49 EUR/CHF ciascuna.'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setSubscribeBookOpen(false);
                  openLunaBooking('regular');
                }}
              >
                {language === 'en' ? 'Book included lessons' : 'Prenota lezioni incluse'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setSubscribeBookOpen(false)}>
                {language === 'en' ? 'Later' : 'Più tardi'}
              </button>
            </div>
          </div>
        </div>
      )}

      <CreditsModal language={language} open={creditsOpen} onClose={() => setCreditsOpen(false)} />

      <SiteFooter
        onNavigate={navigateTab}
        onOpenCookieSettings={openPreferences}
        onInstallApp={() => void pwa.promptInstall()}
      />

      <PwaInstallBanner
        language={language}
        visible={pwa.canInstall && !pwa.dismissed}
        onInstall={() => void pwa.promptInstall()}
        onDismiss={pwa.dismissInstallPrompt}
      />
      <PwaInstallModal
        language={language}
        variant={pwa.installHelpVariant}
        open={pwa.installHelpVariant !== null}
        onClose={() => pwa.setInstallHelpVariant(null)}
      />
      <CookieConsent language={language} onOpenPolicy={navigateTab} />
      <LanguageSuggestModal open={languageSuggestOpen} />
    </div>
  );
}

export default function App() {
  return (
    <ConsentProvider>
      <AppInner />
    </ConsentProvider>
  );
}
