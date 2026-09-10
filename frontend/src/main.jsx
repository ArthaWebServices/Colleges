import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';
import './index.css';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY || CLERK_PUBLISHABLE_KEY.includes('sample_clerk')) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-slate-800 font-sans text-center">
      <div className="max-w-md p-6 bg-white rounded-2xl shadow-lg border border-slate-200">
        <h2 className="text-lg font-bold text-rose-600 mb-2">Clerk Publishable Key Missing</h2>
        <p className="text-sm text-slate-600">
          Please verify that <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">VITE_CLERK_PUBLISHABLE_KEY</code> is configured in <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">frontend/.env</code>.
        </p>
      </div>
    </div>
  );
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ClerkProvider
          publishableKey={CLERK_PUBLISHABLE_KEY}
          afterSignOutUrl="/"
          signInUrl="/admin/login"
          signUpUrl="/admin/sign-up"
        >
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </ClerkProvider>
      </BrowserRouter>
    </>
  );
}

