import React, { useState, useEffect } from 'react';
import { Eye, LayoutDashboard, Building2, Store, Info, Languages, Lock, Sun, Moon } from 'lucide-react';
import { useLanguage } from '../i18n';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onNavigate: (view: any) => void;
  isLoading?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeView, onNavigate, isLoading }) => {
  const { language, toggleLanguage, t } = useLanguage();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('gw-theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gw-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  const navItemClass = (isActive: boolean) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
      ? 'bg-gw-accent/10 text-gw-accent'
      : 'text-gw-muted hover:text-gw-text hover:bg-gw-bg-alt'
    } ${isLoading ? 'opacity-40 pointer-events-none' : ''}`;

  return (
    <div className="min-h-screen bg-gw-bg text-gw-text font-sans flex flex-col" style={{ transition: 'background-color 0.2s, color 0.2s' }}>
      <nav className="sticky top-0 z-50 bg-gw-card border-b border-gw-border" style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div
              className={`flex items-center gap-2 ${isLoading ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}
              onClick={() => !isLoading && onNavigate('dashboard')}
            >
              <Eye className="w-5 h-5 text-gw-accent" />
              <span className="font-bold text-base text-gw-text">GovWatch <span className="text-gw-muted font-normal text-sm">MY</span></span>
            </div>

            {/* Nav links */}
            <div className="flex items-center gap-1">
              <button onClick={() => !isLoading && onNavigate('dashboard')} className={navItemClass(activeView === 'dashboard')} disabled={isLoading}>
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">{t.nav_dashboard}</span>
              </button>
              <button onClick={() => !isLoading && onNavigate('ministry_list')} className={navItemClass(activeView.includes('ministry'))} disabled={isLoading}>
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">{t.nav_ministries}</span>
              </button>
              <button onClick={() => !isLoading && onNavigate('vendor_list')} className={navItemClass(activeView === 'vendor_list' || activeView === 'vendor_detail')} disabled={isLoading}>
                <Store className="w-4 h-4" />
                <span className="hidden sm:inline">{t.nav_vendors}</span>
              </button>
              <button onClick={() => !isLoading && onNavigate('about')} className={navItemClass(activeView === 'about')} disabled={isLoading}>
                <Info className="w-4 h-4" />
                <span className="hidden sm:inline">{t.nav_about}</span>
              </button>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              <button onClick={toggleTheme} className="p-2 rounded-md text-gw-muted hover:text-gw-text hover:bg-gw-bg-alt transition-colors" title={theme === 'light' ? 'Dark mode' : 'Light mode'}>
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              <button onClick={toggleLanguage} className="px-2 py-1.5 rounded-md text-xs font-mono font-semibold text-gw-muted hover:text-gw-text hover:bg-gw-bg-alt transition-colors" title="Switch Language">
                {language === 'en' ? 'BM' : 'EN'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8 flex-grow w-full">
        {children}
      </main>

      <footer className="border-t border-gw-border py-5 mt-auto" style={{ transition: 'border-color 0.2s' }}>
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gw-muted">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gw-text">GovWatch MY</span>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Built by <span className="text-gw-text-secondary font-medium">Ronan Ooi</span></span>
            <span>·</span>
            <a href="https://www.ipohmun.org" target="_blank" rel="noreferrer" className="text-gw-link hover:underline">IpohMUN</a>
            <button onClick={() => onNavigate('upload')} className="text-gw-muted hover:text-gw-text transition-colors ml-1" title="Admin">
              <Lock className="w-3 h-3" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};