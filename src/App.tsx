import { useState } from 'react';
import { Layers, User, Calendar, GraduationCap, Globe, MessageCircle, LayoutDashboard, Shield } from 'lucide-react';
import { LearningPath } from './components/LearningPath';
import { Flashcards } from './components/Flashcards';
import { TeacherProfile } from './components/TeacherProfile';
import { BookingCalendar } from './components/BookingCalendar';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminPanel } from './components/AdminPanel';
import { Auth } from './components/Auth';
import { AITutor } from './components/AITutor';
import { useAuth } from './contexts/AuthContext';
import { isAdminRole, roleLabel } from './types/user';
import type { LunaUser } from './types/user';

type TabType = 'path' | 'flashcards' | 'teacher' | 'booking' | 'dashboard' | 'tutor' | 'admin';
type LanguageType = 'en' | 'it';

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
        <header className="main-header">
          <div className="header-content">
            <div className="logo-container">
              <div className="logo-circle">月</div>
              <div className="logo-text">Luna Nihongo</div>
            </div>
            <button
              onClick={handleLanguageToggle}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.8rem', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Globe size={16} />
              <span>{language === 'it' ? '🇮🇹 ITA' : '🇬🇧 ENG'}</span>
            </button>
          </div>
        </header>
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

      <header className="main-header">
        <div className="header-content">
          <div className="logo-container">
            <div className="logo-circle">月</div>
            <div className="logo-text">Luna Nihongo</div>
          </div>

          <nav className="main-nav">
            <button
              onClick={() => setActiveTab('path')}
              className={`nav-link ${activeTab === 'path' ? 'active' : ''}`}
            >
              <GraduationCap size={18} />
              <span>{language === 'en' ? 'Study' : 'Studio'}</span>
            </button>

            <button
              onClick={() => setActiveTab('flashcards')}
              className={`nav-link ${activeTab === 'flashcards' ? 'active' : ''}`}
            >
              <Layers size={18} />
              <span>{language === 'en' ? 'Decks' : 'Deck'}</span>
            </button>

            <button
              onClick={() => setActiveTab('tutor')}
              className={`nav-link ${activeTab === 'tutor' ? 'active' : ''}`}
            >
              <MessageCircle size={18} />
              <span>{language === 'en' ? 'AI Tutor' : 'Tutor AI'}</span>
            </button>

            <button
              onClick={() => setActiveTab('teacher')}
              className={`nav-link ${activeTab === 'teacher' ? 'active' : ''}`}
            >
              <User size={18} />
              <span>Luna</span>
            </button>

            <button
              onClick={() => setActiveTab('booking')}
              className={`nav-link ${activeTab === 'booking' ? 'active' : ''}`}
            >
              <Calendar size={18} />
              <span>{language === 'en' ? 'Book' : 'Prenota'}</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>{language === 'en' ? 'Profile' : 'Profilo'}</span>
            </button>

            {isAdminRole(currentUser.role) && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`nav-link ${activeTab === 'admin' ? 'active' : ''}`}
              >
                <Shield size={18} />
                <span>Admin</span>
              </button>
            )}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {isAdminRole(currentUser.role) && (
              <div style={{
                fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '10px',
                backgroundColor: 'rgba(231, 76, 60, 0.12)',
                color: 'var(--primary)',
                display: 'flex', alignItems: 'center', gap: '0.25rem',
              }}>
                <Shield size={12} />
                {roleLabel(currentUser.role, language)}
              </div>
            )}
            <div style={{
              fontSize: '0.78rem', fontWeight: 600, padding: '3px 10px', borderRadius: '10px',
              backgroundColor: currentUser.tier === 'premium' ? 'rgba(155,89,182,0.15)' : 'var(--primary-glow)',
              color: currentUser.tier === 'premium' ? 'var(--secondary)' : 'var(--primary)',
            }}>
              {currentUser.username}
            </div>
            <button
              onClick={handleLanguageToggle}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.8rem', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Globe size={16} />
              <span>{language === 'it' ? '🇮🇹 ITA' : '🇬🇧 ENG'}</span>
            </button>
          </div>
        </div>
      </header>

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
