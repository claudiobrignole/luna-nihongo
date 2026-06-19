import { CURRICULUM_META } from '../data/curriculum';
import { AI_MINUTES_WEEKLY, TRIAL_DAYS } from '../types/user';
import lunaStudy from '../assets/brand/luna-study.webp';
import lunaFlash from '../assets/brand/luna-flash.webp';
import lunaTalk from '../assets/brand/luna-talk.webp';
import lunaTorii from '../assets/brand/luna-torii.webp';

export type LandingBadgeKind = 'free' | 'trial' | 'live' | 'otaku';
export type LandingBandVariant = 'washi' | 'yellow' | 'purple' | 'sakura' | 'ink';

export interface LandingSectionCopy {
  id: string;
  index: string;
  titleJa: string;
  verticalJa: { it: string; en: string };
  watermark: string;
  variant: LandingBandVariant;
  image: string;
  imageRight?: string;
  imagePlaceholder?: boolean;
  imageAlt: { it: string; en: string };
  badge?: { kind: LandingBadgeKind; it: string; en: string };
  lead: { it: string; en: string };
  bullets: { it: string[]; en: string[] };
  subInk?: boolean;
}

const unitCount = CURRICULUM_META.unitCount;
const aiHours = AI_MINUTES_WEEKLY / 60;

export const LANDING_SECTIONS: LandingSectionCopy[] = [
  {
    id: 'study',
    index: '01.STUDY',
    titleJa: 'まなぶ — ガイドつきの道',
    verticalJa: { it: 'もっと見る', en: 'もっと見る' },
    watermark: 'S',
    variant: 'washi',
    image: lunaStudy,
    imageAlt: {
      it: 'Luna studia su un tablet, in stile manga',
      en: 'Luna studies on a tablet, manga style',
    },
    badge: { kind: 'free', it: '無料 · GRATIS', en: '無料 · FREE' },
    lead: {
      it: `Percorso guidato da zero al JLPT N4: ogni passo ha senso, con audio nativo e quiz che ti dicono se hai capito.`,
      en: `A guided path from zero to JLPT N4 — every step builds on the last, with native audio and quizzes that check your understanding.`,
    },
    bullets: {
      it: [
        `${unitCount} unità — hiragana, katakana, kanji (ordine tratti), grammatica, dialoghi e situazioni reali`,
        'Traccia N5 completa, poi espansione N4 — obiettivi JLPT nel percorso',
        'Gratuito con registrazione; scegli il livello di partenza e i progressi si salvano',
      ],
      en: [
        `${unitCount} units — hiragana, katakana, kanji (stroke order), grammar, dialogues and real-life situations`,
        'Full N5 track, then N4 expansion — JLPT goals built into the path',
        'Free with registration; pick your start level and progress is saved',
      ],
    },
  },
  {
    id: 'flashcards',
    index: '02.FLASHCARDS',
    titleJa: 'くりかえす — SRSデッキ',
    verticalJa: { it: 'もっと見る', en: 'もっと見る' },
    watermark: 'F',
    variant: 'yellow',
    image: lunaFlash,
    imageRight: '8%',
    imageAlt: {
      it: 'Luna mostra le flashcard あ e 水, in stile manga',
      en: 'Luna holds up あ and 水 flashcards, manga style',
    },
    badge: { kind: 'free', it: '無料 · GRATIS', en: '無料 · FREE' },
    lead: {
      it: 'Il ripasso che non ti fa dimenticare: algoritmo SRS su tutte le carte del percorso.',
      en: 'The review that sticks: spaced repetition across every card in the path.',
    },
    bullets: {
      it: [
        'Filtra per livello JLPT (N5 / N4) e tipo — kanji, vocabolario, grammatica',
        'Ripassa solo ciò che scegli tu, quando vuoi',
        'Sincronizzato con ciò che studi in Studio — zero configurazione',
      ],
      en: [
        'Filter by JLPT level (N5 / N4) and type — kanji, vocabulary, grammar',
        'Review only what you choose, whenever you want',
        'Synced with your Studio progress — no setup needed',
      ],
    },
  },
  {
    id: 'talk',
    index: '03.TALK',
    titleJa: 'はなす — るな先生といつでも',
    verticalJa: { it: 'もっと見る', en: 'もっと見る' },
    watermark: 'T',
    variant: 'purple',
    image: lunaTalk,
    imageAlt: {
      it: 'Luna in kimono apre le braccia salutando, in stile manga',
      en: 'Luna in a kimono opens her arms saying hello, manga style',
    },
    badge: {
      kind: 'trial',
      it: `${TRIAL_DAYS} giorni gratis`,
      en: `${TRIAL_DAYS} days free`,
    },
    lead: {
      it: 'Luna-sensei ti conosce: chat, spiegazioni in italiano o inglese, e conversazione vocale con Luna Live.',
      en: 'Luna-sensei knows your progress: chat, explanations in Italian or English, and voice practice with Luna Live.',
    },
    bullets: {
      it: [
        'Domande su grammatica, pronuncia, compiti — risposte contestuali al tuo livello',
        `Luna Live: parli in giapponese con voce naturale (fino a ${aiHours} ore/settimana in prova e con Premium)`,
        `Prova gratuita di ${TRIAL_DAYS} giorni; Studio e flashcard restano gratis anche dopo`,
      ],
      en: [
        'Grammar, pronunciation, homework — answers tailored to your level',
        `Luna Live: speak Japanese with a natural voice (up to ${aiHours} h/week on trial and Premium)`,
        `${TRIAL_DAYS}-day free trial; Study and flashcards stay free afterwards`,
      ],
    },
  },
  {
    id: 'anime',
    index: '04.ANIME & MANGA',
    titleJa: 'るなとあにめ・まんが',
    verticalJa: { it: 'もっと見る', en: 'もっと見る' },
    watermark: 'A',
    variant: 'sakura',
    image: lunaTalk,
    imagePlaceholder: true,
    imageAlt: {
      it: 'Luna otaku di anime e manga — illustrazione in arrivo',
      en: 'Luna, anime and manga otaku — illustration coming soon',
    },
    badge: { kind: 'otaku', it: 'オタク', en: 'オタク' },
    lead: {
      it: 'Luna è una vera otaku di anime e manga — e con lei il giapponese non resta solo sui libri.',
      en: 'Luna is a true anime and manga otaku — with her, Japanese goes far beyond textbooks.',
    },
    bullets: {
      it: [
        'Chiedi il significato di una frase, di un titolo o di un meme che hai visto in un episodio',
        'Confronta il giapponese «da scuola» con quello dei dialoghi (registro, slang, onomatopee)',
        'Usa i tuoi anime e manga preferiti come ponte verso grammatica e vocabolario del percorso',
      ],
      en: [
        'Ask what a line, title or meme from an episode really means',
        'Compare textbook Japanese with dialogue register, slang and onomatopoeia',
        'Use your favourite anime and manga as a bridge to grammar and vocabulary in the path',
      ],
    },
  },
  {
    id: 'lessons',
    index: '05.LESSONS',
    titleJa: 'ライブレッスン',
    verticalJa: { it: 'もっと見る', en: 'もっと見る' },
    watermark: 'L',
    variant: 'ink',
    image: lunaTorii,
    imageAlt: {
      it: 'Luna in kimono davanti a un torii, in stile manga',
      en: 'Luna in a kimono in front of a torii gate, manga style',
    },
    badge: { kind: 'live', it: 'LIVE con るな', en: 'LIVE with るな' },
    lead: {
      it: 'Lezioni individuali online con Luna — madrelingua giapponese, spiega in italiano e inglese quando serve.',
      en: 'One-on-one online lessons with Luna — native Japanese speaker, fluent in Italian and English.',
    },
    bullets: {
      it: [
        'Videocall introduttiva di 30 min inclusa nella prova gratuita (fino a 5 partecipanti)',
        'Con Premium: 2 lezioni da 60 min al mese + tutor AI; lezioni extra on demand',
        'Prenotazione nel calendario dell\'app, link Google Meet dopo la conferma',
      ],
      en: [
        '30-minute intro videocall included in the free trial (up to 5 participants)',
        'Premium: 2 × 60-min lessons per month + AI tutor; extra lessons on demand',
        'Book from the in-app calendar; Google Meet link after confirmation',
      ],
    },
    subInk: true,
  },
];

export function studyLeadLogged(
  completed: number,
  language: 'it' | 'en',
): string {
  if (language === 'en') {
    return `You've completed ${completed} of ${unitCount} units. Every step builds on the last — keep going on your guided path.`;
  }
  return `Hai completato ${completed} unità su ${unitCount}. Ogni passo conta — prosegui sul percorso guidato.`;
}
