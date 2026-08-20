import type { ReactNode } from 'react';
import type { LanguageType } from './Header';
import type { LandingSectionCopy } from '../content/landingSections';
import { withJlptN4Tooltip } from '../utils/withJlptN4Tooltip';

interface LandingFeatureBandProps {
  section: LandingSectionCopy;
  language: LanguageType;
  leadOverride?: string;
  verticalJa?: string;
  children: ReactNode;
}

function badgeClass(kind: NonNullable<LandingSectionCopy['badge']>['kind']): string {
  if (kind === 'free') return 'mg-badge mg-badge--free';
  if (kind === 'trial') return 'mg-badge mg-badge--trial';
  if (kind === 'live') return 'mg-badge mg-badge--live';
  return 'mg-badge mg-badge--otaku';
}

export function LandingFeatureBand({
  section,
  language,
  leadOverride,
  verticalJa,
  children,
}: LandingFeatureBandProps) {
  const lang = language;
  const indexColor =
    section.variant === 'yellow'
      ? 'var(--ln-ink)'
      : section.variant === 'washi' || section.variant === 'sakura'
        ? 'var(--ln-red-deep)'
        : 'var(--ln-yellow)';
  const subStyle = section.subInk ? { color: 'var(--ln-washi)' } : undefined;

  return (
    <section className={`mg-band mg-band--${section.variant} mg-bleed`}>
      <div className="mg-band-inner">
        <span className="mg-watermark" aria-hidden="true">
          {section.watermark}
        </span>
        <span className="mg-vertical" aria-hidden="true" lang="ja">
          {verticalJa ?? section.verticalJa[lang]}
        </span>
        <div className="mg-band-copy">
          <div className="mg-band-meta">
            <p className="mg-index" style={{ color: indexColor }}>
              {section.index}
            </p>
            {section.badge && (
              <span className={badgeClass(section.badge.kind)} lang="ja">
                {section.badge[lang]}
              </span>
            )}
          </div>
          <h2 className="mg-band-title" lang="ja">
            {section.titleJa}
          </h2>
          <p className="mg-band-lead" style={subStyle}>
            {withJlptN4Tooltip(leadOverride ?? section.lead[lang], lang)}
          </p>
          <ul className="mg-band-features" style={subStyle}>
            {section.bullets[lang].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {children}
        </div>
        <div className={`mg-fig${section.imagePlaceholder ? ' mg-fig--placeholder' : ''}`}>
          {section.imagePlaceholder ? (
            <div className="mg-fig-placeholder-inner" aria-hidden="true">
              <div className="mg-fig-media">
                <img src={section.image} alt="" />
              </div>
              <span className="mg-fig-placeholder-label">
                {lang === 'en' ? 'Luna anime art — coming soon' : 'Luna anime — in arrivo'}
              </span>
            </div>
          ) : (
            <div className="mg-fig-media">
              <img src={section.image} alt={section.imageAlt[lang]} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
