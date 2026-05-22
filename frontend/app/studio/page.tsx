'use client';
import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import { api } from '../../lib/api';
import { t } from '../../lib/i18n';

const MODE_ICONS: Record<string, string> = {
  motion: '🎬', product: '🛍️', batch: '📦', template: '🎭', audio: '🎵', style: '🎨', free: '✨'
};

const TEMPLATE_PREVIEWS: Record<string, { icon: string; gradient: string; label: string }> = {
  unboxing: { icon: '📦', gradient: 'linear-gradient(135deg, #f59e0b, #ec4899)', label: 'Reveal' },
  product_review: { icon: '🎙️', gradient: 'linear-gradient(135deg, #0ea5e9, #f59e0b)', label: 'Review' },
  before_after: { icon: '✨', gradient: 'linear-gradient(135deg, #f59e0b, #22c55e)', label: 'Before / After' },
  testimonial: { icon: '💬', gradient: 'linear-gradient(135deg, #14b8a6, #22c55e)', label: 'Testimonial' },
  ootd_showcase: { icon: '👗', gradient: 'linear-gradient(135deg, #ec4899, #f97316)', label: 'Fashion' },
  dance_viral: { icon: '💃', gradient: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', label: 'Dance' },
  lifestyle_ad: { icon: '🌿', gradient: 'linear-gradient(135deg, #22c55e, #84cc16)', label: 'Lifestyle' },
  comparison: { icon: '⚖️', gradient: 'linear-gradient(135deg, #64748b, #0ea5e9)', label: 'Compare' },
};

function templatePreview(id: string) {
  return TEMPLATE_PREVIEWS[id] || { icon: '🎬', gradient: 'linear-gradient(135deg, #f59e0b, #0ea5e9)', label: 'Template' };
}

export default function StudioPage() {
  const [modes, setModes] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [formats, setFormats] = useState<any>({});
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedMode, setSelectedMode] = useState('product_promo');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [exportFormat, setExportFormat] = useState('tiktok_reels');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('');
  const [slots, setSlots] = useState<any>({
    person_image: '', product_image: '', motion_reference: '', style_reference: '', audio_reference: '',
    person_desc: '', product_desc: '', motion_desc: '',
  });
  const [batchMode, setBatchMode] = useState(false);
  const [variantImages, setVariantImages] = useState('');
  const [variantSlot, setVariantSlot] = useState('person_image');
  const [dryRun, setDryRun] = useState(false);
  const [captionEnabled, setCaptionEnabled] = useState(true);
  const [captionStyle, setCaptionStyle] = useState('viral');
  const [captionText, setCaptionText] = useState('');
  const [captionPosition, setCaptionPosition] = useState('top');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [videoDuration, setVideoDuration] = useState('5');
  const [models, setModels] = useState<any>({image: [], video: []});
  const [selectedModel, setSelectedModel] = useState('');

  useEffect(() => {
    fetch('/api/pipeline/modes', { headers: authHeaders() }).then(r => r.json()).then(setModes).catch(() => {});
    fetch('/api/pipeline/templates', { headers: authHeaders() }).then(r => r.json()).then(setTemplates).catch(() => {});
    fetch('/api/pipeline/formats', { headers: authHeaders() }).then(r => r.json()).then(setFormats).catch(() => {});
    fetch('/api/models', { headers: authHeaders() }).then(r => r.json()).then(setModels).catch(() => {});
    api.getAssets().then(setAssets).catch(() => {});
  }, []);

  function authHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function updateSlot(key: string, value: string) {
    setSlots((prev: any) => ({ ...prev, [key]: value }));
  }

  async function handleUpload(slotKey: string, file: File) {
    setUploading(slotKey);
    try {
      const res = await api.uploadImage(file);
      updateSlot(slotKey, res.url || res.path || '');
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  }

  async function handleGenerate() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const cleanSlots = Object.fromEntries(Object.entries(slots).filter(([_, v]) => v));

      if (batchMode) {
        const images = variantImages.split('\n').map(s => s.trim()).filter(Boolean);
        const res = await fetch('/api/pipeline/batch', {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: selectedMode,
            template_id: selectedTemplate || undefined,
            base_slots: cleanSlots,
            variant_images: images,
            variant_slot: variantSlot,
            prompt, style,
            captions: { enabled: captionEnabled, hook_style: captionStyle, text: captionText || undefined, position: captionPosition },
            export_format: exportFormat,
            dry_run: dryRun,
          }),
        });
        setResult(await res.json());
      } else {
        const res = await fetch('/api/pipeline/generate', {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: selectedMode,
            template_id: selectedTemplate || undefined,
            slots: cleanSlots,
            prompt, style,
            model: selectedModel || undefined,
            duration: videoDuration,
            captions: { enabled: captionEnabled, hook_style: captionStyle, text: captionText || undefined, position: captionPosition },
            export_format: exportFormat,
            dry_run: dryRun,
          }),
        });
        const data = await res.json();
        setResult(data);
        // Auto-poll if task is running
        if (data.id && data.status === 'running') {
          pollTaskStatus(data.id);
        }
      }
    } catch (e: any) {
      setError(e.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  async function pollTaskStatus(taskId: number) {
    setPolling(true);
    const maxAttempts = 60; // 3 min max (60 * 3s)
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const res = await fetch(`/api/tasks/${taskId}`, { headers: authHeaders() });
        const data = await res.json();
        setResult(data);
        if (data.status === 'completed' || data.status === 'failed') {
          setPolling(false);
          return;
        }
      } catch { /* retry */ }
    }
    setPolling(false);
  }

  const currentMode = modes.find(m => m.id === selectedMode);
  const isVideoMode = ['motion_transfer', 'product_promo', 'dance_viral', 'template_scene', 'audio_sync', 'style_transfer'].includes(selectedMode);
  const availableModels = isVideoMode ? models.video : models.image;
  const showPersonSlot = ['product_promo', 'motion_transfer', 'template_scene', 'style_transfer', 'audio_sync', 'freeform'].includes(selectedMode);
  const showProductSlot = ['product_promo', 'template_scene', 'freeform'].includes(selectedMode);
  const showMotionSlot = ['motion_transfer', 'freeform'].includes(selectedMode);
  const showStyleSlot = ['style_transfer', 'freeform'].includes(selectedMode);
  const showAudioSlot = ['audio_sync', 'freeform'].includes(selectedMode);

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">{t('studio.title')}</h1>
        <p className="page-subtitle">{t('studio.subtitle')}</p>
      </div>

      {/* Mode Selector */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3 className="card-title">{t('studio.pipeline_mode')}</h3></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, padding: '12px 0' }}>
          {modes.map(m => (
            <button key={m.id} onClick={() => { setSelectedMode(m.id); setSelectedTemplate(''); }}
              className={`mode-btn ${selectedMode === m.id ? 'active' : ''}`}
              style={{
                padding: '14px 12px', borderRadius: 10, border: selectedMode === m.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: selectedMode === m.id ? 'rgba(245,158,11,0.1)' : 'var(--bg-surface)', cursor: 'pointer', textAlign: 'center',
              }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{MODE_ICONS[m.icon] || '⚡'}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{t(`studio.mode_desc.${m.id}`) || m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid-2">
        {/* Left: Input Slots */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">{t('studio.input_slots')}</h3></div>

          {showPersonSlot && (
            <SlotUpload label={t('studio.person_subject')} slotKey="person_image" value={slots.person_image}
              desc={slots.person_desc} descKey="person_desc"
              onUrlChange={(v) => updateSlot('person_image', v)}
              onDescChange={(v) => updateSlot('person_desc', v)}
              onFile={(f) => handleUpload('person_image', f)}
              assets={assets.filter(a => a.media_type === 'image')}
              uploading={uploading === 'person_image'} />
          )}

          {showProductSlot && (
            <SlotUpload label={t('studio.product')} slotKey="product_image" value={slots.product_image}
              desc={slots.product_desc} descKey="product_desc"
              onUrlChange={(v) => updateSlot('product_image', v)}
              onDescChange={(v) => updateSlot('product_desc', v)}
              onFile={(f) => handleUpload('product_image', f)}
              assets={assets.filter(a => a.media_type === 'image')}
              uploading={uploading === 'product_image'} />
          )}

          {showMotionSlot && (
            <SlotUpload label={t('studio.motion_ref')} slotKey="motion_reference" value={slots.motion_reference}
              desc={slots.motion_desc} descKey="motion_desc"
              onUrlChange={(v) => updateSlot('motion_reference', v)}
              onDescChange={(v) => updateSlot('motion_desc', v)}
              onFile={(f) => handleUpload('motion_reference', f)}
              assets={assets}
              uploading={uploading === 'motion_reference'} />
          )}

          {showStyleSlot && (
            <SlotUpload label={t('studio.style_ref')} slotKey="style_reference" value={slots.style_reference}
              onUrlChange={(v) => updateSlot('style_reference', v)}
              onFile={(f) => handleUpload('style_reference', f)}
              assets={assets.filter(a => a.media_type === 'image')}
              uploading={uploading === 'style_reference'} />
          )}

          {showAudioSlot && (
            <SlotUpload label={t('studio.audio_ref')} slotKey="audio_reference" value={slots.audio_reference}
              onUrlChange={(v) => updateSlot('audio_reference', v)}
              onFile={(f) => handleUpload('audio_reference', f)}
              assets={assets}
              uploading={uploading === 'audio_reference'} />
          )}
        </div>

        {/* Right: Config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Template Picker */}
          {(selectedMode === 'template_scene' || selectedMode === 'product_promo') && templates.length > 0 && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">{t('studio.scene_template')}</h3></div>
              <button
                onClick={() => setSelectedTemplate('')}
                style={{
                  width: '100%', marginBottom: 10, padding: '10px 12px', borderRadius: 10,
                  border: selectedTemplate === '' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: selectedTemplate === '' ? 'rgba(245,158,11,0.1)' : 'var(--bg-surface)',
                  color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left',
                }}
              >
                {t('studio.no_template')}
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {templates.map(tmpl => {
                  const preview = templatePreview(tmpl.id);
                  const active = selectedTemplate === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => setSelectedTemplate(tmpl.id)}
                      style={{
                        border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: active ? 'rgba(245,158,11,0.08)' : 'var(--bg-surface)',
                        borderRadius: 12, padding: 0, overflow: 'hidden', cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{
                        height: 74, background: preview.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative', color: 'white',
                      }}>
                        <div style={{ fontSize: 30 }}>{preview.icon}</div>
                        <div style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 10, fontWeight: 700, textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
                          {preview.label}
                        </div>
                      </div>
                      <div style={{ padding: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{tmpl.name}</div>
                        <div style={{ fontSize: 10, lineHeight: 1.4, color: 'var(--text-muted)' }}>{tmpl.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prompt & Style */}
          <div className="card">
            <div className="card-header"><h3 className="card-title">{t('studio.prompt_style')}</h3></div>
            <div className="form-group">
              <label className="form-label">{t('studio.prompt_label')}</label>
              <textarea className="form-input" rows={3} value={prompt} onChange={e => setPrompt(e.target.value)}
                placeholder={t('studio.prompt_placeholder')} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('studio.style_label')}</label>
              <input className="form-input" value={style} onChange={e => setStyle(e.target.value)}
                placeholder={t('studio.style_placeholder')} />
            </div>
          </div>

          {/* Auto Caption Overlay */}
          <div className="card">
            <div className="card-header"><h3 className="card-title">Auto-Caption Overlay</h3></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--text-secondary)', fontSize: 13 }}>
              <input type="checkbox" checked={captionEnabled} onChange={e => setCaptionEnabled(e.target.checked)} />
              Add TikTok-style hook text overlay
            </label>
            {captionEnabled && (
              <div style={{ display: 'grid', gap: 10 }}>
                <select className="form-input" value={captionStyle} onChange={e => setCaptionStyle(e.target.value)}>
                  <option value="viral">Viral hook</option>
                  <option value="problem_solution">Problem → Solution</option>
                  <option value="discount">Deal / Discount</option>
                  <option value="testimonial">Testimonial</option>
                  <option value="curiosity">Curiosity gap</option>
                </select>
                <input className="form-input" value={captionText} onChange={e => setCaptionText(e.target.value)}
                  placeholder="Custom caption (optional)" />
                <select className="form-input" value={captionPosition} onChange={e => setCaptionPosition(e.target.value)}>
                  <option value="top">Top</option>
                  <option value="center">Center</option>
                  <option value="bottom">Bottom</option>
                </select>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  If empty, Alexa Forge auto-generates a short scroll-stopping hook.
                </div>
              </div>
            )}
          </div>

          {/* Export Format & Duration */}
          <div className="card">
            <div className="card-header"><h3 className="card-title">{t('studio.export_format')}</h3></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {Object.entries(formats).map(([key, fmt]: [string, any]) => (
                <button key={key} onClick={() => setExportFormat(key)}
                  style={{
                    padding: '10px', borderRadius: 8, border: exportFormat === key ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: exportFormat === key ? 'rgba(245,158,11,0.1)' : 'var(--bg-surface)', cursor: 'pointer', textAlign: 'center',
                  }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{fmt.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmt.aspect_ratio}</div>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <label className="form-label">Video Duration</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{v:'5',label:'5s',desc:'Fast, ~$0.10'},{v:'10',label:'10s',desc:'Standard, ~$0.20'}].map(opt => (
                  <button key={opt.v} onClick={() => setVideoDuration(opt.v)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 8,
                      border: videoDuration === opt.v ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: videoDuration === opt.v ? 'rgba(245,158,11,0.1)' : 'var(--bg-surface)',
                      cursor: 'pointer', textAlign: 'center',
                    }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{opt.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Batch Mode */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{t('studio.batch_mode')}</h3>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={batchMode} onChange={e => setBatchMode(e.target.checked)} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('studio.enable')}</span>
              </label>
            </div>
            {batchMode && (
              <>
                <div className="form-group">
                  <label className="form-label">{t('studio.variant_slot')}</label>
                  <select className="form-input" value={variantSlot} onChange={e => setVariantSlot(e.target.value)}>
                    <option value="person_image">{t('studio.variant_person')}</option>
                    <option value="product_image">{t('studio.variant_product')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('studio.variant_urls')}</label>
                  <textarea className="form-input" rows={4} value={variantImages} onChange={e => setVariantImages(e.target.value)}
                    placeholder="https://example.com/person1.jpg&#10;https://example.com/person2.jpg&#10;https://example.com/person3.jpg" />
                </div>
              </>
            )}
          </div>

          {/* Generate Button */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}
              style={{ flex: 1, padding: '14px', fontSize: 14 }}>
              {loading ? t('studio.generating') : batchMode ? `${t('studio.generate_variants')} (${variantImages.split('\n').filter(Boolean).length})` : t('studio.generate')}
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>
              <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} />
              {t('studio.dry_run')}
            </label>
          </div>
        </div>
      </div>

      {/* Result */}
      {error && <div className="card" style={{ marginTop: 20, borderColor: 'var(--error)' }}><p style={{ color: 'var(--error)' }}>{error}</p></div>}
      {result && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header"><h3 className="card-title">{t('studio.result')}</h3></div>
          {result.batch_size ? (
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Batch: {result.batch_size} {t('studio.batch_queued')} {result.campaign_id ? `• Campaign #${result.campaign_id}` : ''}</p>
              <div className="activity-list">
                {result.tasks?.map((task: any) => (
                  <div key={task.id} className="activity-item">
                    <div className="activity-dot" style={{ background: task.status === 'completed' ? 'var(--success)' : 'var(--warning)' }} />
                    <span className="activity-text">Task #{task.id} — {task.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('studio.status')}</span><br /><span className={`badge ${result.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{result.status}</span></div>
                <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('studio.provider')}</span><br /><span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{result.provider}</span></div>
                <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('studio.mode')}</span><br /><span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{result.mode}</span></div>
              </div>
              {result.output_url && !result.output_url.startsWith('dry-run') && !result.output_url.includes('queue.fal.run') && result.status === 'completed' && (
                <div style={{ marginTop: 16 }}>
                  <a href={result.output_url} target="_blank" rel="noopener" className="btn btn-primary" style={{ display: 'inline-block' }}>
                    {result.output_url.includes('.mp4') ? 'Download Video' : t('studio.download')}
                  </a>
                </div>
              )}
              {result.status === 'running' && (
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="spinner" style={{ width: 16, height: 16, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {polling ? 'Generating... polling for result' : 'Task submitted, waiting for result'}
                  </span>
                </div>
              )}
              {result.status === 'failed' && result.error && (
                <div style={{ marginTop: 12, padding: 12, background: 'rgba(239,68,68,0.1)', borderRadius: 8, fontSize: 12, color: 'var(--error)' }}>
                  {result.error}
                </div>
              )}
              {result.prompt && (
                <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-surface)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                  <strong>{t('studio.generated_prompt')}:</strong><br />{result.prompt}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}


// --- Slot Upload Component ---

function SlotUpload({ label, slotKey, value, desc, descKey, onUrlChange, onDescChange, onFile, assets = [], uploading }: {
  label: string; slotKey: string; value?: string; desc?: string; descKey?: string;
  onUrlChange: (v: string) => void; onDescChange?: (v: string) => void;
  onFile: (f: File) => void; assets?: any[]; uploading?: boolean;
}) {
  const [showDesc, setShowDesc] = useState(false);
  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <label className="form-label" style={{ fontWeight: 600 }}>{label}</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input className="form-input" style={{ flex: 1 }} value={value || ''} onChange={e => onUrlChange(e.target.value)}
          placeholder={t('studio.paste_or_upload')} />
        <label style={{ padding: '8px 12px', background: 'var(--accent)', color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap' }}>
          {uploading ? '...' : t('studio.upload')}
          <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); }} />
        </label>
      </div>
      {assets.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <select className="form-input" style={{ fontSize: 12 }} value="" onChange={e => { if (e.target.value) onUrlChange(e.target.value); }}>
            <option value="">Pick from Asset Library</option>
            {assets.slice(0, 30).map((asset: any) => (
              <option key={asset.id} value={asset.url}>{asset.original_name || asset.filename} — {asset.media_type}</option>
            ))}
          </select>
        </div>
      )}
      {value && (
        <div style={{ marginTop: 8, padding: 8, background: 'var(--bg-surface)', borderRadius: 8, fontSize: 11, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
          Selected: {value}
        </div>
      )}
      {descKey && onDescChange && (
        <>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('studio.ai_auto_analyze')}</span>
            <button onClick={() => setShowDesc(!showDesc)} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {showDesc ? t('studio.hide') : t('studio.add_desc')}
            </button>
          </div>
          {showDesc && (
            <input className="form-input" style={{ marginTop: 8, fontSize: 12 }} value={desc || ''} onChange={e => onDescChange(e.target.value)}
              placeholder={t('studio.optional_desc')} />
          )}
        </>
      )}
    </div>
  );
}
