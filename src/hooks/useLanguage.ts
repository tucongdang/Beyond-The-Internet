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
    const handleStorageChange = () => {
      try {
        setLocalLanguage(localStorage.getItem('bti_lang') || 'vi');
      } catch {}
    };
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen to a custom event for same-tab updates if needed
    const handleCustomChange = (e: CustomEvent) => {
      setLocalLanguage(e.detail);
    };
    window.addEventListener('languageChange', handleCustomChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('languageChange', handleCustomChange as EventListener);
    };
  }, []);

  const toggleLanguage = () => {
    const nextVal = localLanguage === 'vi' ? 'en' : 'vi';
    setLocalLanguage(nextVal);
    try {
      localStorage.setItem('bti_lang', nextVal);
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('languageChange', { detail: nextVal }));
    } catch {}
  };

  return { localLanguage, toggleLanguage, setLocalLanguage, isNonVi: isNonVi(localLanguage) };
}
