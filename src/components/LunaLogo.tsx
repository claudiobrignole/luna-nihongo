import logoHorizontalDark from '../assets/brand/Luna-Nihongo-logo-orizz-nero-rosso.svg';
import logoHorizontalLight from '../assets/brand/Luna-Nihongo-logo-orizz-bianco-rosso.svg';
import logoVerticalDark from '../assets/brand/Luna-Nihongo-logo-vert-nero-rosso.svg';
import logoVerticalLight from '../assets/brand/Luna-Nihongo-logo-vert-bianco-rosso.svg';
import logoIcon from '../assets/brand/Luna-Nihongo-icona.svg';

export type LunaLogoLayout = 'horizontal' | 'vertical' | 'icon';

/** Background behind the logo: light → dark text, dark → light text. */
export type LunaLogoTheme = 'light' | 'dark' | 'auto';

interface LunaLogoProps {
  layout?: LunaLogoLayout;
  theme?: LunaLogoTheme;
  className?: string;
  alt?: string;
}

function logoSources(layout: Exclude<LunaLogoLayout, 'icon'>) {
  return layout === 'vertical'
    ? { onLight: logoVerticalDark, onDark: logoVerticalLight }
    : { onLight: logoHorizontalDark, onDark: logoHorizontalLight };
}

export function LunaLogo({
  layout = 'horizontal',
  theme = 'light',
  className = '',
  alt = 'Luna Nihongo',
}: LunaLogoProps) {
  if (layout === 'icon') {
    return (
      <img
        src={logoIcon}
        alt={alt}
        className={`luna-logo luna-logo--icon ${className}`.trim()}
        decoding="async"
      />
    );
  }

  const { onLight, onDark } = logoSources(layout);

  if (theme === 'auto') {
    return (
      <span className={`luna-logo luna-logo--auto luna-logo--${layout} ${className}`.trim()} aria-hidden={alt === ''}>
        <img src={onLight} alt={alt} className="luna-logo__img luna-logo__img--on-light" decoding="async" />
        <img src={onDark} alt="" className="luna-logo__img luna-logo__img--on-dark" decoding="async" />
      </span>
    );
  }

  const src = theme === 'dark' ? onDark : onLight;
  return (
    <img
      src={src}
      alt={alt}
      className={`luna-logo luna-logo--${layout} ${className}`.trim()}
      decoding="async"
    />
  );
}
