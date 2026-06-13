import { AlertTriangle, Settings2 } from 'lucide-react';
import { PageHero } from './PageHero';
import { useConsent } from '../contexts/ConsentContext';
import type { LanguageType } from './Header';

export type LegalDoc = 'privacy' | 'cookies' | 'terms';

// Dati del titolare — SEGNAPOSTO da completare prima della pubblicazione.
const OWNER = '[Ragione sociale / titolare del trattamento]';
const ADDRESS = '[Indirizzo completo, Svizzera]';
const CONTACT_EMAIL = 'privacy@lunanihongo.com';
const LAST_UPDATED = '13/06/2026';

type Bi = { it: string; en: string };
interface Section {
  h: Bi;
  p: Bi[];
}
interface Doc {
  title: Bi;
  intro: Bi;
  sections: Section[];
}

const PRIVACY: Doc = {
  title: { it: 'Informativa sulla privacy', en: 'Privacy policy' },
  intro: {
    it: `La presente informativa descrive come ${OWNER} ("noi") tratta i dati personali degli utenti di Luna Nihongo (lunanihongo.com), ai sensi del Regolamento UE 2016/679 (GDPR) e della Legge federale svizzera sulla protezione dei dati (nLPD).`,
    en: `This policy explains how ${OWNER} ("we") processes the personal data of Luna Nihongo (lunanihongo.com) users, under EU Regulation 2016/679 (GDPR) and the Swiss Federal Act on Data Protection (revFADP).`,
  },
  sections: [
    {
      h: { it: '1. Titolare del trattamento', en: '1. Data controller' },
      p: [
        { it: `${OWNER}, ${ADDRESS}. Contatto per la privacy: ${CONTACT_EMAIL}.`, en: `${OWNER}, ${ADDRESS}. Privacy contact: ${CONTACT_EMAIL}.` },
      ],
    },
    {
      h: { it: '2. Dati che trattiamo', en: '2. Data we process' },
      p: [
        { it: 'Dati di account: email, nome utente, password (cifrata da Firebase Authentication).', en: 'Account data: email, username, password (hashed by Firebase Authentication).' },
        { it: 'Dati di studio: livello, unità completate, progressi, attività e statistiche di apprendimento.', en: 'Study data: level, completed units, progress, learning activity and statistics.' },
        { it: 'Contenuti del tutor AI: i messaggi che invii al tutor sono elaborati per generare le risposte.', en: 'AI tutor content: the messages you send to the tutor are processed to generate replies.' },
        { it: 'Dati di pagamento: gestiti direttamente da Stripe; non memorizziamo i dati della carta.', en: 'Payment data: handled directly by Stripe; we do not store card details.' },
        { it: 'Prenotazioni: data, ora e tipo di lezione. Newsletter: email e consenso, se iscritto.', en: 'Bookings: date, time and lesson type. Newsletter: email and consent, if subscribed.' },
      ],
    },
    {
      h: { it: '3. Finalità e basi giuridiche', en: '3. Purposes and legal bases' },
      p: [
        { it: 'Erogare il servizio e gestire l’account (esecuzione del contratto, art. 6.1.b GDPR).', en: 'Provide the service and manage your account (performance of a contract, art. 6.1.b GDPR).' },
        { it: 'Sicurezza, prevenzione abusi e obblighi di legge (legittimo interesse e obbligo legale).', en: 'Security, abuse prevention and legal obligations (legitimate interest and legal obligation).' },
        { it: 'Newsletter e marketing solo con il tuo consenso esplicito, revocabile in ogni momento.', en: 'Newsletter and marketing only with your explicit consent, withdrawable at any time.' },
        { it: 'Cookie non necessari solo previo consenso (vedi Cookie policy).', en: 'Non-necessary cookies only with prior consent (see Cookie policy).' },
      ],
    },
    {
      h: { it: '4. Fornitori e destinatari', en: '4. Providers and recipients' },
      p: [
        { it: 'Ci avvaliamo di responsabili del trattamento che agiscono per nostro conto: Google Firebase (autenticazione e database), Google Gemini (tutor AI), Stripe (pagamenti), Resend (email transazionali), SendFox (newsletter), Hostinger (hosting).', en: 'We rely on processors acting on our behalf: Google Firebase (authentication and database), Google Gemini (AI tutor), Stripe (payments), Resend (transactional email), SendFox (newsletter), Hostinger (hosting).' },
        { it: 'Non vendiamo i tuoi dati personali a terzi.', en: 'We do not sell your personal data to third parties.' },
      ],
    },
    {
      h: { it: '5. Trasferimenti extra UE/Svizzera', en: '5. Transfers outside the EU/Switzerland' },
      p: [
        { it: 'Alcuni fornitori possono trattare dati al di fuori dell’UE/Svizzera (es. Stati Uniti). In tali casi applichiamo garanzie adeguate, come le Clausole Contrattuali Standard.', en: 'Some providers may process data outside the EU/Switzerland (e.g. the United States). In such cases we apply adequate safeguards such as Standard Contractual Clauses.' },
      ],
    },
    {
      h: { it: '6. Conservazione', en: '6. Retention' },
      p: [
        { it: 'Conserviamo i dati per il tempo necessario alle finalità descritte e agli obblighi di legge. Lo storico delle sessioni live Premium è eliminato 90 giorni dopo la fine del Premium. Puoi chiedere la cancellazione dell’account.', en: 'We keep data for as long as needed for the stated purposes and legal obligations. Premium live-session history is deleted 90 days after Premium ends. You can request account deletion.' },
      ],
    },
    {
      h: { it: '7. I tuoi diritti', en: '7. Your rights' },
      p: [
        { it: 'Hai diritto di accesso, rettifica, cancellazione, limitazione, opposizione e portabilità, e di revocare il consenso. Scrivi a ' + CONTACT_EMAIL + '.', en: 'You have the right to access, rectify, erase, restrict, object, and to data portability, and to withdraw consent. Write to ' + CONTACT_EMAIL + '.' },
        { it: 'Puoi reclamare a un’autorità di controllo: il Garante (UE/Italia) o l’IFPDT (Svizzera).', en: 'You may lodge a complaint with a supervisory authority: your local DPA (EU) or the FDPIC (Switzerland).' },
      ],
    },
    {
      h: { it: '8. Modifiche', en: '8. Changes' },
      p: [
        { it: `Possiamo aggiornare questa informativa; la versione vigente è pubblicata qui. Ultimo aggiornamento: ${LAST_UPDATED}.`, en: `We may update this policy; the current version is published here. Last updated: ${LAST_UPDATED}.` },
      ],
    },
  ],
};

const COOKIES: Doc = {
  title: { it: 'Cookie policy', en: 'Cookie policy' },
  intro: {
    it: 'Questa pagina spiega quali cookie e tecnologie simili usa Luna Nihongo e come gestire le tue scelte. Puoi modificarle in qualsiasi momento da "Impostazioni cookie" nel footer.',
    en: 'This page explains which cookies and similar technologies Luna Nihongo uses and how to manage your choices. You can change them anytime via "Cookie settings" in the footer.',
  },
  sections: [
    {
      h: { it: '1. Cosa sono', en: '1. What they are' },
      p: [
        { it: 'I cookie e lo storage locale sono piccoli dati salvati dal browser per far funzionare il sito e ricordare scelte e attività.', en: 'Cookies and local storage are small pieces of data saved by the browser to make the site work and remember choices and activity.' },
      ],
    },
    {
      h: { it: '2. Categorie che usiamo', en: '2. Categories we use' },
      p: [
        { it: 'Necessari (sempre attivi): autenticazione e sessione Firebase, salvataggio del consenso cookie, sicurezza. Senza questi il sito non funziona.', en: 'Necessary (always on): Firebase authentication and session, storing your cookie consent, security. The site cannot work without these.' },
        { it: 'Preferenze (opzionali): ricordano la lingua e le impostazioni di interfaccia.', en: 'Preferences (optional): remember language and interface settings.' },
        { it: 'Statistiche (opzionali): al momento non attive; le useremmo solo in forma aggregata e previo consenso.', en: 'Analytics (optional): currently not active; if used, only in aggregate form and with prior consent.' },
        { it: 'Marketing (opzionali): al momento non attive; servirebbero a misurare campagne e contenuti.', en: 'Marketing (optional): currently not active; would be used to measure campaigns and content.' },
      ],
    },
    {
      h: { it: '3. Come gestire il consenso', en: '3. Managing consent' },
      p: [
        { it: 'Al primo accesso puoi accettare, rifiutare o personalizzare. Le categorie non necessarie restano disattivate finché non le attivi. Puoi cambiare scelta dal link "Impostazioni cookie" nel footer o dalle impostazioni del browser.', en: 'On your first visit you can accept, reject or customize. Non-necessary categories stay off until you enable them. You can change your choice via the "Cookie settings" link in the footer or in your browser settings.' },
      ],
    },
    {
      h: { it: '4. Terze parti', en: '4. Third parties' },
      p: [
        { it: 'Pagamenti (Stripe) e tutor AI (Google Gemini) possono impostare cookie tecnici solo quando usi quelle funzioni. Vedi le rispettive informative.', en: 'Payments (Stripe) and the AI tutor (Google Gemini) may set technical cookies only when you use those features. See their respective policies.' },
      ],
    },
    {
      h: { it: '5. Aggiornamenti', en: '5. Updates' },
      p: [
        { it: `Aggiorneremo questa pagina al cambiare dei cookie usati. Ultimo aggiornamento: ${LAST_UPDATED}.`, en: `We will update this page as the cookies we use change. Last updated: ${LAST_UPDATED}.` },
      ],
    },
  ],
};

const TERMS: Doc = {
  title: { it: 'Termini e condizioni', en: 'Terms & conditions' },
  intro: {
    it: `Questi termini regolano l’uso di Luna Nihongo. Usando il servizio accetti queste condizioni. Titolare: ${OWNER}.`,
    en: `These terms govern the use of Luna Nihongo. By using the service you accept them. Provider: ${OWNER}.`,
  },
  sections: [
    {
      h: { it: '1. Il servizio', en: '1. The service' },
      p: [
        { it: 'Luna Nihongo è una piattaforma per imparare il giapponese con percorso guidato, flashcard, tutor AI e lezioni dal vivo. Parte dei contenuti è gratuita previa registrazione.', en: 'Luna Nihongo is a platform to learn Japanese with a guided path, flashcards, an AI tutor and live lessons. Part of the content is free after registration.' },
      ],
    },
    {
      h: { it: '2. Account', en: '2. Account' },
      p: [
        { it: 'Devi fornire dati veritieri e custodire le credenziali. Sei responsabile dell’attività sul tuo account. Per i minori è richiesto il consenso di chi esercita la responsabilità genitoriale.', en: 'You must provide accurate data and keep your credentials safe. You are responsible for activity on your account. Minors require the consent of a parent or guardian.' },
      ],
    },
    {
      h: { it: '3. Premium, pagamenti e recesso', en: '3. Premium, payments and withdrawal' },
      p: [
        { it: 'L’abbonamento Premium è gestito tramite Stripe e si rinnova automaticamente fino alla disdetta. Puoi disdire in qualsiasi momento; l’accesso resta fino a fine periodo.', en: 'The Premium subscription is handled via Stripe and renews automatically until cancelled. You can cancel anytime; access continues until the end of the period.' },
        { it: 'Consumatori UE: diritto di recesso di 14 giorni, salvo che il servizio digitale sia iniziato con il tuo consenso espresso e rinuncia al recesso.', en: 'EU consumers: 14-day right of withdrawal, unless the digital service has begun with your express consent and waiver of that right.' },
      ],
    },
    {
      h: { it: '4. Lezioni dal vivo', en: '4. Live lessons' },
      p: [
        { it: 'Le lezioni si prenotano dal calendario. Cancellazioni e modifiche seguono le condizioni indicate al momento della prenotazione.', en: 'Lessons are booked from the calendar. Cancellations and changes follow the conditions shown at booking time.' },
      ],
    },
    {
      h: { it: '5. Uso accettabile', en: '5. Acceptable use' },
      p: [
        { it: 'Non è consentito abusare del servizio, violare diritti altrui, tentare accessi non autorizzati o rivendere i contenuti.', en: 'You may not abuse the service, infringe others’ rights, attempt unauthorized access or resell the content.' },
      ],
    },
    {
      h: { it: '6. Proprietà intellettuale e contenuti AI', en: '6. Intellectual property and AI content' },
      p: [
        { it: 'I contenuti, il marchio e le illustrazioni di Luna Nihongo sono protetti. Le risposte del tutor AI sono generate automaticamente e possono contenere errori: non sostituiscono un parere professionale.', en: 'Luna Nihongo content, brand and illustrations are protected. AI tutor replies are generated automatically and may contain errors: they are not a substitute for professional advice.' },
      ],
    },
    {
      h: { it: '7. Responsabilità', en: '7. Liability' },
      p: [
        { it: 'Il servizio è fornito "così com’è". Nei limiti di legge, non rispondiamo per danni indiretti o per indisponibilità temporanea.', en: 'The service is provided "as is". To the extent permitted by law, we are not liable for indirect damages or temporary unavailability.' },
      ],
    },
    {
      h: { it: '8. Legge applicabile', en: '8. Governing law' },
      p: [
        { it: `Salvo norme imperative a tutela del consumatore, si applica il diritto svizzero, con foro competente nel luogo del titolare. Ultimo aggiornamento: ${LAST_UPDATED}.`, en: `Except for mandatory consumer-protection rules, Swiss law applies, with jurisdiction at the provider’s seat. Last updated: ${LAST_UPDATED}.` },
      ],
    },
  ],
};

const DOCS: Record<LegalDoc, Doc> = { privacy: PRIVACY, cookies: COOKIES, terms: TERMS };

interface LegalPageProps {
  doc: LegalDoc;
  language: LanguageType;
}

export function LegalPage({ doc, language }: LegalPageProps) {
  const data = DOCS[doc];
  const it = language === 'it';
  const { openPreferences } = useConsent();

  return (
    <div className="legal-page page-view">
      <PageHero page={doc} language={language} />
      <div className="legal-body">
        <div className="legal-notice" role="note">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            {it
              ? 'Bozza modello da far revisionare a un legale prima della pubblicazione. Completa i dati del titolare.'
              : 'Template draft to be reviewed by a lawyer before publishing. Fill in the provider details.'}
          </span>
        </div>

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
