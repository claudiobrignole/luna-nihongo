import { useEffect, useRef, useState } from 'react';
import { LearningPath } from './components/LearningPath';
import { Flashcards } from './components/Flashcards';
import { TeacherProfile } from './components/TeacherProfile';
import { BookingCalendar } from './components/BookingCalendar';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminPanel } from './components/AdminPanel';
import { AITutor } from './components/AITutor';
import { Header, type TabType, type LanguageType } from './components/Header';
import { HomeLanding } from './components/HomeLanding';
import { Onboarding } from './components/Onboarding';
import { PublicLanding } from './components/PublicLanding';
import { AuthPage } from './components/AuthPage';
import { RegisterPrompt } from './components/RegisterPrompt';
import { BookingPreview } from './components/BookingPreview';
import { GuestTutorPreview } from './components/GuestTutorPreview';
import { GuestFlashcardsPreview } from './components/GuestFlashcardsPreview';
import { useAuth } from './contexts/AuthContext';
import { isAdminRole } from './types/user';
import type { LunaUser } from './types/user';
import { logStudyActivity } from './services/studyActivityService';
import { CURRICULUM_LEVELS } from './data/curriculum';

type RegisterReason = 'study' | 'tutor' | 'flashcards' | 'booking';

function App() {
  const { currentUser, loading, signOut, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [language, setLanguage] = useState<LanguageType>('it');
  const [authSignupMode, setAuthSignupMode] = useState(true);
  const [registerPromptOpen, setRegisterPromptOpen] = useState(false);
  const [registerReason, setRegisterReason] = useState<RegisterReason>('study');
  const [onboardingOpen, setOnboardingOpen] = useState(false);
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
    setActiveTab('path');
    setOnboardingOpen(false);
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

    if (!currentUser.onboardingCompleted && !onboardingAutoOpened.current) {
      setOnboardingOpen(true);
      onboardingAutoOpened.current = true;
    }

    if (currentUser.onboardingCompleted) {
      setActiveTab((tab) => (tab === 'auth' || tab === 'home' ? 'path' : tab));
    }
  }, [currentUser?.id, currentUser?.onboardingCompleted]);

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

        <footer className="main-footer">
          <div className="footer-content">
            <div>© {new Date().getFullYear()} <strong>Luna Nihongo</strong>. All rights reserved.</div>
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
          />
        )}

        {activeTab === 'teacher' && (
          <TeacherProfile
            language={language}
            onNavigateToBooking={() => setActiveTab('booking')}
          />
        )}

        {activeTab === 'booking' && (
          <BookingCalendar
            language={language}
            userId={currentUser.id}
            onBookingSuccess={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'dashboard' && (
          <StudentDashboard
            language={language}
            onNavigateToBooking={() => setActiveTab('booking')}
            currentUser={currentUser}
            onLogout={handleLogout}
            onUserUpdate={handleUserUpdate}
          />
        )}

        {activeTab === 'admin' && isAdminRole(currentUser.role) && (
          <AdminPanel language={language} currentUser={currentUser} />
        )}
      </main>

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
        </div>
      </footer>
    </div>
  );
}

export default App;
