export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function api<T>(path:string, init?:RequestInit):Promise<T>{
  const r=await fetch(API+path,{...init,headers:{'Content-Type':'application/json',...(init?.headers||{})},cache:'no-store'});
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function uploadImage(file: File): Promise<{url:string; filename:string; size:number; content_type:string}> {
  const fd = new FormData();
  fd.append('file', file);
  const r = await fetch(API + '/v1/uploads/image', {method:'POST', body: fd});
  if(!r.ok) throw new Error(await r.text());
  const data = await r.json();
  return {...data, url: data.url.startsWith('http') ? data.url : API + data.url};
}
