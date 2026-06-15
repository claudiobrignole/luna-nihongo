import { useEffect, useRef, useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { getFirebaseAuth } from './lib/firebase';
import { LearningPath } from './components/LearningPath';
import { Flashcards } from './components/Flashcards';
import { TeacherProfile } from './components/TeacherProfile';
import { BookingCalendar, type BookingMode } from './components/BookingCalendar';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminPanel } from './components/AdminPanel';
import { TeacherDashboard } from './components/TeacherDashboard';
import { AITutor } from './components/AITutor';
import { Header, type TabType, type LanguageType } from './components/Header';
import { HomeLanding } from './components/HomeLanding';
import { Onboarding } from './components/Onboarding';
import { PublicLanding } from './components/PublicLanding';
import { AuthPage } from './components/AuthPage';
import { RegisterPrompt } from './components/RegisterPrompt';
import { CreditsModal } from './components/CreditsModal';
import { BookingPreview } from './components/BookingPreview';
import { GuestTutorPreview } from './components/GuestTutorPreview';
import { GuestFlashcardsPreview } from './components/GuestFlashcardsPreview';
import { PageHero, type PageHeroKey } from './components/PageHero';
import { LegalPage } from './components/LegalPage';
import { SiteFooter } from './components/SiteFooter';
import { CookieConsent } from './components/CookieConsent';
import { ConsentProvider } from './contexts/ConsentContext';
import { useConsent } from './contexts/useConsent';
import { useAuth } from './contexts/AuthContext';
import { isStaffRole, hasActiveSubscription, canAccessTeacherDashboard } from './types/user';
import type { LunaUser } from './types/user';
import { logStudyActivity } from './services/studyActivityService';
import { startFreeTrial } from './services/trialService';
import { syncMarketingConsent } from './services/emailService';
import { CURRICULUM_LEVELS } from './data/curriculum';
import { LunaLogo } from './components/LunaLogo';

type RegisterReason = 'study' | 'tutor' | 'flashcards' | 'booking';

// Immagine Luna + banda manga per ogni pagina (segnaposto, vedi PageHero).
const HERO_FOR: Partial<Record<TabType, PageHeroKey>> = {
  path: 'study',
  flashcards: 'decks',
  tutor: 'tutor',
  teacher: 'teacher',
  booking: 'booking',
  auth: 'auth',
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
  return AUTH_TABS.has(tab as TabType) || tab === 'home' || tab === 'auth' || isLegalTab(tab as TabType);
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
  const { openPreferences } = useConsent();
  const [verifyEmailBusy, setVerifyEmailBusy] = useState(false);
  const [verifyEmailInfo, setVerifyEmailInfo] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [language, setLanguage] = useState<LanguageType>('it');
  const [bookingMode, setBookingMode] = useState<BookingMode>('intro');
  const [rescheduleBookingId, setRescheduleBookingId] = useState<string | null>(null);
  const [authSignupMode, setAuthSignupMode] = useState(true);
  const [registerPromptOpen, setRegisterPromptOpen] = useState(false);
  const [registerReason, setRegisterReason] = useState<RegisterReason>('study');
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [subscribeBookOpen, setSubscribeBookOpen] = useState(false);
  const onboardingAutoOpened = useRef(false);

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
      setBookingMode('intro');
      setActiveTab('booking');
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

  const handleLanguageToggle = () => {
    setLanguage((prev) => (prev === 'it' ? 'en' : 'it'));
  };

  // Navigazione con hash per le pagine legali (link condivisibili dal footer/banner).
  const navigateTab = (tab: TabType) => {
    setActiveTab(tab);
    if (typeof window === 'undefined') return;
    if (isLegalTab(tab)) {
      window.location.hash = tab;
    } else if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    const applyHash = () => {
      const h = window.location.hash.replace('#', '');
      if (h === 'privacy' || h === 'cookies' || h === 'terms') setActiveTab(h);
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
        <div className="bg-glow-1" />
        <div className="bg-glow-2" />
        <Header
          variant="guest"
          activeTab={activeTab}
          onTabChange={setActiveTab}
          language={language}
          onLanguageToggle={handleLanguageToggle}
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
              onExploreStudy={() => setActiveTab('path')}
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
              onNavigateToBooking={() => promptRegister('booking')}
              onRequireAuth={() => promptRegister('booking')}
            />
          )}

          {activeTab === 'booking' && (
            <BookingPreview
              language={language}
              onRegister={() => openRegister('booking')}
            />
          )}

          {activeTab === 'auth' && (
            <AuthPage
              language={language}
              initialSignup={authSignupMode}
              onBack={() => setActiveTab('home')}
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
          language={language}
          onNavigate={navigateTab}
          onOpenCookieSettings={openPreferences}
          onLanguageToggle={handleLanguageToggle}
        />

        <CookieConsent language={language} onOpenPolicy={navigateTab} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="bg-glow-1" />
      <div className="bg-glow-2" />

      <Header
        variant="app"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        language={language}
        onLanguageToggle={handleLanguageToggle}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenOnboarding={openOnboarding}
        onMarketingConsentChange={handleMarketingConsentChange}
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
            onNavigate={setActiveTab}
            onOpenOnboarding={openOnboarding}
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
            onNavigateToBooking={(mode) => {
              setBookingMode(mode);
              setActiveTab('booking');
            }}
            onTrialRefresh={() => refreshUser()}
          />
        )}

        {activeTab === 'booking' && (
          <BookingCalendar
            language={language}
            userEmail={currentUser.email}
            userName={currentUser.username}
            currentUser={currentUser}
            mode={bookingMode}
            defaultPlan={bookingMode === 'regular' ? 'included' : 'trial_intro'}
            rescheduleBookingId={rescheduleBookingId}
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
            onNavigateToBooking={(mode, bookingId) => {
              setBookingMode(mode);
              setRescheduleBookingId(bookingId ?? null);
              setActiveTab('booking');
            }}
            currentUser={currentUser}
            onLogout={handleLogout}
            onUserUpdate={handleUserUpdate}
            onBookingCancelled={() => void refreshUser()}
          />
        )}

        {activeTab === 'admin' && isStaffRole(currentUser.role) && (
          <AdminPanel language={language} currentUser={currentUser} />
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
                  setBookingMode('regular');
                  setActiveTab('booking');
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
        language={language}
        onNavigate={navigateTab}
        onOpenCookieSettings={openPreferences}
        onLanguageToggle={handleLanguageToggle}
      />

      <CookieConsent language={language} onOpenPolicy={navigateTab} />
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
