import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send, Bot, User, Crown, ChevronRight, Volume2, MessageCircle, MessagesSquare, Mic, Radio,
} from 'lucide-react';
import type { ChatMessage, LunaUser } from '../types/user';
import { canUseAiTutor } from '../types/user';
import { trimChatHistory } from '../utils/chatHistory';
import {
  buildTutorSystemPrompt,
  conversationOpener,
  type TutorMode,
} from '../services/tutorContext';
import { fetchTutorReply } from '../services/tutorService';
import { LunaLive } from './LunaLive';
import { LunaLogo } from './LunaLogo';
import { TutorSidebar } from './TutorSidebar';
import { LiveHistoryPanel } from './LiveHistoryPanel';
import { PremiumRetentionNotice } from './PremiumRetentionNotice';
import { PremiumUpgradeButton } from './PremiumUpgradeButton';
import { TutorContextSheet } from './TutorContextSheet';
import {
  TutorContextToolbar,
  tutorSheetTitle,
  type TutorContextSheetId,
} from './TutorContextToolbar';
import {
  TutorMemoryPanel,
  TutorPlanPanel,
  TutorProfilePanel,
  TutorProgressPanel,
} from './tutorContextPanels';
import { useAuth } from '../contexts/AuthContext';
import { extractJapaneseForSpeech, speakJapaneseText, stopJapaneseSpeech } from '../services/ttsService';
import { listStudyActivity } from '../services/studyActivityService';
import type { StudyActivity } from '../types/study';
import {
  buildAutoMemoryLines,
  resolveStudyProfile,
  studyProfileToLegacyMemory,
} from '../services/lunaMemoryService';

interface AITutorProps {
  language: 'en' | 'it';
  currentUser: LunaUser;
  onUserUpdate: (updates: Partial<LunaUser>) => Promise<void>;
  onNavigateToDashboard: () => void;
  onTutorMessage?: (label: string) => void;
  onLiveSession?: (durationSeconds: number) => void;
}

// Smart local fallback (used when PHP proxy is unavailable in dev)
const FALLBACK_RESPONSES_EN = [
  "こんにちは！That's a great question! In Japanese, context is everything. Keep practicing!",
  "Great progress! Remember: Hiragana first, then Katakana, then Kanji. One step at a time.",
  "Pronunciation tip: Japanese vowels are always short and pure. Try listening and repeating!",
  "I remember you've been studying hard. Why not review your completed lessons with the flashcards?",
  "がんばって！(Ganbatte!) Keep going! Consistency is the secret to learning Japanese.",
  "A common mistake: don't confuse は (wa) as a topic marker with its written form 'ha'. It's always read 'wa' in a sentence!",
  "Did you know? Japanese has no plural forms! 猫 (neko) means both 'cat' and 'cats'. Simpler, right?",
];

const FALLBACK_RESPONSES_IT = [
  "こんにちは！Ottima domanda! In giapponese, il contesto è tutto. Continua ad esercitarti!",
  "Ottimi progressi! Ricorda: prima Hiragana, poi Katakana, poi Kanji. Un passo alla volta.",
  "Consiglio sulla pronuncia: le vocali giapponesi sono sempre brevi e pure. Prova ad ascoltare e ripetere!",
  "Ricordo che stai studiando sodo. Perché non rivedi le lezioni completate con le flashcard?",
  "がんばって！(Ganbatte!) Continua così! La costanza è il segreto per imparare il giapponese.",
  "Un errore comune: non confondere は (wa) come marcatore di argomento con la sua forma scritta 'ha'. Si legge sempre 'wa' nella frase!",
  "Lo sapevi? Il giapponese non ha il plurale! 猫 (neko) significa sia 'gatto' che 'gatti'. Più semplice, vero?",
];

let fallbackIndex = 0;

export const AITutor: React.FC<AITutorProps> = ({
  language,
  currentUser,
  onUserUpdate,
  onNavigateToDashboard,
  onTutorMessage,
  onLiveSession,
}) => {
  const { refreshUser } = useAuth();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(currentUser.chatHistory || []);
  const [isLoading, setIsLoading] = useState(false);
  const initialProfile = resolveStudyProfile(currentUser);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [studyGoal, setStudyGoal] = useState(initialProfile.studyGoal);
  const [studyWeaknesses, setStudyWeaknesses] = useState(initialProfile.studyWeaknesses);
  const [studyPreferences, setStudyPreferences] = useState(initialProfile.studyPreferences);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [studyActivities, setStudyActivities] = useState<StudyActivity[]>([]);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [tutorMode, setTutorMode] = useState<TutorMode>('conversation');
  const [tutorView, setTutorView] = useState<'chat' | 'live'>('live');
  const [activeSheet, setActiveSheet] = useState<TutorContextSheetId | null>(null);
  const [liveSessionActive, setLiveSessionActive] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const hasAccess = canUseAiTutor(currentUser);
  const isBlocked = !hasAccess;
  const msgCount = currentUser.messagesCount || 0;

  const saveUser = async (updates: Partial<LunaUser>) => {
    try {
      setSaveError(null);
      const payload = { ...updates };
      if (payload.chatHistory) {
        payload.chatHistory = trimChatHistory(
          payload.chatHistory.map((msg) => ({
            ...msg,
            source: msg.source ?? (msg.sessionDivider || msg.liveSessionId ? 'live' : 'chat'),
            createdAt: msg.createdAt ?? new Date().toISOString(),
          })),
        );
      }
      await onUserUpdate(payload);
    } catch (err) {
      console.error('Failed to save tutor state', err);
      setSaveError(
        language === 'en'
          ? 'Could not save conversation. Check your connection and try again.'
          : 'Impossibile salvare la conversazione. Controlla la connessione e riprova.',
      );
    }
  };

  const speakReply = async (text: string, index?: number) => {
    const toSpeak = extractJapaneseForSpeech(text);
    if (!toSpeak.trim()) return;
    if (index !== undefined) setSpeakingIndex(index);
    setTtsError(null);
    const result = await speakJapaneseText(toSpeak, language);
    setSpeakingIndex(null);
    if ('error' in result) {
      setTtsError(
        language === 'en'
          ? `Voice unavailable: ${result.detail ?? result.error}`
          : `Voce non disponibile: ${result.detail ?? result.error}`
      );
    }
  };

  const seedConversation = useCallback(() => {
    const opener: ChatMessage = {
      role: 'assistant',
      content: conversationOpener(currentUser.username, language),
      source: 'chat',
      createdAt: new Date().toISOString(),
    };
    setMessages([opener]);
    void saveUser({ chatHistory: [opener] });
  }, [currentUser.username, language]);

  const switchTutorMode = (mode: TutorMode) => {
    setTutorMode(mode);
    if (mode === 'conversation' && messages.length === 0) {
      seedConversation();
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    setMessages(currentUser.chatHistory || []);
  }, [currentUser.chatHistory]);

  useEffect(() => {
    void listStudyActivity(currentUser.id, 20)
      .then(setStudyActivities)
      .catch(() => setStudyActivities([]));
  }, [currentUser.id]);

  useEffect(() => {
    const profile = resolveStudyProfile(currentUser);
    setStudyGoal(profile.studyGoal);
    setStudyWeaknesses(profile.studyWeaknesses);
    setStudyPreferences(profile.studyPreferences);
  }, [currentUser.studyGoal, currentUser.studyWeaknesses, currentUser.studyPreferences, currentUser.memory]);

  const autoMemoryLines = useMemo(
    () => buildAutoMemoryLines(currentUser, language, studyActivities),
    [currentUser, language, studyActivities],
  );

  const saveStudyProfile = async () => {
    setIsEditingProfile(false);
    const profile = { studyGoal, studyWeaknesses, studyPreferences };
    await saveUser({
      studyGoal,
      studyWeaknesses,
      studyPreferences,
      memory: studyProfileToLegacyMemory(profile),
    });
  };

  const sidebarProps = {
    language,
    currentUser,
    autoMemoryLines,
    studyGoal,
    studyWeaknesses,
    studyPreferences,
    isEditingProfile,
    onStudyGoalChange: setStudyGoal,
    onStudyWeaknessesChange: setStudyWeaknesses,
    onStudyPreferencesChange: setStudyPreferences,
    onToggleEditProfile: () => setIsEditingProfile(!isEditingProfile),
    onSaveProfile: () => void saveStudyProfile(),
    onNavigateToDashboard,
  };

  const profilePanelProps = {
    language,
    currentUser,
    studyGoal,
    studyWeaknesses,
    studyPreferences,
    isEditingProfile,
    onStudyGoalChange: setStudyGoal,
    onStudyWeaknessesChange: setStudyWeaknesses,
    onStudyPreferencesChange: setStudyPreferences,
    onToggleEditProfile: () => setIsEditingProfile(!isEditingProfile),
    onSaveProfile: () => void saveStudyProfile(),
    onNavigateToDashboard,
  };

  const profileIncomplete = !studyGoal.trim() || !studyWeaknesses.trim();

  const toggleSheet = (id: TutorContextSheetId) => {
    if (id === 'profile' && activeSheet !== id && profileIncomplete) {
      setIsEditingProfile(true);
    }
    setActiveSheet((prev) => (prev === id ? null : id));
  };

  const renderSheetPanel = () => {
    if (!activeSheet) return null;
    switch (activeSheet) {
      case 'memory':
        return (
          <TutorMemoryPanel
            language={language}
            currentUser={currentUser}
            autoMemoryLines={autoMemoryLines}
          />
        );
      case 'profile':
        return <TutorProfilePanel {...profilePanelProps} />;
      case 'plan':
        return <TutorPlanPanel language={language} currentUser={currentUser} />;
      case 'progress':
        return <TutorProgressPanel language={language} currentUser={currentUser} />;
      case 'history':
        return (
          <>
            <LiveHistoryPanel
              language={language}
              currentUser={currentUser}
              chatHistory={currentUser.chatHistory ?? []}
              onChatHistoryChange={(history) => {
                void onUserUpdate({ chatHistory: history });
              }}
              onNavigateToDashboard={onNavigateToDashboard}
            />
            <PremiumRetentionNotice language={language} currentUser={currentUser} />
          </>
        );
      default:
        return null;
    }
  };

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || isLoading || isBlocked) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      source: 'chat',
      createdAt: new Date().toISOString(),
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!textOverride) setInput('');
    setIsLoading(true);

    const newCount = msgCount + 1;
    const systemPrompt = buildTutorSystemPrompt(currentUser, language, tutorMode, studyActivities);

    let replyText: string;

    try {
      const messagesForApi = newMessages.filter((m) => !m.sessionDivider);
      replyText = await fetchTutorReply(systemPrompt, messagesForApi, tutorMode);
      if (!replyText) throw new Error('Empty reply');
    } catch {
      const pool = language === 'it' ? FALLBACK_RESPONSES_IT : FALLBACK_RESPONSES_EN;
      replyText = pool[fallbackIndex % pool.length];
      fallbackIndex++;
      replyText = replyText.replace('you', currentUser.username);
    }

    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: replyText,
      source: 'chat',
      createdAt: new Date().toISOString(),
    };
    const finalMessages = [...newMessages, assistantMsg];
    setMessages(finalMessages);
    setIsLoading(false);

    onTutorMessage?.(text.slice(0, 80));

    await saveUser({
      messagesCount: newCount,
      chatHistory: finalMessages,
    });
  };

  const handleMicDictation = () => {
    type RecognitionCtor = new () => {
      lang: string;
      interimResults: boolean;
      onresult: ((event: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
      onerror: (() => void) | null;
      start: () => void;
    };
    const win = window as Window & {
      SpeechRecognition?: RecognitionCtor;
      webkitSpeechRecognition?: RecognitionCtor;
    };
    const Recognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Recognition) {
      alert(language === 'en' ? 'Use Chrome or Safari for the mic.' : 'Usa Chrome o Safari per il microfono.');
      return;
    }
    stopJapaneseSpeech();
    const recognition = new Recognition();
    recognition.lang = language === 'it' ? 'it-IT' : 'en-US';
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    recognition.start();
  };

  useEffect(() => {
    if ((currentUser.chatHistory?.length ?? 0) === 0 && tutorMode === 'conversation') {
      seedConversation();
    }
  }, []);

  return (
    <div
      className={`tutor-layout page-view${liveSessionActive && tutorView === 'live' ? ' tutor-layout--live-focus' : ''}`}
    >
      <div className="tutor-shell">
        <div className="tutor-view-tabs">
          <button
            type="button"
            className={`tutor-view-tab ${tutorView === 'live' ? 'active' : ''}`}
            onClick={() => {
              setTutorView('live');
              setActiveSheet(null);
            }}
          >
            <Radio size={16} />
            {language === 'en' ? 'Live voice' : 'Voce live'}
          </button>
          <button
            type="button"
            className={`tutor-view-tab ${tutorView === 'chat' ? 'active' : ''}`}
            onClick={() => {
              setTutorView('chat');
              setActiveSheet(null);
            }}
          >
            <MessageCircle size={16} />
            {language === 'en' ? 'Text chat' : 'Chat testuale'}
          </button>
        </div>

        <TutorContextToolbar
          language={language}
          showHistory={tutorView === 'live'}
          profileIncomplete={profileIncomplete}
          activeSheet={activeSheet}
          onOpen={toggleSheet}
        />

        <TutorContextSheet
          open={activeSheet !== null}
          title={activeSheet ? tutorSheetTitle(activeSheet, language) : ''}
          language={language}
          onClose={() => setActiveSheet(null)}
        >
          {renderSheetPanel()}
        </TutorContextSheet>

        <div className="tutor-content">
          {tutorView === 'live' ? (
            <div className="tutor-chat-wrap tutor-chat-wrap--live">
              <TutorSidebar {...sidebarProps}>
                <LiveHistoryPanel
                  language={language}
                  currentUser={currentUser}
                  chatHistory={currentUser.chatHistory ?? []}
                  onChatHistoryChange={(history) => {
                    void onUserUpdate({ chatHistory: history });
                  }}
                  onNavigateToDashboard={onNavigateToDashboard}
                />
                <PremiumRetentionNotice language={language} currentUser={currentUser} />
              </TutorSidebar>
              <div className="tutor-live-main glass-panel">
                <LunaLive
                  language={language}
                  currentUser={currentUser}
                  onNavigateToDashboard={onNavigateToDashboard}
                  onSessionActiveChange={setLiveSessionActive}
                  onSessionLogged={(label, meta) => {
                    onTutorMessage?.(label);
                    const secs = meta?.durationSeconds;
                    if (typeof secs === 'number') onLiveSession?.(secs);
                  }}
                  onSessionSaved={(chatHistory) => {
                    if (chatHistory?.length) {
                      void onUserUpdate({ chatHistory });
                    } else {
                      void refreshUser();
                    }
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="tutor-chat-wrap tutor-chat-wrap--text">
      <TutorSidebar {...sidebarProps} />

      {/* ── Right Panel: Chat ── */}
      <div className="glass-panel tutor-chat-panel">
        {/* Chat Header */}
        <div className="tutor-chat-header">
          <LunaLogo layout="icon" className="luna-logo--icon-sm" alt="" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Luna-sensei</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                backgroundColor: 'var(--success)', display: 'inline-block'
              }} />
              {language === 'en' ? 'Online • Text chat' : 'Online • Chat testuale'}
            </div>
          </div>
          {isBlocked && (
            <div className="tutor-chat-limit-badge">
              {language === 'en' ? 'Limit reached' : 'Limite raggiunto'}
            </div>
          )}
        </div>

        <div className="tutor-mode-bar">
          <button
            type="button"
            className={`tutor-mode-tab ${tutorMode === 'conversation' ? 'active' : ''}`}
            onClick={() => switchTutorMode('conversation')}
          >
            <MessagesSquare size={16} />
            {language === 'en' ? 'Conversation' : 'Conversazione'}
          </button>
          <button
            type="button"
            className={`tutor-mode-tab ${tutorMode === 'qa' ? 'active' : ''}`}
            onClick={() => switchTutorMode('qa')}
          >
            <MessageCircle size={16} />
            {language === 'en' ? 'Q&A' : 'Domande'}
          </button>
          {tutorMode === 'conversation' && (
            <button
              type="button"
              className="tutor-new-session"
              onClick={() => seedConversation()}
            >
              {language === 'en' ? 'New topic' : 'Nuovo argomento'}
            </button>
          )}
        </div>

        {ttsError && (
          <p className="tutor-tts-error">{ttsError}</p>
        )}
        {saveError && (
          <p className="tutor-tts-error">{saveError}</p>
        )}

        {/* Messages list */}
        <div className="tutor-messages">
          {messages.filter((m) => !m.sessionDivider && m.source !== 'live').length === 0 && tutorMode === 'qa' && (
            <div className="tutor-empty-hint">
              <Bot size={30} style={{ color: 'var(--primary)' }} />
              <p>
                {language === 'en'
                  ? `Hi ${currentUser.username}! Ask about any lesson, grammar, or vocab from the full N5 path.`
                  : `Ciao ${currentUser.username}! Chiedi di lezioni, grammatica o vocaboli da tutto il percorso N5.`}
              </p>
            </div>
          )}

          {messages
            .filter((m) => !m.sessionDivider && m.source !== 'live')
            .map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              gap: '0.6rem',
              alignItems: 'flex-start'
            }}>
              {msg.role === 'assistant' && (
                <LunaLogo layout="icon" className="luna-logo--icon-xs" alt="" />
              )}
              <div className="tutor-msg-bubble-wrap" style={{ maxWidth: '75%' }}>
                <div
                  className={`tutor-msg-bubble ${msg.role === 'user' ? 'tutor-msg-bubble--user' : 'tutor-msg-bubble--assistant'}`}
                >
                  {msg.content}
                  {msg.source === 'live' && (
                    <span className="tutor-msg-live-badge">
                      {language === 'en' ? 'live' : 'live'}
                    </span>
                  )}
                  {msg.role === 'assistant' && !msg.sessionDivider && (
                    <button
                      type="button"
                      className="tutor-msg-listen-btn"
                      onClick={() => void speakReply(msg.content, i)}
                      disabled={speakingIndex === i}
                      title={language === 'en' ? 'Listen to Japanese' : 'Ascolta il giapponese'}
                      aria-label={language === 'en' ? 'Listen to Japanese' : 'Ascolta il giapponese'}
                    >
                      <Volume2 size={15} />
                    </button>
                  )}
                </div>
              </div>
              {msg.role === 'user' && (
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                  background: 'var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <User size={18} style={{ color: 'var(--text-muted)' }} />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <LunaLogo layout="icon" className="luna-logo--icon-xs" alt="" />
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '18px 18px 18px 4px',
                backgroundColor: 'var(--bg-input)',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    backgroundColor: 'var(--primary)',
                    display: 'inline-block',
                    animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out`
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input bar */}
        <div className="tutor-chat-input">
          {isBlocked ? (
            <div style={{
              padding: '1rem',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(155,89,182,0.1), rgba(155,89,182,0.03))',
              border: '1px solid rgba(155,89,182,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <Crown size={24} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                  {language === 'en' ? 'AI tutor requires Premium or trial' : 'Il tutor AI richiede Premium o prova'}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {language === 'en'
                    ? 'Start your 7-day free trial or subscribe to chat with Luna and use Luna Live.'
                    : 'Inizia la prova gratuita di 7 giorni o abbonati per chattare con Luna e usare Luna Live.'}
                </p>
              </div>
              <button
                className="btn btn-primary"
                style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', whiteSpace: 'nowrap', display: 'flex', gap: '0.4rem' }}
                onClick={onNavigateToDashboard}
              >
                <Crown size={15} />
                <span>{language === 'en' ? 'Upgrade' : 'Passa a Premium'}</span>
                <ChevronRight size={15} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-end' }}>
              {tutorMode === 'conversation' && (
                <button
                  type="button"
                  className="btn btn-secondary tutor-mic-btn"
                  onClick={handleMicDictation}
                  title={language === 'en' ? 'Speak your reply' : 'Parla la tua risposta'}
                  disabled={isLoading}
                >
                  <Mic size={18} />
                </button>
              )}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder={
                  tutorMode === 'conversation'
                    ? (language === 'en'
                      ? 'Reply to Luna… (Enter to send)'
                      : 'Rispondi a Luna… (Invio per inviare)')
                    : (language === 'en'
                      ? 'Ask about any lesson… (Enter to send)'
                      : 'Chiedi su una lezione… (Invio per inviare)')
                }
                rows={2}
                style={{
                  flex: 1,
                  padding: '0.8rem 1rem',
                  borderRadius: '14px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  resize: 'none',
                  lineHeight: '1.4',
                  fontFamily: 'var(--font-body)'
                }}
              />
              <button
                className="btn btn-primary"
                onClick={() => void sendMessage()}
                disabled={!input.trim() || isLoading}
                style={{
                  padding: '0.9rem',
                  borderRadius: '50%',
                  aspectRatio: '1',
                  opacity: !input.trim() || isLoading ? 0.5 : 1
                }}
              >
                <Send size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
            </div>
          )}
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '420px', width: '100%', padding: '2.5rem 2rem', textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              width: '70px', height: '70px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '2rem', marginBottom: '1rem'
            }}>
              <Crown size={36} />
            </div>
            <h2 style={{ marginBottom: '0.5rem' }}>
              {language === 'en' ? 'Unlock Premium' : 'Sblocca Premium'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {language === 'en'
                ? 'Your trial has ended or you are on the free plan. Subscribe for AI chat, Luna Live (2 h/week), memory, and 2 monthly lessons with Luna.'
                : 'La prova è terminata o sei sul piano free. Abbonati per chat AI, Luna Live (2 h/settimana), memoria e 2 lezioni mensili con Luna.'}
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column', alignItems: 'stretch' }}>
              <PremiumUpgradeButton
                language={language}
                style={{ width: '100%' }}
                label={language === 'en' ? 'Upgrade to Premium' : 'Passa a Premium'}
              />
              <button
                style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}
                onClick={() => setShowUpgradeModal(false)}
              >
                {language === 'en' ? 'Maybe later' : 'Forse più tardi'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
};
