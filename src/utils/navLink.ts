import type { MouseEvent } from 'react';

/**
 * Gestore di click per link interni (<a href="...">) che devono navigare via
 * SPA invece di ricaricare la pagina — mantiene l'URL reale cliccabile/indicizzabile
 * (crawlability, apertura in nuova scheda con cmd/ctrl-click, copia link) ma intercetta
 * il click "normale" per usare la navigazione client-side già esistente.
 *
 * Rispetta l'apertura in nuova scheda/finestra (cmd/ctrl/shift/middle-click):
 * in quei casi lascia che il browser segua l'href normalmente.
 */
export function handleInternalNavClick(onNavigate: () => void) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    onNavigate();
  };
}
