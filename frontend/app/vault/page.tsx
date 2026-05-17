'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {api} from '../../lib/api';

export default function Vault(){
  const [keys,setKeys]=useState<any[]>([]);
  const [provider,setProvider]=useState('fake');
  const [label,setLabel]=useState('Fake Key');
  const [secret,setSecret]=useState('sk-test');

  async function load(){setKeys(await api('/v1/vault/keys'))}
  useEffect(()=>{load()},[]);

  async function add(){
    await api('/v1/vault/keys',{method:'POST',body:JSON.stringify({provider,label,secret,priority:10})});
    setSecret('');
    load()
  }

  return <main style={{maxWidth:980,margin:'0 auto',padding:32}}>
    <Link href="/">← Home</Link>
    <h1>API Vault</h1>
    <div className="card grid">
      <label>Provider<select className="input" value={provider} onChange={e=>{setProvider(e.target.value); setLabel(e.target.value==='fal'?'Fal Key':'Fake Key')}}><option value="fake">fake</option><option value="fal">fal</option></select></label>
      <input className="input" value={label} onChange={e=>setLabel(e.target.value)} placeholder="Label"/>
      <input className="input" value={secret} onChange={e=>setSecret(e.target.value)} placeholder={provider==='fal'?'fal key':'API secret'}/>
      <button className="btn" onClick={add}>Add Key</button>
      {provider==='fal'&&<p style={{color:'#9aa8c7',margin:0}}>Masukkan fal API key lo di sini. Key disimpan terenkripsi dan dipakai via BYOK dari API Vault.</p>}
    </div>
    <div className="grid" style={{marginTop:16}}>{keys.map(k=><div className="card" key={k.id}><b>{k.label}</b> <span className="badge">{k.provider}</span><p>{k.secret_preview} | priority {k.priority} | active {String(k.is_active)}</p></div>)}</div>
  </main>
}
