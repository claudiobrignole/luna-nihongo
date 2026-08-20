import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { LanguageProvider } from './contexts/LanguageContext.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
import { clearConsent } from './utils/consent.ts'
import { LANGUAGE_STORAGE_KEY, LANGUAGE_SUGGEST_DISMISSED_KEY } from './constants/language.ts'

if (import.meta.env.DEV) {
  Object.assign(window, {
    __lunaResetCookieConsent: () => {
      clearConsent()
      window.location.reload()
    },
    __lunaResetLanguagePrompt: () => {
      localStorage.removeItem(LANGUAGE_STORAGE_KEY)
      localStorage.removeItem(LANGUAGE_SUGGEST_DISMISSED_KEY)
      window.location.reload()
    },
  })
  console.info('[Luna] Per ritestare il banner cookie: __lunaResetCookieConsent()')
  console.info('[Luna] Per ritestare il popup lingua: __lunaResetLanguagePrompt()')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </LanguageProvider>
    </AuthProvider>
  </StrictMode>,
)

window.requestAnimationFrame(() => {
  document.getElementById('pwa-splash')?.remove()
})

// Register PWA service worker in production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered successfully:', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}

