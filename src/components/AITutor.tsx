import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Bot, User, Zap, Crown, Brain, Lock, ChevronRight, Volume2, VolumeX,
} from 'lucide-react';
import type { ChatMessage, LunaUser } from '../types/user';
import { FREE_TUTOR_TURN_LIMIT } from '../types/user';
import { extractJapaneseForSpeech, speakJapaneseText } from '../services/ttsService';

interface AITutorProps {
  language: 'en' | 'it';
  currentUser: LunaUser;
  onUserUpdate: (updates: Partial<LunaUser>) => Promise<void>;
  onNavigateToDashboard: () => void;
  onTutorMessage?: (label: string) => void;
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

function buildSystemPrompt(user: LunaUser, language: string): string {
  const levelText = user.completedUnits.length === 0 ? 'a complete beginner' :
    user.completedUnits.length <= 3 ? 'an early beginner' : 'an intermediate student';

  return `You are Luna-sensei, a warm, encouraging, and knowledgeable Japanese language tutor on the Luna Nihongo learning platform.
Your student's name is: ${user.username}
Student's level: ${levelText} (completed ${user.completedUnits.length} lesson units, ${user.xp} XP)
Completed units: ${user.completedUnits.join(', ') || 'none yet'}
Student memory notes: ${user.memory}
Response language: ${language === 'it' ? 'Italian (with Japanese examples in romaji when helpful)' : 'English (with Japanese examples in romaji when helpful)'}
Keep responses concise (2-4 sentences), friendly, and educational. Occasionally use Japanese words/phrases with translations. Reference their progress and memory when relevant. Always end with an encouraging note or a small challenge.`;
}

export const AITutor: React.FC<AITutorProps> = ({
  language,
  currentUser,
  onUserUpdate,
  onNavigateToDashboard,
  onTutorMessage,
}) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(currentUser.chatHistory || []);
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [memoryText, setMemoryText] = useState(currentUser.memory);
  const [isEditingMemory, setIsEditingMemory] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(currentUser.tutorVoiceEnabled);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isFree = currentUser.tier === 'free';
  const msgCount = currentUser.messagesCount || 0;
  const remaining = FREE_TUTOR_TURN_LIMIT - msgCount;
  const isBlocked = isFree && msgCount >= FREE_TUTOR_TURN_LIMIT;

  const speakReply = async (text: string, index?: number) => {
    const toSpeak = extractJapaneseForSpeech(text);
    if (index !== undefined) setSpeakingIndex(index);
    await speakJapaneseText(toSpeak);
    setSpeakingIndex(null);
  };

  const toggleVoice = async () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    await onUserUpdate({ tutorVoiceEnabled: next });
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const saveUser = async (updates: Partial<LunaUser>) => {
    await onUserUpdate(updates);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading || isBlocked) return;

    if (isFree && msgCount >= FREE_TUTOR_TURN_LIMIT) {
      setShowUpgradeModal(true);
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const newCount = msgCount + 1;

    let replyText = '';

    try {
      // Try PHP proxy endpoint (works on Hostinger)
      const response = await fetch('/api/tutor.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: buildSystemPrompt(currentUser, language),
          messages: newMessages,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        replyText = data.reply || (language === 'it'
          ? 'Mi dispiace, non ho ricevuto risposta. Riprova!'
          : "Sorry, I didn't get a response. Please try again!");
      } else {
        throw new Error('PHP proxy not available');
      }
    } catch {
      // Fallback to local simulator in development
      const pool = language === 'it' ? FALLBACK_RESPONSES_IT : FALLBACK_RESPONSES_EN;
      replyText = pool[fallbackIndex % pool.length];
      fallbackIndex++;

      // Personalize fallback
      replyText = replyText.replace('you', currentUser.username);
    }

    const assistantMsg: ChatMessage = { role: 'assistant', content: replyText };
    const finalMessages = [...newMessages, assistantMsg];
    const assistantIndex = finalMessages.length - 1;
    setMessages(finalMessages);
    setIsLoading(false);

    onTutorMessage?.(text.slice(0, 80));

    saveUser({
      messagesCount: newCount,
      chatHistory: finalMessages,
    });

    if (voiceEnabled) {
      void speakReply(replyText, assistantIndex);
    }

    if (isFree && newCount >= FREE_TUTOR_TURN_LIMIT) {
      setTimeout(() => setShowUpgradeModal(true), 800);
    }
  };

  const saveMemory = async () => {
    setIsEditingMemory(false);
    await saveUser({ memory: memoryText });
  };

  return (
    <div className="tutor-layout">

      {/* ── Left Panel: Memory & Info ── */}
      <div className="tutor-sidebar">
        {/* Tier Badge */}
        <div className="glass-panel" style={{
          padding: '1.2rem',
          background: currentUser.tier === 'premium'
            ? 'linear-gradient(135deg, rgba(155,89,182,0.12), rgba(155,89,182,0.04))'
            : 'var(--bg-panel)',
          borderColor: currentUser.tier === 'premium' ? 'rgba(155,89,182,0.3)' : 'var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {currentUser.tier === 'premium'
              ? <Crown size={18} style={{ color: 'var(--secondary)' }} />
              : <Zap size={18} style={{ color: 'var(--primary)' }} />}
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              {currentUser.tier === 'premium' ? 'Premium' : 'Free Plan'}
            </span>
          </div>
          {isFree && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: remaining > 1 ? 'var(--success)' : 'var(--error)' }}>
                {Math.max(0, remaining)}
              </strong>
              {' '}{language === 'en' ? 'Q&A turns left (free)' : 'turni Q&A rimasti (free)'}
              <div style={{
                height: '4px',
                backgroundColor: 'var(--border)',
                borderRadius: '2px',
                marginTop: '0.5rem',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.max(0, (remaining / FREE_TUTOR_TURN_LIMIT)) * 100}%`,
                  backgroundColor: remaining > 2 ? 'var(--success)' : 'var(--error)',
                  borderRadius: '2px',
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>
          )}
          {currentUser.tier === 'premium' && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {language === 'en' ? 'Unlimited messages & full memory' : 'Messaggi illimitati e memoria completa'}
            </p>
          )}
        </div>

        {/* Long-term Memory Panel */}
        <div className="glass-panel" style={{ padding: '1.2rem', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
            <Brain size={16} style={{ color: 'var(--secondary)' }} />
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
              {language === 'en' ? "Luna's Memory" : 'Memoria di Luna'}
            </span>
            {currentUser.tier === 'premium' && (
              <button
                onClick={() => setIsEditingMemory(!isEditingMemory)}
                style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}
              >
                {isEditingMemory ? (language === 'en' ? 'Cancel' : 'Annulla') : (language === 'en' ? 'Edit' : 'Modifica')}
              </button>
            )}
          </div>

          {currentUser.tier === 'free' ? (
            <div style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '1.5rem 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Lock size={28} style={{ color: 'var(--border)' }} />
              <span>{language === 'en' ? 'Long-term memory available in Premium' : 'Memoria disponibile nel piano Premium'}</span>
              <button
                className="btn btn-primary"
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem', marginTop: '0.5rem' }}
                onClick={onNavigateToDashboard}
              >
                {language === 'en' ? 'Upgrade' : 'Passa a Premium'}
              </button>
            </div>
          ) : isEditingMemory ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <textarea
                value={memoryText}
                onChange={(e) => setMemoryText(e.target.value)}
                rows={6}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '0.8rem',
                  resize: 'vertical',
                  fontFamily: 'var(--font-body)'
                }}
              />
              <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem' }} onClick={saveMemory}>
                {language === 'en' ? 'Save' : 'Salva'}
              </button>
            </div>
          ) : (
            <p style={{
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap'
            }}>
              {currentUser.memory || (language === 'en' ? 'No notes yet. Start chatting!' : 'Nessuna nota. Inizia a chattare!')}
            </p>
          )}
        </div>

        {/* Student stats */}
        <div className="glass-panel" style={{ padding: '1.2rem' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.6rem' }}>
            {language === 'en' ? 'Your Progress' : 'I tuoi Progressi'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span>✅ {language === 'en' ? 'Lessons' : 'Lezioni'}</span>
            <strong>{currentUser.completedUnits.length}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginTop: '0.3rem' }}>
            <span>⚡ XP</span>
            <strong>{currentUser.xp}</strong>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Chat ── */}
      <div className="glass-panel" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: 0,
      }}>
        {/* Chat Header */}
        <div style={{
          padding: '1.2rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.8rem',
          background: 'var(--bg-panel)',
          backdropFilter: 'blur(12px)'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.3rem',
            fontWeight: '700'
          }}>月</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Luna-sensei</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                backgroundColor: 'var(--success)', display: 'inline-block'
              }} />
              {language === 'en' ? 'Online • Text & voice' : 'Online • Testo e voce'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void toggleVoice()}
            className="btn btn-secondary"
            style={{
              marginLeft: 'auto',
              padding: '0.45rem 0.75rem',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
            title={language === 'en' ? 'Toggle voice replies' : 'Attiva/disattiva voce'}
          >
            {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {voiceEnabled
              ? (language === 'en' ? 'Voice on' : 'Voce attiva')
              : (language === 'en' ? 'Voice off' : 'Voce spenta')}
          </button>
          {isBlocked && (
            <div style={{
              fontSize: '0.78rem',
              color: 'var(--error)',
              fontWeight: 600,
              backgroundColor: 'var(--error-glow)',
              padding: '4px 10px',
              borderRadius: '12px'
            }}>
              {language === 'en' ? 'Limit reached' : 'Limite raggiunto'}
            </div>
          )}
        </div>

        {/* Messages list */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {messages.length === 0 && (
            <div style={{
              textAlign: 'center',
              color: 'var(--text-muted)',
              marginTop: '3rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'var(--primary-glow)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Bot size={30} style={{ color: 'var(--primary)' }} />
              </div>
              <p style={{ fontSize: '0.95rem' }}>
                {language === 'en'
                  ? `こんにちは、${currentUser.username}さん！ I'm Luna-sensei. Ask me anything about Japanese!`
                  : `こんにちは、${currentUser.username}さん！ Sono Luna-sensei. Chiedi pure qualsiasi cosa sul giapponese!`}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              gap: '0.6rem',
              alignItems: 'flex-start'
            }}>
              {msg.role === 'assistant' && (
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '0.9rem', fontWeight: '700'
                }}>月</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '0.35rem', maxWidth: '75%' }}>
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  backgroundColor: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-input)',
                  color: msg.role === 'user' ? 'white' : 'var(--text-main)',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}>
                  {msg.content}
                </div>
                {msg.role === 'assistant' && (
                  <button
                    type="button"
                    onClick={() => void speakReply(msg.content, i)}
                    disabled={speakingIndex === i}
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '2px 6px',
                    }}
                  >
                    <Volume2 size={14} />
                    {speakingIndex === i
                      ? (language === 'en' ? 'Playing…' : 'Riproduzione…')
                      : (language === 'en' ? 'Listen' : 'Ascolta')}
                  </button>
                )}
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
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '0.9rem', fontWeight: '700'
              }}>月</div>
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
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-panel)'
        }}>
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
                  {language === 'en' ? "You've reached the Free limit" : 'Hai raggiunto il limite gratuito'}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {language === 'en'
                    ? 'Upgrade to Premium for unlimited conversations and AI memory.'
                    : 'Passa a Premium per conversazioni illimitate e memoria AI.'}
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
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={language === 'en'
                  ? 'Ask Luna-sensei anything… (Enter to send, Shift+Enter for new line)'
                  : 'Chiedi qualcosa a Luna-sensei… (Invio per inviare)'}
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
                onClick={sendMessage}
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
            background: 'var(--bg-app)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
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
                ? `You've used all ${FREE_TUTOR_TURN_LIMIT} free Q&A turns. Upgrade to Premium for unlimited conversations, voice, and long-term AI memory.`
                : `Hai usato tutti i ${FREE_TUTOR_TURN_LIMIT} turni Q&A gratuiti. Passa a Premium per conversazioni illimitate, voce e memoria AI.`}
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
              <button
                className="btn btn-primary"
                style={{ width: '100%', display: 'flex', gap: '0.5rem' }}
                onClick={() => { setShowUpgradeModal(false); onNavigateToDashboard(); }}
              >
                <Crown size={18} />
                {language === 'en' ? 'Upgrade to Premium' : 'Passa a Premium'}
              </button>
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
