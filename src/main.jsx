import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastModalProvider } from './context/ToastModalContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ToastModalProvider>
        <App />
      </ToastModalProvider>
    </AuthProvider>
  </StrictMode>,
)
