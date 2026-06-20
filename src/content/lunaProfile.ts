import lunaPortrait from '../assets/brand/luna-portrait.png';

export const LUNA_PROFILE = {
  photo: lunaPortrait,
  photoAlt: {
    it: 'Luna, insegnante madrelingua giapponese',
    en: 'Luna, native Japanese teacher',
  },
  title: {
    it: 'Impara il giapponese con Luna',
    en: 'Learn Japanese with Luna',
  },
  badge: {
    it: 'MADRELINGUA GIAPPONESE',
    en: 'NATIVE JAPANESE SPEAKER',
  },
  lead: {
    it: "Ciao! Sono Luna, madrelingua giapponese. Le mie lezioni individuali seguono i livelli JLPT N5 e N4, ma se sei già più avanzato dimmi a che punto sei: possiamo lavorare su grammatica, conversazione e pronuncia fino all'N1.",
    en: "Hi! I'm Luna, a native Japanese speaker. My one-on-one lessons follow JLPT N5 and N4 levels, but if you're already more advanced tell me where you're at: we can work on grammar, conversation and pronunciation up to N1.",
  },
  bullets: {
    it: [
      "Percorso strutturato sui livelli JLPT N5 e N4, con possibilità di proseguire fino all'N1",
      'Puoi chiedere spiegazioni partendo dai tuoi manga e anime preferiti',
      'Laurea in Scienze Sociali, indirizzo in Geografia e Storia - Waseda University, Tokyo',
      'Laurea in Giornalismo, indirizzo Magazine - University of Oregon, USA',
      'Inglese fluente — italiano livello B1',
    ],
    en: [
      'Structured path across JLPT N5 and N4 levels, with the option to continue up to N1',
      'Ask about Japanese starting from your favourite manga and anime',
      'Major in Geography and History, School of Education, Waseda University, Tokyo',
      'School of Journalism and Communication, University of Oregon, USA',
      'Fluent English — Italian at B1 level',
    ],
  },
} as const;
