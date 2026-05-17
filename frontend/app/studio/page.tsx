'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {api} from '../../lib/api';

export default function Studio(){
  const [presets,setPresets]=useState<any[]>([]);
  const [prompt,setPrompt]=useState('Make this subject dance naturally.');
  const [image,setImage]=useState('https://example.com/photo.jpg');
  const [preset,setPreset]=useState('');
  const [provider,setProvider]=useState('fake');
  const [dryRun,setDryRun]=useState(true);
  const [task,setTask]=useState<any>(null);
  const [err,setErr]=useState('');

  useEffect(()=>{api<any[]>('/v1/presets').then(p=>{setPresets(p); setPreset(p[0]?.id||'')})},[]);

  async function submit(){
    setErr('');
    const chosen=presets.find(p=>p.id===preset);
    const finalPrompt=(chosen?.prompt?chosen.prompt+'\n':'')+prompt;
    try{
      setTask(await api('/v1/generate/video',{method:'POST',body:JSON.stringify({
        mode:'image_to_video',
        prompt:finalPrompt,
        image_url:image,
        provider,
        dry_run: provider === 'fal' ? dryRun : false,
      })}))
    }catch(e:any){setErr(e.message)}
  }

  return <main style={{maxWidth:980,margin:'0 auto',padding:32}}>
    <Link href="/">← Home</Link>
    <h1>Motion Studio</h1>
    <div className="card grid">
      <label>Image URL<input className="input" value={image} onChange={e=>setImage(e.target.value)}/></label>
      <label>Provider<select className="input" value={provider} onChange={e=>setProvider(e.target.value)}><option value="fake">fake — local mock</option><option value="fal">fal.ai — real provider</option></select></label>
      {provider==='fal'&&<label style={{display:'flex',gap:8,alignItems:'center'}}><input type="checkbox" checked={dryRun} onChange={e=>setDryRun(e.target.checked)}/> Dry run fal.ai first, no credit spend</label>}
      {provider==='fal'&&<p style={{color:'#9aa8c7',margin:0}}>Before real fal generation: add a Vault key with provider <code>fal</code>. Turn off dry run only when ready to spend fal credits.</p>}
      <label>Preset<select className="input" value={preset} onChange={e=>setPreset(e.target.value)}>{presets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label>Prompt<textarea className="input" rows={5} value={prompt} onChange={e=>setPrompt(e.target.value)}/></label>
      <button className="btn" onClick={submit}>Generate Video</button>
      {err&&<pre style={{color:'#ff8b8b',whiteSpace:'pre-wrap'}}>{err}</pre>}
      {task&&<div className="card"><b>Task #{task.id}</b> <span className="badge">{task.status}</span><p>Provider: {task.provider}</p>{task.error&&<p style={{color:'#ff8b8b'}}>Error: {task.error}</p>}{task.output_url&&<p>Output: <a href={task.output_url}>{task.output_url}</a></p>}</div>}
    </div>
  </main>
}
