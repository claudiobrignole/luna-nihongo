import { useState } from 'react';
import { LearningPath } from './components/LearningPath';
import { Flashcards } from './components/Flashcards';
import { TeacherProfile } from './components/TeacherProfile';
import { BookingCalendar } from './components/BookingCalendar';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminPanel } from './components/AdminPanel';
import { Auth } from './components/Auth';
import { AITutor } from './components/AITutor';
import { Header, type TabType, type LanguageType } from './components/Header';
import { useAuth } from './contexts/AuthContext';
import { isAdminRole } from './types/user';
import type { LunaUser } from './types/user';

function App() {
  const { currentUser, loading, signOut, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('path');
  const [language, setLanguage] = useState<LanguageType>('it');

  const handleLogout = async () => {
    await signOut();
    setActiveTab('path');
  };

  const handleCompleteUnit = async (unitId: string) => {
    if (!currentUser) return;
    if (currentUser.completedUnits.includes(unitId)) return;

    await updateUser({
      completedUnits: [...currentUser.completedUnits, unitId],
      xp: (currentUser.xp || 0) + 10,
    });
  };

  const handleUserUpdate = async (updates: Partial<LunaUser>) => {
    await updateUser(updates);
  };

  const handleLanguageToggle = () => {
    setLanguage(prev => (prev === 'it' ? 'en' : 'it'));
  };

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
        <Header variant="public" language={language} onLanguageToggle={handleLanguageToggle} />
        <main className="main-content">
          <Auth language={language} />
        </main>
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
      />

      <main className="main-content">
        {activeTab === 'path' && (
          <LearningPath
            language={language}
            completedUnits={currentUser.completedUnits}
            onCompleteUnit={handleCompleteUnit}
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
