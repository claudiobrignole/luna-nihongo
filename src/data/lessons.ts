export interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'spelling' | 'matching';
  question: {
    en: string;
    it: string;
  };
  options?: string[]; // for multiple choice
  correctAnswer: string; // for spelling / MC
  matchingPairs?: { left: string; right: string }[]; // for matching
}

export interface CardItem {
  id: string;
  japanese: string;
  romaji: string;
  meaning: {
    en: string;
    it: string;
  };
  mnemonic?: {
    en: string;
    it: string;
  };
  audioPlaceholder?: string;
  readingOnyomi?: string; // for Kanji
  readingKunyomi?: string; // for Kanji
}

export interface GrammarLesson {
  id: string;
  title: {
    en: string;
    it: string;
  };
  explanation: {
    en: string;
    it: string;
  };
  examples: {
    japanese: string;
    romaji: string;
    meaning: {
      en: string;
      it: string;
    };
  }[];
}

export interface SyllabusUnit {
  id: string;
  level: number;
  title: {
    en: string;
    it: string;
  };
  description: {
    en: string;
    it: string;
  };
  type: 'hiragana' | 'katakana' | 'kanji' | 'grammar';
  items?: CardItem[];
  grammar?: GrammarLesson;
  quizzes: QuizQuestion[];
}

export const SYLLABUS: SyllabusUnit[] = [
  {
    id: 'hiragana-vowels',
    level: 0,
    title: {
      en: 'Hiragana: The Vowels',
      it: 'Hiragana: Le Vocali'
    },
    description: {
      en: 'Learn the core sounds of Japanese: あ, い, う, え, お',
      it: 'Impara i suoni fondamentali del giapponese: あ, い, う, え, お'
    },
    type: 'hiragana',
    items: [
      {
        id: 'h-a',
        japanese: 'あ',
        romaji: 'a',
        meaning: { en: 'a (as in father)', it: 'a (come in albero)' },
        mnemonic: {
          en: 'Looks like an "A" with a loop at the bottom.',
          it: 'Sembra una "A" con un cappio alla base.'
        }
      },
      {
        id: 'h-i',
        japanese: 'い',
        romaji: 'i',
        meaning: { en: 'i (as in meet)', it: 'i (come in imbuto)' },
        mnemonic: {
          en: 'Looks like two eels swimming side by side.',
          it: 'Sembra due anguille (eels) che nuotano vicine.'
        }
      },
      {
        id: 'h-u',
        japanese: 'う',
        romaji: 'u',
        meaning: { en: 'u (as in boot)', it: 'u (come in uva)' },
        mnemonic: {
          en: 'Looks like a sideways "U" or a camel hump.',
          it: 'Sembra una "U" ruotata o la gobba di un cammello.'
        }
      },
      {
        id: 'h-e',
        japanese: 'え',
        romaji: 'e',
        meaning: { en: 'e (as in pen)', it: 'e (come in erba)' },
        mnemonic: {
          en: 'Looks like an exotic runner training.',
          it: 'Sembra un corridore esotico che fa stretching.'
        }
      },
      {
        id: 'h-o',
        japanese: 'お',
        romaji: 'o',
        meaning: { en: 'o (as in boat)', it: 'o (come in occhio)' },
        mnemonic: {
          en: 'Looks like あ but with a small extra dash (o-flag) on the right.',
          it: 'Simile a あ ma con un trattino extra (bandierina) sulla destra.'
        }
      }
    ],
    quizzes: [
      {
        id: 'q-hv-1',
        type: 'multiple-choice',
        question: {
          en: 'Which romaji matches the character "あ"?',
          it: 'Quale romaji corrisponde al carattere "あ"?'
        },
        options: ['a', 'i', 'u', 'o'],
        correctAnswer: 'a'
      },
      {
        id: 'q-hv-2',
        type: 'multiple-choice',
        question: {
          en: 'Identify the character for the sound "i":',
          it: 'Identifica il carattere per il suono "i":'
        },
        options: ['あ', 'い', 'う', 'え'],
        correctAnswer: 'い'
      },
      {
        id: 'q-hv-3',
        type: 'spelling',
        question: {
          en: 'Type the romaji for "お":',
          it: 'Digita il romaji per "お":'
        },
        correctAnswer: 'o'
      }
    ]
  },
  {
    id: 'hiragana-k-line',
    level: 0,
    title: {
      en: 'Hiragana: The K-Line',
      it: 'Hiragana: La linea K'
    },
    description: {
      en: 'Learn the first consonant combinations: か, き, く, け, こ',
      it: 'Impara le prime combinazioni consonantiche: か, き, く, け, こ'
    },
    type: 'hiragana',
    items: [
      {
        id: 'h-ka',
        japanese: 'か',
        romaji: 'ka',
        meaning: { en: 'ka', it: 'ka' },
        mnemonic: {
          en: 'Looks like a person doing a Karate kick.',
          it: 'Sembra una persona che tira un calcio di Karate.'
        }
      },
      {
        id: 'h-ki',
        japanese: 'き',
        romaji: 'ki',
        meaning: { en: 'ki', it: 'ki' },
        mnemonic: {
          en: 'Looks like a Key.',
          it: 'Sembra una chiave (Key).'
        }
      },
      {
        id: 'h-ku',
        japanese: 'く',
        romaji: 'ku',
        meaning: { en: 'ku', it: 'ku' },
        mnemonic: {
          en: 'Looks like a Cuckoo bird open beak.',
          it: 'Sembra il becco aperto di un cuculo.'
        }
      },
      {
        id: 'h-ke',
        japanese: 'け',
        romaji: 'ke',
        meaning: { en: 'ke', it: 'ke' },
        mnemonic: {
          en: 'Looks like a Keg of sake with a tap on the left.',
          it: 'Sembra un barile (Keg) di sake con un rubinetto a sinistra.'
        }
      },
      {
        id: 'h-ko',
        japanese: 'こ',
        romaji: 'ko',
        meaning: { en: 'ko', it: 'ko' },
        mnemonic: {
          en: 'Looks like two Co-operating lines.',
          it: 'Sembra due linee che collaborano (Co-operate).'
        }
      }
    ],
    quizzes: [
      {
        id: 'q-hk-1',
        type: 'multiple-choice',
        question: {
          en: 'What is the pronunciation of "き"?',
          it: 'Qual è la pronuncia di "き"?'
        },
        options: ['ka', 'ki', 'ku', 'ke'],
        correctAnswer: 'ki'
      },
      {
        id: 'q-hk-2',
        type: 'spelling',
        question: {
          en: 'Type the romaji for "く":',
          it: 'Digita il romaji per "く":'
        },
        correctAnswer: 'ku'
      }
    ]
  },
  {
    id: 'katakana-vowels',
    level: 0,
    title: {
      en: 'Katakana: The Vowels',
      it: 'Katakana: Le Vocali'
    },
    description: {
      en: 'Learn the sharp katakana vowels used for foreign words: ア, イ, ウ, エ, オ',
      it: 'Impara le vocali katakana, usate per i prestiti linguistici: ア, イ, ウ, エ, オ'
    },
    type: 'katakana',
    items: [
      {
        id: 'k-a',
        japanese: 'ア',
        romaji: 'a',
        meaning: { en: 'a', it: 'a' },
        mnemonic: {
          en: 'Looks like an Ax angle.',
          it: 'Sembra l\'angolo di un\'ascia (Ax).'
        }
      },
      {
        id: 'k-i',
        japanese: 'イ',
        romaji: 'i',
        meaning: { en: 'i', it: 'i' },
        mnemonic: {
          en: 'Looks like a person standing erect (an Individual).',
          it: 'Sembra una persona in piedi (Individuo).'
        }
      },
      {
        id: 'k-u',
        japanese: 'ウ',
        romaji: 'u',
        meaning: { en: 'u', it: 'u' },
        mnemonic: {
          en: 'Looks like a Katakana roof with a chimney.',
          it: 'Sembra un tetto con un camino.'
        }
      },
      {
        id: 'k-e',
        japanese: 'エ',
        romaji: 'e',
        meaning: { en: 'e', it: 'e' },
        mnemonic: {
          en: 'Looks like an Engineer\'s I-beam.',
          it: 'Sembra una trave di metallo a forma di I (I-beam).'
        }
      },
      {
        id: 'k-o',
        japanese: 'オ',
        romaji: 'o',
        meaning: { en: 'o', it: 'o' },
        mnemonic: {
          en: 'Looks like a person doing Origami.',
          it: 'Sembra una persona che fa Origami.'
        }
      }
    ],
    quizzes: [
      {
        id: 'q-kv-1',
        type: 'multiple-choice',
        question: {
          en: 'Which Katakana character stands for "e"?',
          it: 'Quale carattere Katakana corrisponde a "e"?'
        },
        options: ['ア', 'イ', 'エ', 'オ'],
        correctAnswer: 'エ'
      }
    ]
  },
  {
    id: 'kanji-basics',
    level: 1,
    title: {
      en: 'Basic Kanji: Numbers & Elements',
      it: 'Kanji di Base: Numeri ed Elementi'
    },
    description: {
      en: 'Master foundational characters: 一, 二, 三, 日, 月, 木',
      it: 'Padroneggia i caratteri elementari: 一, 二, 三, 日, 月, 木'
    },
    type: 'kanji',
    items: [
      {
        id: 'kn-1',
        japanese: '一',
        romaji: 'ichi',
        meaning: { en: 'one', it: 'uno' },
        readingOnyomi: 'ICHI, ITSU',
        readingKunyomi: 'hito(tsu)',
        mnemonic: {
          en: 'Just a single horizontal stroke representing one item.',
          it: 'Un singolo tratto orizzontale che rappresenta un oggetto.'
        }
      },
      {
        id: 'kn-2',
        japanese: '二',
        romaji: 'ni',
        meaning: { en: 'two', it: 'due' },
        readingOnyomi: 'NI, JI',
        readingKunyomi: 'futa(tsu)',
        mnemonic: {
          en: 'Two horizontal lines stacked.',
          it: 'Due linee orizzontali sovrapposte.'
        }
      },
      {
        id: 'kn-3',
        japanese: '三',
        romaji: 'san',
        meaning: { en: 'three', it: 'tre' },
        readingOnyomi: 'SAN',
        readingKunyomi: 'mit(tsu)',
        mnemonic: {
          en: 'Three horizontal lines stacked.',
          it: 'Tre linee orizzontali.'
        }
      },
      {
        id: 'kn-sun',
        japanese: '日',
        romaji: 'hi / nichi',
        meaning: { en: 'sun / day', it: 'sole / giorno' },
        readingOnyomi: 'NICHI, JITSU',
        readingKunyomi: 'hi, -bi, -ka',
        mnemonic: {
          en: 'A box representing the sun with a ray dividing the middle.',
          it: 'Una scatola che rappresenta il sole con una riga centrale.'
        }
      },
      {
        id: 'kn-moon',
        japanese: '月',
        romaji: 'tsuki / getsu',
        meaning: { en: 'moon / month', it: 'luna / mese' },
        readingOnyomi: 'GETSU, GATSU',
        readingKunyomi: 'tsuki',
        mnemonic: {
          en: 'A crescent moon shape. (Coincidentally, your teacher\'s name, Luna!)',
          it: 'Una falce di luna. (Per coincidenza, il nome della maestra, Luna!)'
        }
      },
      {
        id: 'kn-tree',
        japanese: '木',
        romaji: 'ki / moku',
        meaning: { en: 'tree / wood', it: 'albero / legno' },
        readingOnyomi: 'MOKU, BOKU',
        readingKunyomi: 'ki',
        mnemonic: {
          en: 'A tree trunk with branches and roots.',
          it: 'Un tronco d\'albero con rami e radici.'
        }
      }
    ],
    quizzes: [
      {
        id: 'q-kj-1',
        type: 'multiple-choice',
        question: {
          en: 'What is the meaning of the Kanji "月"?',
          it: 'Qual è il significato del Kanji "月"?'
        },
        options: ['sun', 'moon', 'tree', 'three'],
        correctAnswer: 'moon'
      },
      {
        id: 'q-kj-2',
        type: 'spelling',
        question: {
          en: 'Type the English meaning of "木":',
          it: 'Digita il significato in italiano di "木":'
        },
        correctAnswer: 'tree'
      }
    ]
  },
  {
    id: 'grammar-particles',
    level: 1,
    title: {
      en: 'Grammar: The Topic Particle は',
      it: 'Grammatica: La Particella Tematica は'
    },
    description: {
      en: 'Learn how to introduce topics using the particle は (pronounced wa).',
      it: 'Impara ad introdurre l\'argomento della frase con la particella は (pronunciata wa).'
    },
    type: 'grammar',
    grammar: {
      id: 'g-wa',
      title: {
        en: 'The Topic Particle は (wa)',
        it: 'La Particella Tematica は (wa)'
      },
      explanation: {
        en: 'In Japanese, particles are small words added after nouns to indicate their grammatical role. The particle は (written as "ha" but pronounced "wa") marks the **topic** of the sentence. It can be translated as "As for..." or "Speaking of...".\n\n**Formula:** [Noun] は [Information] です (desu - is/am/are).',
        it: 'In giapponese, le particelle sono brevi parole posizionate dopo i sostantivi per indicare il loro ruolo grammaticale. La particella は (scritta "ha" ma pronunciata "wa") indica il **tema** (argomento principale) della frase. Può essere tradotta come "Per quanto riguarda..." o "Riguardo a...".\n\n**Formula:** [Nome] は [Informazione] です (desu - è/sono).'
      },
      examples: [
        {
          japanese: 'わたしはルナです。',
          romaji: 'Watashi wa Runa desu.',
          meaning: {
            en: 'I am Luna. (As for me, I am Luna.)',
            it: 'Io sono Luna. (Per quanto mi riguarda, sono Luna.)'
          }
        },
        {
          japanese: 'にほんごはたのしいです。',
          romaji: 'Nihongo wa tanoshii desu.',
          meaning: {
            en: 'Japanese is fun. (As for Japanese, it is fun.)',
            it: 'Il giapponese è divertente. (Parlando del giapponese, è divertente.)'
          }
        }
      ]
    },
    quizzes: [
      {
        id: 'q-g-1',
        type: 'multiple-choice',
        question: {
          en: 'Which particle is used to mark the main topic of a sentence?',
          it: 'Quale particella si usa per indicare l\'argomento principale di una frase?'
        },
        options: ['を (o)', 'に (ni)', 'は (wa)', 'が (ga)'],
        correctAnswer: 'は (wa)'
      },
      {
        id: 'q-g-2',
        type: 'multiple-choice',
        question: {
          en: 'In "Watashi wa Runa desu", what does "desu" mean?',
          it: 'In "Watashi wa Runa desu", cosa significa "desu"?'
        },
        options: ['Goodbye', 'Is / Am / Are', 'Luna', 'Japan'],
        correctAnswer: 'Is / Am / Are'
      }
    ]
  }
];
