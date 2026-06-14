import type { LanguageType } from './Header';
import lunaWave from '../assets/brand/luna-wave.webp';
import lunaStudy from '../assets/brand/luna-study.webp';
import lunaFlash from '../assets/brand/luna-flash.webp';
import lunaTalk from '../assets/brand/luna-talk.webp';
import lunaTorii from '../assets/brand/luna-torii.webp';

export type PageHeroKey =
  | 'study'
  | 'decks'
  | 'tutor'
  | 'teacher'
  | 'booking'
  | 'dashboard'
  | 'auth'
  | 'privacy'
  | 'cookies'
  | 'terms';

type Variant = 'washi' | 'yellow' | 'purple' | 'ink' | 'red';

interface HeroConfig {
  variant: Variant;
  index: string;
  watermark?: string;
  titleJa: string;
  sub: { it: string; en: string };
  image: string;
  /** Posizione orizzontale della figura, default 4% da destra. */
  imageRight?: string;
}

// Le immagini di Luna sono SEGNAPOSTO (le stesse della home): si cambieranno
// con un'illustrazione dedicata per pagina. Vedi DESIGN_SYSTEM.md.
const HERO: Record<PageHeroKey, HeroConfig> = {
  study: {
    variant: 'washi',
    index: '01.STUDY',
    titleJa: 'まなぶ — ガイドつきの道',
    sub: {
      it: 'Il percorso guidato da hiragana al JLPT N4, al tuo ritmo.',
      en: 'The guided path from hiragana to JLPT N4, at your pace.',
    },
    image: lunaStudy,
  },
  decks: {
    variant: 'yellow',
    index: '02.FLASHCARDS',
    watermark: 'F',
    titleJa: 'くりかえす — SRSデッキ',
    sub: {
      it: 'Ripasso spaziato: filtra, sfoglia e fissa ciò che conta.',
      en: 'Spaced repetition: filter, browse and lock in what matters.',
    },
    image: lunaFlash,
  },
  tutor: {
    variant: 'purple',
    index: '03.TALK',
    watermark: 'T',
    titleJa: 'はなす — るな先生',
    sub: {
      it: 'Tutor AI in testo e voce, sempre disponibile.',
      en: 'AI tutor in text and voice, always available.',
    },
    image: lunaTalk,
  },
  teacher: {
    variant: 'ink',
    index: 'LUNA',
    watermark: '月',
    titleJa: 'るな先生のこと',
    sub: {
      it: 'Chi è Luna, il metodo e le lezioni dal vivo.',
      en: 'Who Luna is, the method and the live lessons.',
    },
    image: lunaTorii,
    imageRight: '6%',
  },
  booking: {
    variant: 'red',
    index: 'LESSONS',
    watermark: 'ラ',
    titleJa: 'ライブレッスン',
    sub: {
      it: 'Prenota una lezione individuale online con Luna.',
      en: 'Book a one-on-one online lesson with Luna.',
    },
    image: lunaWave,
  },
  dashboard: {
    variant: 'red',
    index: 'MY PAGE',
    watermark: '家',
    titleJa: 'おかえりなさい',
    sub: {
      it: 'I tuoi progressi, le lezioni e l’abbonamento.',
      en: 'Your progress, lessons and subscription.',
    },
    image: lunaWave,
  },
  auth: {
    variant: 'purple',
    index: 'WELCOME',
    watermark: 'な',
    titleJa: 'ようこそ',
    sub: {
      it: 'Crea il tuo account gratuito o accedi.',
      en: 'Create your free account or sign in.',
    },
    image: lunaTalk,
  },
  privacy: {
    variant: 'ink',
    index: 'LEGAL',
    watermark: '私',
    titleJa: 'プライバシー',
    sub: {
      it: 'Informativa sul trattamento dei dati personali.',
      en: 'How we process your personal data.',
    },
    image: lunaTorii,
    imageRight: '6%',
  },
  cookies: {
    variant: 'ink',
    index: 'LEGAL',
    watermark: 'C',
    titleJa: 'クッキー',
    sub: {
      it: 'Come usiamo i cookie e come gestire le scelte.',
      en: 'How we use cookies and how to manage choices.',
    },
    image: lunaTorii,
    imageRight: '6%',
  },
  terms: {
    variant: 'ink',
    index: 'LEGAL',
    watermark: '約',
    titleJa: '利用規約',
    sub: {
      it: 'Le condizioni d’uso del servizio.',
      en: 'The terms governing use of the service.',
    },
    image: lunaTorii,
    imageRight: '6%',
  },
};

interface PageHeroProps {
  page: PageHeroKey;
  language: LanguageType;
  /** Override del sottotitolo latino (es. nome utente in dashboard). */
  subOverride?: string;
}

export function PageHero({ page, language, subOverride }: PageHeroProps) {
  const cfg = HERO[page];
  const indexColor = cfg.variant === 'washi' ? 'var(--ln-red-deep)' : 'var(--ln-yellow)';
  return (
    <section className={`mg-band mg-band--${cfg.variant} mg-bleed page-hero`}>
      <div className="mg-band-inner">
        {cfg.watermark ? (
          <span className="mg-watermark" aria-hidden="true" lang="ja">{cfg.watermark}</span>
        ) : null}
        <div className="mg-band-copy">
          <p className="mg-index" style={{ color: indexColor }}>{cfg.index}</p>
          <h1 className="mg-band-title" lang="ja">{cfg.titleJa}</h1>
          <p className="mg-band-sub" style={cfg.variant === 'ink' ? { color: 'var(--ln-washi)' } : undefined}>
            {subOverride ?? cfg.sub[language]}
          </p>
        </div>
        <div className="mg-fig" style={cfg.imageRight ? { right: cfg.imageRight } : undefined}>
          <img src={cfg.image} alt="" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
