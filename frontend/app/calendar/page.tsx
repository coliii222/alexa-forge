'use client';
import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import { api } from '../../lib/api';

export default function CalendarPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [taskId, setTaskId] = useState('');
  const [platform, setPlatform] = useState('tiktok');
  const [scheduledAt, setScheduledAt] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const [t, p] = await Promise.all([api.getTasks(), api.getScheduled()]);
    setTasks(t.filter((x: any) => x.status === 'completed'));
    setPosts(p);
  }

  useEffect(() => { load().catch(() => {}); }, []);

  async function createPost() {
    setError('');
    try {
      await api.createScheduled({ task_id: Number(taskId), platform, scheduled_at: scheduledAt, caption });
      setTaskId(''); setScheduledAt(''); setCaption('');
      await load();
    } catch (e: any) { setError(e.message || 'Failed'); }
  }

  async function remove(id: number) {
    await api.deleteScheduled(id).catch(() => {});
    await load();
  }

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Content Calendar</h1>
        <p className="page-subtitle">Schedule generated videos for TikTok, Instagram, or YouTube Shorts. Connector publishing is placeholder-ready.</p>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header"><h3 className="card-title">Schedule Post</h3></div>
        {error && <div className="error-message">{error}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <select className="form-input" value={taskId} onChange={e => setTaskId(e.target.value)}>
            <option value="">Select generated video</option>
            {tasks.map(t => <option key={t.id} value={t.id}>#{t.id} · {t.mode} · {t.provider}</option>)}
          </select>
          <select className="form-input" value={platform} onChange={e => setPlatform(e.target.value)}>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram Reels</option>
            <option value="youtube_shorts">YouTube Shorts</option>
          </select>
          <input className="form-input" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
        </div>
        <textarea className="form-input" rows={3} style={{ marginTop: 10 }} value={caption} onChange={e => setCaption(e.target.value)} placeholder="Post caption..." />
        <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={createPost} disabled={!taskId || !scheduledAt}>Schedule</button>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {posts.map(p => (
          <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 800 }}>{p.platform} · Task #{p.task_id}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.scheduled_at} · {p.status}</div>
              {p.caption && <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: 13 }}>{p.caption}</div>}
            </div>
            <button className="btn btn-sm" onClick={() => remove(p.id)}>Delete</button>
          </div>
        ))}
        {posts.length === 0 && <div className="empty-state">No scheduled posts yet.</div>}
      </div>
    </AppShell>
  );
}
