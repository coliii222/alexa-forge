'use client';
import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import { api } from '../../lib/api';

export default function VaultPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [provider, setProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const fetchKeys = () => {
    api.getKeys().then((k) => { setKeys(Array.isArray(k) ? k : []); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAddLoading(true);
    try {
      await api.addKey({ provider, key: apiKey });
      setShowAdd(false);
      setProvider('');
      setApiKey('');
      fetchKeys();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this API key?')) return;
    try {
      await api.deleteKey(id);
      fetchKeys();
    } catch {}
  };

  const handleToggle = async (id: string) => {
    try {
      await api.toggleKey(id);
      fetchKeys();
    } catch {}
  };

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">API Vault</h1>
        <p className="page-subtitle">Manage your API keys for video generation providers</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">API Keys</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Key
          </button>
        </div>

        {loading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : keys.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>
            <p>No API keys configured. Add one to start generating videos.</p>
          </div>
        ) : (
          <div>
            {keys.map((key) => (
              <div key={key.id} className="key-item">
                <div className="key-info">
                  <div>
                    <div className="key-provider">{key.provider}</div>
                    <div className="key-value">{key.key_preview || '••••••••'}</div>
                  </div>
                </div>
                <div className="key-actions">
                  <span className={`badge ${key.active !== false ? 'badge-success' : 'badge-error'}`}>
                    {key.active !== false ? 'Active' : 'Disabled'}
                  </span>
                  <div className={`toggle ${key.active !== false ? 'active' : ''}`} onClick={() => handleToggle(key.id)} />
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(key.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Add API Key</h2>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label className="form-label">Provider</label>
                <select className="form-select" value={provider} onChange={(e) => setProvider(e.target.value)} required>
                  <option value="">Select provider</option>
                  <option value="minimax">Minimax</option>
                  <option value="runway">Runway</option>
                  <option value="kling">Kling</option>
                  <option value="pika">Pika</option>
                  <option value="openai">OpenAI</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">API Key</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={addLoading}>
                  {addLoading ? 'Adding...' : 'Add Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
