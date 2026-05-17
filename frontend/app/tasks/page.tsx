'use client';
import {useEffect,useState} from 'react'; import Link from 'next/link'; import {api} from '../../lib/api';
export default function Tasks(){const [tasks,setTasks]=useState<any[]>([]); useEffect(()=>{api<any[]>('/v1/tasks').then(setTasks)},[]); return <main style={{maxWidth:980,margin:'0 auto',padding:32}}><Link href="/">← Home</Link><h1>Tasks</h1><div className="grid">{tasks.map(t=><div className="card" key={t.id}><b>#{t.id}</b> <span className="badge">{t.status}</span><p>{t.prompt}</p>{t.output_url&&<a href={t.output_url}>{t.output_url}</a>}</div>)}</div></main>}
