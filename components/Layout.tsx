import React from 'react';
import { Eye, LayoutDashboard, Building2, Store, Info, Languages, Lock } from 'lucide-react';
import { useLanguage } from '../i18n';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onNavigate: (view: any) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeView, onNavigate }) => {
  const { language, toggleLanguage, t } = useLanguage();

  const navItemClass = (isActive: boolean) => 
    `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive 
        ? 'bg-gw-card text-white shadow-sm ring-1 ring-gw-border' 
        : 'text-gw-muted hover:text-white hover:bg-gw-card/50'
    }`;

  return (
    <div className="min-h-screen bg-gw-bg text-gw-text font-sans flex flex-col">
      <nav className="sticky top-0 z-50 bg-gw-bg/95 backdrop-blur border-b border-gw-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
              <div className="bg-gw-success/10 p-2 rounded-lg border border-gw-success/20">
                <Eye className="w-6 h-6 text-gw-success" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white">GovWatch <span className="text-gw-muted font-normal">MY</span></span>
            </div>
            
            <div className="flex items-center space-x-1 md:space-x-2">
              <button
                onClick={() => onNavigate('dashboard')}
                className={navItemClass(activeView === 'dashboard')}
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">{t.nav_dashboard}</span>
              </button>
              <button
                onClick={() => onNavigate('ministry_list')}
                className={navItemClass(activeView.includes('ministry'))}
              >
                <Building2 className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">{t.nav_ministries}</span>
              </button>
              <button
                onClick={() => onNavigate('vendor_list')}
                className={navItemClass(activeView === 'vendor_list')}
              >
                <Store className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">{t.nav_vendors}</span>
              </button>
              <button
                onClick={() => onNavigate('about')}
                className={navItemClass(activeView === 'about')}
              >
                <Info className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">{t.nav_about}</span>
              </button>
              
              <div className="w-px h-6 bg-gw-border mx-2"></div>
              
              {/* Language Toggle */}
              <button 
                onClick={toggleLanguage}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold text-gw-muted hover:text-white hover:bg-gw-card/50 transition-colors"
                title="Switch Language"
              >
                <Languages className="w-4 h-4" />
                <span className={language === 'en' ? 'text-white' : 'text-gw-muted'}>EN</span>
                <span className="text-gw-border">|</span>
                <span className={language === 'ms' ? 'text-white' : 'text-gw-muted'}>BM</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        {children}
      </main>
      <footer className="border-t border-gw-border py-8 mt-8 bg-gw-card/30">
        <div className="max-w-7xl mx-auto px-4 text-center">
            {/* Developer Credit */}
            <div className="mb-6 pb-6 border-b border-gw-border/50">
               <p className="text-white font-bold uppercase tracking-wider text-xs mb-1 opacity-80">{t.ftr_developer}</p>
               <p className="text-gw-success font-bold text-lg mb-1">Ronan Ooi</p>
               <p className="text-sm text-gw-muted">
                 {t.ftr_role} <a href="https://www.ipohmun.org" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline transition-colors">IpohMUN</a>
               </p>
               <p className="text-xs text-gw-muted mt-2 opacity-70 italic font-mono">{t.ftr_built}</p>
            </div>

            <p className="text-sm text-gw-text font-semibold">GovWatch MY</p>
            <p className="text-xs text-gw-muted mt-2 mb-4">
                &copy; {new Date().getFullYear()} Public Procurement Monitoring Initiative.
            </p>
            
            <button 
                onClick={() => onNavigate('upload')} 
                className="text-gw-border hover:text-gw-muted transition-colors p-2"
                title="Admin Access"
            >
                <Lock className="w-3 h-3" />
            </button>
        </div>
      </footer>
    </div>
  );
};