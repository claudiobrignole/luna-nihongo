import { useEffect, useRef, useState } from 'react';
import { LearningPath } from './components/LearningPath';
import { Flashcards } from './components/Flashcards';
import { TeacherProfile } from './components/TeacherProfile';
import { BookingCalendar, type BookingMode } from './components/BookingCalendar';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminPanel } from './components/AdminPanel';
import { AITutor } from './components/AITutor';
import { Header, type TabType, type LanguageType } from './components/Header';
import { HomeLanding } from './components/HomeLanding';
import { Onboarding } from './components/Onboarding';
import { PublicLanding } from './components/PublicLanding';
import { AuthPage } from './components/AuthPage';
import { RegisterPrompt } from './components/RegisterPrompt';
import { CreditsModal, FooterKanjiVgLine } from './components/CreditsModal';
import { BookingPreview } from './components/BookingPreview';
import { GuestTutorPreview } from './components/GuestTutorPreview';
import { GuestFlashcardsPreview } from './components/GuestFlashcardsPreview';
import { useAuth } from './contexts/AuthContext';
import { isAdminRole, hasActiveSubscription } from './types/user';
import type { LunaUser } from './types/user';
import { logStudyActivity } from './services/studyActivityService';
import { startFreeTrial } from './services/trialService';
import { CURRICULUM_LEVELS } from './data/curriculum';

type RegisterReason = 'study' | 'tutor' | 'flashcards' | 'booking';

function App() {
  const { currentUser, loading, signOut, updateUser, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [language, setLanguage] = useState<LanguageType>('it');
  const [bookingMode, setBookingMode] = useState<BookingMode>('intro');
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

  const handleOnboardingComplete = async (preferredStartLevel: number) => {
    if (!currentUser) return;
    const levelMeta = CURRICULUM_LEVELS.find((l) => l.level === preferredStartLevel);
    await updateUser({
      onboardingCompleted: true,
      preferredStartLevel,
    });
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

  const handleLanguageToggle = () => {
    setLanguage((prev) => (prev === 'it' ? 'en' : 'it'));
  };

  // After login: first-time users see onboarding; returning users land on Studio.
  useEffect(() => {
    if (!currentUser) {
      setOnboardingOpen(false);
      onboardingAutoOpened.current = false;
      return;
    }

    setActiveTab((tab) => (tab === 'auth' ? 'path' : tab));

    if (!currentUser.onboardingCompleted && !onboardingAutoOpened.current) {
      setOnboardingOpen(true);
      onboardingAutoOpened.current = true;
    }

    if (currentUser.onboardingCompleted) {
      setActiveTab((tab) => (tab === 'auth' || tab === 'home' ? 'path' : tab));
    }
  }, [currentUser?.id, currentUser?.onboardingCompleted]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (!checkout || !currentUser) return;

    if (checkout === 'success') {
      void refreshUser();
      if (params.get('book') === '1') {
        setSubscribeBookOpen(true);
      }
    }

    if (checkout === 'extra') {
      void refreshUser();
    }

    params.delete('checkout');
    params.delete('book');
    params.delete('slotId');
    params.delete('lang');
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, '', next);
  }, [currentUser, refreshUser]);

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="logo-circle" style={{ margin: '0 auto 1rem', width: 48, height: 48, fontSize: '1.4rem' }}>月</div>
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

        <footer className="main-footer">
          <div className="footer-content">
            <div>© {new Date().getFullYear()} <strong>Luna Nihongo</strong>. All rights reserved.</div>
            <FooterKanjiVgLine language={language} onOpenCredits={() => setCreditsOpen(true)} />
          </div>
        </footer>
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
      />

      {onboardingOpen && (
        <Onboarding
          language={language}
          username={currentUser.username}
          initialLevel={currentUser.preferredStartLevel}
          startAtLevelStep={currentUser.onboardingCompleted}
          onComplete={(level) => void handleOnboardingComplete(level)}
          onClose={() => setOnboardingOpen(false)}
        />
      )}

      <main className="main-content">
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
            onBookingSuccess={() => {
              void refreshUser();
              setActiveTab('dashboard');
            }}
          />
        )}

        {activeTab === 'dashboard' && (
          <StudentDashboard
            language={language}
            onNavigateToBooking={() => {
              setBookingMode('regular');
              setActiveTab('booking');
            }}
            currentUser={currentUser}
            onLogout={handleLogout}
            onUserUpdate={handleUserUpdate}
          />
        )}

        {activeTab === 'admin' && isAdminRole(currentUser.role) && (
          <AdminPanel language={language} currentUser={currentUser} />
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

      <footer className="main-footer">
        <div className="footer-content">
          <div>
            © {new Date().getFullYear()} <strong>Luna Nihongo</strong>. All rights reserved.
          </div>
          <div style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>
            {language === 'en'
              ? 'Empowering Japanese learners through spaced repetition and AI tutoring.'
              : 'Aiutiamo gli studenti a imparare il giapponese con AI e ripasso spaziato.'}
          </div>
          <FooterKanjiVgLine language={language} onOpenCredits={() => setCreditsOpen(true)} />
        </div>
      </footer>
    </div>
  );
}

export default App;
