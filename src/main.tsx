import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
import { clearConsent } from './utils/consent.ts'

if (import.meta.env.DEV) {
  Object.assign(window, {
    __lunaResetCookieConsent: () => {
      clearConsent()
      window.location.reload()
    },
  })
  console.info('[Luna] Per ritestare il banner cookie: __lunaResetCookieConsent()')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
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

