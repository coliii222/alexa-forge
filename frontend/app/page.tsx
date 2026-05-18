'use client';
import { t } from '../lib/i18n';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'inherit' }}>
      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(109,92,255,0.2); }
          50% { box-shadow: 0 0 40px rgba(109,92,255,0.4); }
        }
        .land-fade-1 { animation: fadeInUp 0.6s ease forwards; opacity: 0; }
        .land-fade-2 { animation: fadeInUp 0.6s ease 0.15s forwards; opacity: 0; }
        .land-fade-3 { animation: fadeInUp 0.6s ease 0.3s forwards; opacity: 0; }
        .land-fade-4 { animation: fadeInUp 0.6s ease 0.45s forwards; opacity: 0; }
        .land-card:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 20px 40px rgba(109,92,255,0.15); }
        .land-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(109,92,255,0.4); }
        .land-btn-secondary:hover { transform: translateY(-2px); border-color: var(--accent); }
        .land-pricing-card:hover { border-color: var(--accent); box-shadow: 0 0 30px rgba(109,92,255,0.2); }
        .land-pricing-featured { animation: pulse-glow 3s ease-in-out infinite; }
        @media (max-width: 768px) {
          .land-hero-title { font-size: 2.2rem !important; }
          .land-features-grid { grid-template-columns: 1fr !important; }
          .land-pricing-grid { grid-template-columns: 1fr !important; }
          .land-steps-grid { grid-template-columns: 1fr !important; }
          .land-header-btns { gap: 8px !important; }
          .land-header-btns a { padding: 8px 14px !important; font-size: 13px !important; }
          .land-hero-btns { flex-direction: column; align-items: center; }
        }
      `}</style>

      {/* Sticky Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 32px',
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.5px' }}>Alexa Forge</span>
        </div>
        <div className="land-header-btns" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/login" style={{
            padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500,
            color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s',
          }}>{t('auth.login')}</a>
          <a href="/register" style={{
            padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
            background: 'var(--accent)', color: '#fff', textDecoration: 'none',
            transition: 'all 0.2s',
          }}>{t('auth.register')}</a>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        padding: '100px 32px 80px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background gradient orbs */}
        <div style={{
          position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(109,92,255,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '30%', right: '-10%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <h1 className="land-fade-1 land-hero-title" style={{
          fontSize: '3.5rem',
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: 20,
          background: 'linear-gradient(135deg, #f0f0f5 0%, #6d5cff 50%, #a78bfa 100%)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'fadeInUp 0.6s ease forwards, shimmer 4s linear infinite',
          maxWidth: 800,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          {t('land.hero_title')}
        </h1>
        <p className="land-fade-2" style={{
          fontSize: '1.2rem',
          color: 'var(--text-secondary)',
          maxWidth: 600,
          margin: '0 auto 40px',
          lineHeight: 1.6,
        }}>
          {t('land.hero_subtitle')}
        </p>
        <div className="land-fade-3 land-hero-btns" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/register" className="land-btn-primary" style={{
            padding: '14px 32px', borderRadius: 10, fontSize: 16, fontWeight: 600,
            background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
            color: '#fff', textDecoration: 'none', transition: 'all 0.3s',
            boxShadow: '0 4px 15px rgba(109,92,255,0.3)',
          }}>
            {t('land.cta_start')}
          </a>
          <a href="#features" className="land-btn-secondary" style={{
            padding: '14px 32px', borderRadius: 10, fontSize: 16, fontWeight: 600,
            border: '1px solid var(--border)', color: 'var(--text-primary)',
            textDecoration: 'none', transition: 'all 0.3s', background: 'transparent',
          }}>
            {t('land.cta_demo')}
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ padding: '80px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <h2 className="land-fade-1" style={{
          textAlign: 'center', fontSize: '2.2rem', fontWeight: 700, marginBottom: 12,
        }}>
          {t('land.features_title')}
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 48, fontSize: '1.05rem' }}>
          Everything you need to create stunning AI videos at scale
        </p>
        <div className="land-features-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
        }}>
          {[
            { icon: '🔗', titleKey: 'land.feat_1_title', descKey: 'land.feat_1_desc' },
            { icon: '🎨', titleKey: 'land.feat_2_title', descKey: 'land.feat_2_desc' },
            { icon: '⚡', titleKey: 'land.feat_3_title', descKey: 'land.feat_3_desc' },
            { icon: '🎬', titleKey: 'land.feat_4_title', descKey: 'land.feat_4_desc' },
            { icon: '📐', titleKey: 'land.feat_5_title', descKey: 'land.feat_5_desc' },
            { icon: '📊', titleKey: 'land.feat_6_title', descKey: 'land.feat_6_desc' },
          ].map((feat, i) => (
            <div key={i} className="land-card" style={{
              padding: 28,
              borderRadius: 16,
              background: 'rgba(18,18,26,0.6)',
              border: '1px solid var(--border)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              cursor: 'default',
            }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{feat.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                {t(feat.titleKey)}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                {t(feat.descKey)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: '80px 32px', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2.2rem', fontWeight: 700, marginBottom: 48 }}>
          {t('land.how_title')}
        </h2>
        <div className="land-steps-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 32,
        }}>
          {[
            { num: '01', titleKey: 'land.step_1', descKey: 'land.step_1_desc', color: '#6d5cff' },
            { num: '02', titleKey: 'land.step_2', descKey: 'land.step_2_desc', color: '#a78bfa' },
            { num: '03', titleKey: 'land.step_3', descKey: 'land.step_3_desc', color: '#22c55e' },
          ].map((step, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: `linear-gradient(135deg, ${step.color}22, ${step.color}44)`,
                border: `2px solid ${step.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', fontSize: 18, fontWeight: 700, color: step.color,
              }}>
                {step.num}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{t(step.titleKey)}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                {t(step.descKey)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section style={{ padding: '80px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2.2rem', fontWeight: 700, marginBottom: 48 }}>
          {t('land.pricing_title')}
        </h2>
        <div className="land-pricing-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
          alignItems: 'start',
        }}>
          {/* Free Tier */}
          <div className="land-pricing-card" style={{
            padding: 32, borderRadius: 16,
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            transition: 'all 0.3s',
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{t('land.free_title')}</h3>
            <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>{t('land.free_price')}</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>5 credits/day</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {t('land.free_features').split(',').map((f, i) => (
                <li key={i} style={{ padding: '8px 0', fontSize: 14, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--success)' }}>✓</span> {f.trim()}
                </li>
              ))}
            </ul>
            <a href="/register" style={{
              display: 'block', textAlign: 'center', marginTop: 24,
              padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              border: '1px solid var(--border)', color: 'var(--text-primary)',
              textDecoration: 'none', transition: 'all 0.2s',
            }}>{t('land.cta_start')}</a>
          </div>

          {/* Pro Tier */}
          <div className="land-pricing-card land-pricing-featured" style={{
            padding: 32, borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(109,92,255,0.08), rgba(167,139,250,0.05))',
            border: '2px solid var(--accent)',
            transition: 'all 0.3s',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700,
              padding: '4px 12px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>Popular</div>
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{t('land.pro_title')}</h3>
            <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>{t('land.pro_price')}</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Unlimited generations</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {t('land.pro_features').split(',').map((f, i) => (
                <li key={i} style={{ padding: '8px 0', fontSize: 14, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--success)' }}>✓</span> {f.trim()}
                </li>
              ))}
            </ul>
            <a href="/register" style={{
              display: 'block', textAlign: 'center', marginTop: 24,
              padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              background: 'var(--accent)', color: '#fff',
              textDecoration: 'none', transition: 'all 0.2s',
            }}>{t('land.cta_start')}</a>
          </div>

          {/* Enterprise Tier */}
          <div className="land-pricing-card" style={{
            padding: 32, borderRadius: 16,
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            transition: 'all 0.3s',
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{t('land.enterprise_title')}</h3>
            <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>{t('land.enterprise_price')}</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Tailored for your team</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {t('land.enterprise_features').split(',').map((f, i) => (
                <li key={i} style={{ padding: '8px 0', fontSize: 14, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--success)' }}>✓</span> {f.trim()}
                </li>
              ))}
            </ul>
            <a href="mailto:hello@alexaforge.ai" style={{
              display: 'block', textAlign: 'center', marginTop: 24,
              padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              border: '1px solid var(--border)', color: 'var(--text-primary)',
              textDecoration: 'none', transition: 'all 0.2s',
            }}>Contact Sales</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px 32px',
        borderTop: '1px solid var(--border)',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Alexa Forge</span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
          {t('land.footer_text')}
        </p>
        <div style={{ marginTop: 16, display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/login" style={{ color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none' }}>Login</a>
          <a href="/register" style={{ color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none' }}>Register</a>
          <a href="#features" style={{ color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none' }}>Features</a>
        </div>
      </footer>
    </div>
  );
}
