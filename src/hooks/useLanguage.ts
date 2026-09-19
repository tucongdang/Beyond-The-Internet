import { useState, useEffect } from 'react';

export function isNonVi(lang?: string): boolean {
  return Boolean(lang && lang !== 'vi');
}

export function useLanguage() {
  const [localLanguage, setLocalLanguage] = useState<string>(() => {
    try {
      return localStorage.getItem('bti_lang') || 'vi';
    } catch {
      return 'vi';
    }
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = localLanguage || 'vi';
    }
  }, [localLanguage]);

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const lang = localStorage.getItem('bti_lang') || 'vi';
        setLocalLanguage(lang);
        if (typeof document !== 'undefined') {
          document.documentElement.lang = lang;
        }
      } catch {}
    };
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen to a custom event for same-tab updates if needed
    const handleCustomChange = (e: CustomEvent) => {
      if (e.detail) {
        setLocalLanguage(e.detail);
        if (typeof document !== 'undefined') {
          document.documentElement.lang = e.detail;
        }
      }
    };
    window.addEventListener('languageChange', handleCustomChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('languageChange', handleCustomChange as EventListener);
    };
  }, []);

  const selectLanguage = (code: string) => {
    setLocalLanguage(code);
    try {
      localStorage.setItem('bti_lang', code);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = code || 'vi';
      }
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('languageChange', { detail: code }));
    } catch {}
  };

  const toggleLanguage = () => {
    const nextVal = localLanguage === 'vi' ? 'en' : 'vi';
    selectLanguage(nextVal);
  };

  return { localLanguage, toggleLanguage, selectLanguage, setLocalLanguage, isNonVi: isNonVi(localLanguage) };
}
