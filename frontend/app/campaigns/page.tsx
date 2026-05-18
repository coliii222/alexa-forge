'use client';
import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import { api } from '../../lib/api';
import { t } from '../../lib/i18n';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const fetchCampaigns = () => {
    api.getCampaigns().then((c) => { setCampaigns(Array.isArray(c) ? c : []); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreateLoading(true);
    try {
      await api.createCampaign({ name, description });
      setShowCreate(false);
      setName('');
      setDescription('');
      fetchCampaigns();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">{t('camp.title')}</h1>
        <p className="page-subtitle">{t('camp.subtitle')}</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{t('camp.all')}</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            {t('camp.new')}
          </button>
        </div>

        {loading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : campaigns.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
            <p>{t('camp.no_campaigns')}</p>
          </div>
        ) : (
          <div className="grid-3" style={{ marginTop: 8 }}>
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{campaign.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {campaign.video_count ?? 0} {t('camp.videos')}
                    </div>
                  </div>
                </div>
                {campaign.description && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{campaign.description}</p>
                )}
                <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                  {t('camp.created')} {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{t('camp.create_title')}</h2>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">{t('camp.name')}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('camp.name_placeholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('camp.desc')}</label>
                <textarea
                  className="form-textarea"
                  placeholder={t('camp.desc_placeholder')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ minHeight: 80 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)} style={{ flex: 1 }}>{t('camp.cancel')}</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={createLoading}>
                  {createLoading ? t('camp.creating') : t('camp.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
