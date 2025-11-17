import React, { useEffect, useState, useRef } from 'react'
import { getJson, postJson } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null;

export default function Notifications(){
  const { token } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  async function load(){
    if (!token) return;
    setLoading(true);
    try {
      const data = await getJson('/api/notifications', token || undefined);
      setItems(data || []);
    } catch (e) {
      console.error('fetch notifications', e);
    } finally { setLoading(false); }
  }

  useEffect(()=>{ if (open) load() }, [token, open]);

  // close when clicking outside
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Setup socket.io to receive real-time notifications
  useEffect(() => {
    if (!token) return;
    const SERVER = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    try {
      socket = io(SERVER, { transports: ['websocket', 'polling'] });
      socket.on('connect', () => {
        socket && socket.emit('auth:identify', token);
      });
      socket.on('notification', (n: any) => {
        // prepend and keep list unique by _id
        setItems(prev => {
          if (!n || !n._id) return prev;
          if (prev.some(i => i._id === n._id)) return prev;
          return [n, ...prev];
        });
      });
    } catch (e) {
      console.error('socket init failed', e);
    }

    return () => {
      try { socket && socket.disconnect(); socket = null; } catch {};
    };
  }, [token]);

  async function markRead(id:string){
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:4000') + `/api/notifications/${id}/read`, { method: 'PATCH', headers: { 'Content-Type':'application/json', ...(token?{ Authorization: `Bearer ${token}` }:{}) } });
      const updated = await res.json();
      setItems(prev => prev.map(i => i._id === id ? updated : i));
    } catch (e) { console.error('mark read', e); }
  }

  async function acceptInvite(n:any){
    if (!token) return alert('Debes iniciar sesión para aceptar la invitación');
    try {
      const projectId = n.data?.projectId;
      const inviteToken = n.data?.token;
      if (!projectId || !inviteToken) return alert('Invitación inválida');
      const url = (import.meta.env.VITE_API_URL || 'http://localhost:4000') + `/api/projects/${projectId}/invitations/accept`;
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ token: inviteToken }) });
      const body = await res.json();
      if (!res.ok) throw body;
      // mark notification as read on server
      try {
        await fetch((import.meta.env.VITE_API_URL || 'http://localhost:4000') + `/api/notifications/${n._id}/read`, { method: 'PATCH', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` } });
      } catch (e) {
        // non-fatal: still continue
        console.warn('Failed to mark notification as read on server', e);
      }
      // remove from local list
      setItems(prev => prev.filter(i => i._id !== n._id));
      // notify other parts of the app to refresh projects
      window.dispatchEvent(new CustomEvent('projects:updated', { detail: { projectId } }));
      alert('Invitación aceptada. El proyecto aparecerá en Mis Proyectos.');
    } catch (e:any) {
      console.error('accept invite', e);
      alert('Error al aceptar la invitación: ' + (e?.error || e?.message || String(e)));
    }
  }

  const unread = items.filter(i => !i.read).length;

  return (
    <div ref={rootRef} style={{position:'relative', display:'flex', alignItems:'center'}}>
      <button onClick={() => setOpen(o => !o)} className="ch-btn ch-btn-secondary" aria-expanded={open} aria-label="Notificaciones">🔔</button>
      {unread > 0 && <div style={{position:'absolute',top:-6,right:-6,background:'#ef4444',color:'#fff',borderRadius:12,padding:'2px 6px',fontSize:12}}>{unread}</div>}

      {open && (
        <div style={{position:'absolute',right:0,top:40,width:360,maxHeight:420,overflow:'auto',borderRadius:8,boxShadow:'0 6px 18px rgba(0,0,0,0.12)',background:'#fff',zIndex:60}}>
          <div style={{padding:12,borderBottom:'1px solid #f3f3f3',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontWeight:700}}>Notificaciones</div>
            <div style={{fontSize:13,color:'#666'}}>{unread} sin leer</div>
          </div>
          <div style={{padding:12}}>
            {loading ? <div className="muted">Cargando...</div> : (
              items.length === 0 ? <div className="muted">No hay notificaciones</div> : (
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {items.map(n => (
                    <div key={n._id} style={{padding:10,background:n.read? '#fafafa' : '#fffbea',border:'1px solid #f3f3f3',borderRadius:6}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <div style={{fontWeight:600}}>{n.type === 'project_invite' ? 'Invitación' : n.type}</div>
                        <div style={{fontSize:12,color:'#666'}}>{new Date(n.createdAt).toLocaleString()}</div>
                      </div>
                      <div style={{marginTop:6,fontSize:14}}>{n.data && n.data.projectName ? `Has sido invitado al proyecto: ${n.data.projectName}` : JSON.stringify(n.data)}</div>
                      <div style={{marginTop:8,display:'flex',gap:8}}>
                        {!n.read && n.type === 'project_invite' ? (
                          <button className="ch-btn ch-btn-primary" onClick={()=>acceptInvite(n)}>Aceptar</button>
                        ) : null}
                        {!n.read && n.type !== 'project_invite' ? (
                          <button className="ch-btn ch-btn-primary" onClick={()=>markRead(n._id)}>Marcar como leído</button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
