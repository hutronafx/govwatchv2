import React from 'react';
import { ShieldCheck, Database, Search, ExternalLink, Lightbulb, Users } from 'lucide-react';
import { useLanguage } from '../i18n';

export const About: React.FC = () => {
    const { t } = useLanguage();
    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-8 fade-in">
            {/* Header */}
            <div className="text-center py-8">
                <h1 className="text-3xl font-bold mb-3">{t.abt_title}</h1>
                <p className="text-gw-muted text-base leading-relaxed max-w-xl mx-auto">{t.abt_subtitle}</p>
            </div>

            {/* Value proposition */}
            <div className="bg-gw-card border border-gw-border rounded-lg p-6 text-center" style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
                <Lightbulb className="w-8 h-8 text-gw-accent mx-auto mb-3" />
                <h2 className="text-xl font-bold mb-3">{t.abt_value_headline}</h2>
                <p className="text-gw-muted text-sm leading-relaxed max-w-2xl mx-auto">{t.abt_value_desc}</p>
            </div>

            {/* Mission cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { icon: ShieldCheck, title: t.abt_accountability, desc: t.abt_accountability_desc },
                    { icon: Database, title: t.abt_opendata, desc: t.abt_opendata_desc },
                    { icon: Search, title: t.abt_accessibility, desc: t.abt_accessibility_desc },
                ].map((card, i) => (
                    <div key={i} className="bg-gw-card border border-gw-border rounded-lg p-5" style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
                        <card.icon className="w-6 h-6 text-gw-accent mb-3" />
                        <h3 className="font-semibold mb-2">{card.title}</h3>
                        <p className="text-sm text-gw-muted leading-relaxed">{card.desc}</p>
                    </div>
                ))}
            </div>

            {/* Mission */}
            <div className="bg-gw-card border border-gw-border rounded-lg p-6" style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-gw-muted" /> {t.abt_mission_title}</h2>
                <div className="space-y-3 text-sm text-gw-muted leading-relaxed">
                    <p>{t.abt_mission_desc_1}</p>
                    <p>{t.abt_mission_desc_2}</p>
                </div>
            </div>

            {/* Content */}
            <div className="bg-gw-card border border-gw-border rounded-lg p-6 space-y-6" style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
                <section>
                    <h2 className="text-lg font-bold mb-3">{t.abt_methodology}</h2>
                    <p className="text-sm text-gw-muted leading-relaxed mb-3">{t.abt_methodology_text}</p>
                    <ul className="space-y-1.5 text-sm text-gw-muted ml-4 list-disc">
                        <li>Data collected via automated scripts and manual submissions.</li>
                        <li>Records classified into categories (Works, Supplies, Services).</li>
                        <li>Inconsistent ministry names standardized for accurate grouping.</li>
                    </ul>
                </section>

                <section className="border-t border-gw-border pt-6">
                    <h2 className="text-lg font-bold mb-3">{t.abt_similar}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[{ name: 'Sinar Project', url: 'https://sinarproject.org' }, { name: 'OpenTender.eu', url: 'https://opentender.eu' }].map(link => (
                            <a key={link.name} href={link.url} target="_blank" rel="noreferrer"
                                className="flex items-center justify-between p-3 bg-gw-bg rounded-lg border border-gw-border hover:border-gw-accent transition-colors" style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
                                <span className="font-medium text-sm">{link.name}</span>
                                <ExternalLink className="w-3.5 h-3.5 text-gw-muted" />
                            </a>
                        ))}
                    </div>
                </section>

                <section className="border-t border-gw-border pt-6">
                    <h2 className="text-lg font-bold mb-3">{t.abt_disclaimer}</h2>
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 p-4 rounded-lg text-sm text-gw-text" style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
                        <p className="mb-2"><strong className="text-gw-danger">{t.abt_not_official}</strong></p>
                        <p className="text-gw-muted leading-relaxed">GovWatch MY is a private, non-profit initiative. While we strive for accuracy, data is derived from third-party sources and may contain errors. Verify with official MOF documents before citing.</p>
                    </div>
                </section>
            </div>
        </div>
    );
};