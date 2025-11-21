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
      <button 
        onClick={() => setOpen(o => !o)} 
        className="ch-notification-btn" 
        aria-expanded={open} 
        aria-label="Notificaciones"
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          border: 'none',
          background: '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '20px',
          transition: 'all 0.2s ease',
          position: 'relative'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f3f4f6';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#f9fafb';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        🔔
      </button>
      {unread > 0 && (
        <div style={{
          position:'absolute',
          top:-4,
          right:-4,
          background:'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color:'#fff',
          borderRadius:'12px',
          padding:'2px 8px',
          fontSize:11,
          fontWeight:700,
          boxShadow:'0 2px 8px rgba(239, 68, 68, 0.4)',
          minWidth:'20px',
          textAlign:'center',
          lineHeight:'1.4'
        }}>
          {unread > 9 ? '9+' : unread}
        </div>
      )}

      {open && (
        <div style={{
          position:'absolute',
          right:0,
          top:52,
          width:380,
          maxHeight:480,
          overflow:'auto',
          borderRadius:16,
          boxShadow:'0 10px 30px rgba(0,0,0,0.15)',
          background:'#fff',
          zIndex:60,
          border:'1px solid #e5e7eb',
          animation:'slideDown 0.2s ease'
        }}>
          <div style={{
            padding:20,
            borderBottom:'1px solid #e5e7eb',
            display:'flex',
            justifyContent:'space-between',
            alignItems:'center',
            background:'#f9fafb'
          }}>
            <div style={{fontWeight:700, fontSize:16, color:'#111827'}}>Notificaciones</div>
            {unread > 0 && (
              <div style={{
                fontSize:12,
                color:'#667eea',
                fontWeight:600,
                background:'#eef2ff',
                padding:'4px 12px',
                borderRadius:12
              }}>
                {unread} sin leer
              </div>
            )}
          </div>
          <div style={{padding:12}}>
            {loading ? (
              <div style={{textAlign:'center', padding:40, color:'#9ca3af', fontSize:14}}>Cargando...</div>
            ) : (
              items.length === 0 ? (
                <div style={{textAlign:'center', padding:40, color:'#9ca3af', fontSize:14}}>No hay notificaciones</div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {items.map(n => (
                    <div 
                      key={n._id} 
                      style={{
                        padding:16,
                        background:n.read? '#ffffff' : '#fef3c7',
                        border:`1px solid ${n.read ? '#e5e7eb' : '#fde68a'}`,
                        borderRadius:12,
                        transition:'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start', marginBottom:8}}>
                        <div style={{fontWeight:600, fontSize:14, color:'#111827'}}>
                          {n.type === 'project_invite' ? '📬 Invitación' : n.type}
                        </div>
                        <div style={{fontSize:11,color:'#9ca3af', whiteSpace:'nowrap', marginLeft:12}}>
                          {new Date(n.createdAt).toLocaleDateString('es-ES', { day:'numeric', month:'short' })}
                        </div>
                      </div>
                      <div style={{marginTop:4,fontSize:13, color:'#374151', lineHeight:'1.5'}}>
                        {n.data && n.data.projectName ? `Has sido invitado al proyecto: ${n.data.projectName}` : JSON.stringify(n.data)}
                      </div>
                      {!n.read && (
                        <div style={{marginTop:12,display:'flex',gap:8}}>
                          {n.type === 'project_invite' ? (
                            <button 
                              onClick={()=>acceptInvite(n)}
                              style={{
                                background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color:'#fff',
                                border:'none',
                                padding:'8px 16px',
                                borderRadius:8,
                                fontSize:13,
                                fontWeight:600,
                                cursor:'pointer',
                                transition:'all 0.2s ease',
                                boxShadow:'0 2px 8px rgba(102, 126, 234, 0.3)'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
                              }}
                            >
                              Aceptar
                            </button>
                          ) : (
                            <button 
                              onClick={()=>markRead(n._id)}
                              style={{
                                background:'#f3f4f6',
                                color:'#374151',
                                border:'1px solid #e5e7eb',
                                padding:'8px 16px',
                                borderRadius:8,
                                fontSize:13,
                                fontWeight:500,
                                cursor:'pointer',
                                transition:'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#e5e7eb';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#f3f4f6';
                              }}
                            >
                              Marcar como leído
                            </button>
                          )}
                        </div>
                      )}
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
