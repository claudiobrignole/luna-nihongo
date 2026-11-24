import { ArrowRight } from 'lucide-react';
import type { LanguageType } from './Header';

interface NotFoundPageProps {
  language: LanguageType;
  onGoHome: () => void;
}

/**
 * Pagina 404 vera (client-side), mostrata quando il path richiesto non
 * corrisponde a nessuna route pubblica nota. Lato Apache, .htaccess risponde
 * con HTTP 404 reale (ErrorDocument) e serve questo stesso index.html come
 * corpo della risposta per gli URL sconosciuti: niente più soft-404 a 200.
 */
export function NotFoundPage({ language, onGoHome }: NotFoundPageProps) {
  const en = language === 'en';
  return (
    <div className="page-view not-found-page" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <p className="mg-index" style={{ color: 'var(--ln-red-deep)' }}>404</p>
      <h1 className="mg-band-title" lang="ja" style={{ marginBottom: '0.5rem' }}>
        みつかりません
      </h1>
      <p style={{ color: 'var(--text-muted)', maxWidth: '32rem', margin: '0 auto 1.5rem' }}>
        {en
          ? "The page you're looking for doesn't exist or has moved."
          : 'La pagina che cerchi non esiste o è stata spostata.'}
      </p>
      <button type="button" className="mg-btn mg-btn--red" onClick={onGoHome}>
        {en ? 'Back to home' : 'Torna alla home'}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
