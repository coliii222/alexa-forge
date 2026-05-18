'use client';
import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import { api } from '../../lib/api';

export default function StudioPage() {
  const [mode, setMode] = useState('text-to-video');
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [provider, setProvider] = useState('minimax');
  const [dryRun, setDryRun] = useState(false);
  const [campaignId, setCampaignId] = useState('');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [presets, setPresets] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.getCampaigns().then(setCampaigns).catch(() => {});
    api.getPresets().then(setPresets).catch(() => {});
    api.getTasks().then((t) => setTasks(Array.isArray(t) ? t.slice(0, 10) : [])).catch(() => {});
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await api.generateVideo({
        mode,
        prompt,
        image_url: imageUrl || undefined,
        provider,
        dry_run: dryRun,
        campaign_id: campaignId || undefined,
      });
      setSuccess(`Task created: ${res.task_id || res.id || 'Success'}`);
      setPrompt('');
      setImageUrl('');
      // Refresh tasks
      api.getTasks().then((t) => setTasks(Array.isArray(t) ? t.slice(0, 10) : [])).catch(() => {});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.uploadImage(file);
      setImageUrl(res.url || res.image_url || '');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Motion Studio</h1>
        <p className="page-subtitle">Generate AI-powered videos from text or images</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Generate Video</h3>
          </div>
          {error && <div className="form-error">{error}</div>}
          {success && <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: 'var(--success)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 16 }}>{success}</div>}
          <form onSubmit={handleGenerate}>
            <div className="form-group">
              <label className="form-label">Mode</label>
              <select className="form-select" value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="text-to-video">Text to Video</option>
                <option value="image-to-video">Image to Video</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Prompt</label>
              <textarea
                className="form-textarea"
                placeholder="Describe the video you want to generate..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
              />
            </div>
            {mode === 'image-to-video' && (
              <div className="form-group">
                <label className="form-label">Image</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Image URL or upload below"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <input type="file" accept="image/*" onChange={handleUpload} style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Provider</label>
              <select className="form-select" value={provider} onChange={(e) => setProvider(e.target.value)}>
                <option value="minimax">Minimax</option>
                <option value="runway">Runway</option>
                <option value="kling">Kling</option>
                <option value="pika">Pika</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Campaign (optional)</label>
              <select className="form-select" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
                <option value="">No campaign</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div className={`toggle ${dryRun ? 'active' : ''}`} onClick={() => setDryRun(!dryRun)} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Dry Run (test without generating)</span>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Video'}
            </button>
          </form>

          {presets.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Presets</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {presets.map((p, i) => (
                  <button key={i} className="btn btn-secondary btn-sm" onClick={() => { setPrompt(p.prompt || ''); setMode(p.mode || mode); setProvider(p.provider || provider); }}>
                    {p.name || `Preset ${i + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Tasks</h3>
          </div>
          {tasks.length === 0 ? (
            <div className="empty-state"><p>No tasks yet. Generate your first video!</p></div>
          ) : (
            <div className="activity-list">
              {tasks.map((task, i) => (
                <div key={i} className="activity-item">
                  <div className="activity-dot" style={{
                    background: task.status === 'completed' ? 'var(--success)' :
                      task.status === 'failed' ? 'var(--error)' :
                      task.status === 'processing' ? 'var(--warning)' : 'var(--accent)'
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {task.prompt || task.id}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {task.provider} • {task.mode}
                    </div>
                  </div>
                  <span className={`badge ${task.status === 'completed' ? 'badge-success' : task.status === 'failed' ? 'badge-error' : 'badge-warning'}`}>
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
