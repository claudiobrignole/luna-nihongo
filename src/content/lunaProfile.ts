import { LUNA_PROFILE_TEXT } from './lunaProfileText';
import lunaPortrait from '../assets/brand/luna-portrait.png';

export const LUNA_PROFILE = {
  photo: lunaPortrait,
  photoAlt: {
    it: 'Luna, insegnante madrelingua giapponese',
    en: 'Luna, native Japanese teacher',
  },
  ...LUNA_PROFILE_TEXT,
} as const;
