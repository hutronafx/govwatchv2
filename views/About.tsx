import React from 'react';
import { ShieldCheck, Database, Search, ExternalLink } from 'lucide-react';
import { useLanguage } from '../i18n';

export const About: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="animate-fadeIn max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Header */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl font-bold text-white">{t.abt_title}</h1>
        <p className="text-xl text-gw-muted max-w-2xl mx-auto">
            {t.abt_subtitle}
        </p>
      </div>

      {/* Mission Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gw-card border border-gw-border rounded-lg p-6">
            <ShieldCheck className="w-10 h-10 text-gw-success mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">{t.abt_accountability}</h3>
            <p className="text-sm text-gw-muted">
                {t.abt_accountability_desc}
            </p>
        </div>
        <div className="bg-gw-card border border-gw-border rounded-lg p-6">
            <Database className="w-10 h-10 text-gw-success mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">{t.abt_opendata}</h3>
            <p className="text-sm text-gw-muted">
                {t.abt_opendata_desc}
            </p>
        </div>
        <div className="bg-gw-card border border-gw-border rounded-lg p-6">
            <Search className="w-10 h-10 text-gw-success mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">{t.abt_accessibility}</h3>
            <p className="text-sm text-gw-muted">
                {t.abt_accessibility_desc}
            </p>
        </div>
      </div>

      {/* Content Sections */}
      <div className="bg-gw-card border border-gw-border rounded-lg p-8 space-y-8">
        
        <section>
            <h2 className="text-2xl font-bold text-white mb-4">{t.abt_methodology}</h2>
            <p className="text-gw-text leading-relaxed mb-4">
                GovWatch aggregates data from public government portals, specifically the MyProcurement and MyGPIS systems managed by the Ministry of Finance. 
            </p>
            <ul className="list-disc list-inside space-y-2 text-gw-muted ml-4">
                <li>Data is collected via automated scripts and manual submissions.</li>
                <li>We classify records into categories (Works, Supplies, Services).</li>
                <li>We standardize inconsistent ministry names (e.g., "Kementerian Kesihatan" vs "KKM").</li>
            </ul>
        </section>

        <section className="border-t border-gw-border pt-8">
            <h2 className="text-2xl font-bold text-white mb-4">{t.abt_similar}</h2>
            <p className="text-gw-muted mb-4">
                We draw inspiration from global leaders in open data:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a href="https://sinarproject.org" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-gw-bg rounded border border-gw-border hover:border-gw-success transition-colors group">
                    <span className="font-semibold text-white">Sinar Project</span>
                    <ExternalLink className="w-4 h-4 text-gw-muted group-hover:text-gw-success" />
                </a>
                <a href="https://opentender.eu" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-gw-bg rounded border border-gw-border hover:border-gw-success transition-colors group">
                    <span className="font-semibold text-white">OpenTender.eu</span>
                    <ExternalLink className="w-4 h-4 text-gw-muted group-hover:text-gw-success" />
                </a>
            </div>
        </section>

        <section className="border-t border-gw-border pt-8">
            <h2 className="text-2xl font-bold text-white mb-4">{t.abt_disclaimer}</h2>
            <div className="bg-gw-danger/10 border border-gw-danger/20 p-4 rounded text-sm text-gw-text">
                <p className="mb-2">
                    <strong>{t.abt_not_official}</strong>
                </p>
                <p>
                    GovWatch MY is a private, non-profit initiative. While we strive for accuracy, data is derived from third-party sources and may contain errors. Please verify all information with official Ministry of Finance documents before citing.
                </p>
            </div>
        </section>

      </div>
    </div>
  );
};