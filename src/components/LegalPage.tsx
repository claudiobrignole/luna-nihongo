import { Settings2 } from 'lucide-react';
import { PageHero } from './PageHero';
import { useConsent } from '../contexts/useConsent';
import type { LanguageType } from './Header';
import { LEGAL_DOCS, LAST_UPDATED } from '../content/legalDocs';
import type { LegalDoc } from '../content/legalDocs';

export type { LegalDoc };


interface LegalPageProps {
  doc: LegalDoc;
  language: LanguageType;
}

export function LegalPage({ doc, language }: LegalPageProps) {
  const data = LEGAL_DOCS[doc];
  const it = language === 'it';
  const { openPreferences } = useConsent();

  return (
    <div className="legal-page page-view">
      <PageHero page={doc} language={language} />
      <div className="legal-body">
        <h2 className="legal-title">{data.title[language]}</h2>
        <p className="legal-updated">{it ? `Ultimo aggiornamento: ${LAST_UPDATED}` : `Last updated: ${LAST_UPDATED}`}</p>
        <p className="legal-intro">{data.intro[language]}</p>

        {data.sections.map((s) => (
          <section key={s.h.en} className="legal-section">
            <h3>{s.h[language]}</h3>
            {s.p.map((para, i) => (
              <p key={i}>{para[language]}</p>
            ))}
          </section>
        ))}

        {doc === 'cookies' && (
          <button type="button" className="mg-btn mg-btn--ink legal-cookie-btn" onClick={openPreferences}>
            <Settings2 size={16} />
            {it ? 'Apri impostazioni cookie' : 'Open cookie settings'}
          </button>
        )}
      </div>
    </div>
  );
}
