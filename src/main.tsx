import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AnimationControlProvider } from './contexts/AnimationControlContext';
import './index.css';

function initApp() {
  let rootElement = document.getElementById('root');
  if (!rootElement) {
    rootElement = document.createElement('div');
    rootElement.id = 'root';
    if (document.body) {
      document.body.appendChild(rootElement);
    } else if (document.documentElement) {
      document.documentElement.appendChild(rootElement);
    }
  }

  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <AnimationControlProvider>
          <App />
        </AnimationControlProvider>
      </StrictMode>,
    );
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

