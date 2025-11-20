import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getJson, postJson, patchJson } from '../services/api'
import { useAuth } from '../context/AuthContext'
import './ProjectView.css'
import CreateEventModal from '../components/CreateEventModal'
import CreateTaskModal from '../components/CreateTaskModal'
import YoutubeMetrics from '../components/YoutubeMetrics'
// Twich component removed — keep placeholder/stub
// Instagram metrics removed
import { startYoutubeOAuth, getIntegrationAccounts } from '../services/integrations'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = { 'es': es }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

export default function ProjectView(){
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [dueDateInput, setDueDateInput] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');
  const [descriptionInput, setDescriptionInput] = useState<string>('');
  const [tab, setTab] = useState<'calendar'|'scripts'|'tasks'|'metrics'|'team'|'config'>('calendar');
  const [viewMode, setViewMode] = useState<'month'|'list'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date(2025,9,19));

  // Events start empty; real events are loaded from backend. If no events, calendar stays empty.

  // Scripts loaded from backend
  const [scripts, setScripts] = useState<any[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState<string>('');
  const [loadingScripts, setLoadingScripts] = useState(false);
  // Members derived from project (for assign dropdown and team list)
  const memberNames: string[] = (project?.members || []).map((m:any) => {
    const u = m.user || {};
    return u.name || u.email || String(u);
  });

  // Tasks (loaded from backend)
  const [tasks, setTasks] = useState<any[]>([])
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [loadingTasks, setLoadingTasks] = useState(false)

  // team members come from `project.members` populated by backend

  const totalTasks = tasks.length
  const pendingCount = tasks.filter(t=>t.status==='pending').length
  const inProgressCount = tasks.filter(t=>t.status==='in_progress').length
  const completedCount = tasks.filter(t=>t.status==='completed').length
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedCount/totalTasks)*100)

  function addTask(t:any){
    setTasks(prev => [t, ...prev])
  }

  async function updateTaskStatus(id:string, status:string){
    try {
      // id may be string id or _id
      const task = tasks.find((x:any)=> (x._id||x.id) === id || x.id === id || x._id === id);
      const taskId = task ? (task._id || task.id) : id;
      // Use PUT to update task status (backend expects PUT /api/tasks/:taskId)
      const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:4000') + `/api/tasks/${taskId}`, { method: 'PUT', headers: { 'Content-Type':'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error('Failed to update task');
      const updated = await res.json();
      setTasks(prev => prev.map(t => ((t._id||t.id) === taskId ? ( { id: updated._id || updated.id, _id: updated._id, title: updated.title, description: updated.description, assignees: updated.assignees || [], dueDate: updated.dueDate, status: updated.status, category: updated.category || 'medio' } ) : t)));
    } catch (e) {
      console.error('update task status', e);
    }
  }

  // Map static events to react-big-calendar events
  const [eventsState, setEventsState] = useState<any[]>([])
  const events = eventsState
  const [modalOpen, setModalOpen] = useState(false)
  const totalEvents = events.length
  const today = selectedDate ? new Date(selectedDate) : null
  const eventsToday = today ? events.filter(e => e.start.toISOString().slice(0,10) === today.toISOString().slice(0,10)) : []
  const upcoming = events.filter(e => e.start > new Date()).length

  const { token, initialized } = useAuth();
  const { user } = useAuth();
  const [accessDenied, setAccessDenied] = useState(false);
  const currentUserId = String(((user as any)?._id) || ((user as any)?.id) || (user as any) || '');
  const isLeader = !!(project && project.members && Array.isArray(project.members) && project.members.some((m:any) => {
    const mid = (m.user && ((m.user._id) || m.user)) || m.user || '';
    return String(mid) === currentUserId && m.isLeader;
  }));

  useEffect(() => {
    if (!projectId) return;
    // wait until auth restored
    if (!initialized) return;
    (async () => {
      try {
        const data = await getJson(`/api/projects/${projectId}`, token || undefined);
        setProject(data);
        // set due date input as yyyy-mm-dd for date input
        // set name/description inputs
        setNameInput(data?.name || '');
        setDescriptionInput(data?.description || '');
        if (data && data.dueDate) {
          try {
            const d = new Date(data.dueDate);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth()+1).padStart(2,'0');
            const dd = String(d.getDate()).padStart(2,'0');
            setDueDateInput(`${yyyy}-${mm}-${dd}`);
          } catch (err) { setDueDateInput(''); }
        } else {
          setDueDateInput('');
        }
      } catch (err: any) {
        console.error('fetch project', err);
        if (err && err.status === 403) {
          setAccessDenied(true);
          return;
        }
        // handle unauthorized: redirect to login
        if (err && err.status === 401) {
          // token invalid or missing
          navigate('/');
        }
      }
    })();

    // load events for this project
    (async () => {
      if (!token) return;
      try {
        const evs = await getJson(`/api/events/${projectId}`, token || undefined);
        const mapped = (evs || []).map((e:any) => ({ id: e._id || e.id, title: e.title, start: new Date(e.start), end: new Date(e.end), desc: e.description || '' }));
        setEventsState(mapped);
      } catch (err:any) {
        console.error('fetch events', err);
        if (err && err.status === 403) {
          setAccessDenied(true);
        }
      }
    })();

    // load scripts for this project
    (async () => {
      if (!token) return;
      setLoadingScripts(true);
      try {
        const scrs = await getJson(`/api/scripts/${projectId}`, token || undefined);
        setScripts(scrs || []);
      } catch (err:any) {
        console.error('fetch scripts', err);
        if (err && err.status === 403) setAccessDenied(true);
      } finally {
        setLoadingScripts(false);
      }
    })();

    // load tasks for this project
    (async () => {
      if (!token) return;
      setLoadingTasks(true);
      try {
      const t = await getJson(`/api/tasks/${projectId}`, token || undefined);
      setTasks((t || []).map((x:any)=> ({ id: x._id || x.id, title: x.title, description: x.description, assignees: x.assignees || [], dueDate: x.dueDate, status: x.status, _id: x._id, category: x.category || 'medio' })));
      } catch (err:any) {
        console.error('fetch tasks', err);
        if (err && err.status === 403) setAccessDenied(true);
      } finally {
        setLoadingTasks(false);
      }
    })();
  }, [projectId, token, initialized, navigate]);

  // when project updates externally, keep dueDateInput in sync
  useEffect(() => {
    if (!project) return;
    setNameInput(project?.name || '');
    setDescriptionInput(project?.description || '');
    if (project.dueDate) {
      try {
        const d = new Date(project.dueDate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth()+1).padStart(2,'0');
        const dd = String(d.getDate()).padStart(2,'0');
        setDueDateInput(`${yyyy}-${mm}-${dd}`);
      } catch (err) { setDueDateInput(''); }
    } else setDueDateInput('');
  }, [project]);

  function handleSelectSlot(slotInfo:any){
    // slotInfo.start is a Date; set selected date and switch to list view
    setSelectedDate(slotInfo.start)
    setViewMode('list')
  }

  function handleSelectEvent(ev:any){
    // select event -> show in side panel
    setSelectedDate(ev.start)
  }

  const defaultDate = new Date(2025,9,1)

  // Metrics (YouTube) sample data
  const [metricTab, setMetricTab] = useState<'rendimiento'|'audiencia'|'porvideo'>('rendimiento')
  const ytMetrics = {
    channelName: 'Creativos Studio',
    subscribers: '23.8K',
    subscribersDelta: '+1.2K',
    videosCount: 89,
    views: '1.3M',
    viewsDelta: '+18.5%',
    watchTime: '89,400 horas',
    watchTimeDelta: '+12.3%',
    likes: '45.6K',
    likesDelta: '+22.1%',
    subsGain: '+1.2K',
    subsLost: '-90',
  }

  // Determine primary platform for this project (single-platform projects)
  const primaryPlatform: string | null = (() => {
    if (!project) return null;
    if (project.platforms && Array.isArray(project.platforms) && project.platforms.length > 0) return String(project.platforms[0]).toLowerCase();
    if (project.platform) return String(project.platform).toLowerCase();
    return null;
  })();

  // Integration accounts (YouTube)
  const [ytAccounts, setYtAccounts] = useState<any[] | null>(null);
  const [loadingYtAccounts, setLoadingYtAccounts] = useState(false);

  useEffect(() => {
    // load user's integration accounts (YouTube) when user is initialized
    (async () => {
      if (!token || !initialized) return;
      setLoadingYtAccounts(true);
      try {
        const accounts = await getIntegrationAccounts(token);
        // keep only youtube accounts
        const yts = (accounts || []).filter((a:any) => String(a.platform || '').toLowerCase() === 'youtube');
        setYtAccounts(yts);
      } catch (err:any) {
        console.error('load integration accounts', err);
        setYtAccounts([]);
      } finally {
        setLoadingYtAccounts(false);
      }
    })();
  }, [token, initialized]);

  return (
    <div className="ch-project-page">
      {accessDenied && (
        <div style={{padding:24}}>
          <div style={{fontSize:20,fontWeight:700,marginBottom:8}}>Acceso denegado</div>
          <div className="muted" style={{marginBottom:12}}>No tienes permisos para ver este proyecto o tu sesión ha expirado.</div>
          <div style={{display:'flex',gap:8}}>
            <button className="ch-btn ch-btn-primary" onClick={() => navigate('/dashboard')}>Volver al dashboard</button>
            <button className="ch-btn ch-btn-secondary" onClick={() => window.location.reload()}>Reintentar</button>
          </div>
        </div>
      )}
      <div className="ch-project-top">
        <button onClick={()=>navigate('/dashboard')}>←</button>
        <div>
          <h2>{project?.name || 'Proyecto'}</h2>
          <div className="ch-sub">{project?.description}</div>
        </div>
        <div className="ch-project-members">{project?.members?.length || 0} miembros</div>
      </div>

      <div className="ch-project-tabs">
        <button className={tab==='calendar'?'active':''} onClick={()=>setTab('calendar')}>Calendario</button>
        <button className={tab==='scripts'?'active':''} onClick={()=>setTab('scripts')}>Guiones</button>
        <button className={tab==='tasks'?'active':''} onClick={()=>setTab('tasks')}>Tareas</button>
        <button className={tab==='metrics'?'active':''} onClick={()=>setTab('metrics')}>Métricas</button>
        <button className={tab==='team'?'active':''} onClick={()=>setTab('team')}>Equipo</button>
        <button className={tab==='config'?'active':''} onClick={()=>setTab('config')}>Configuración</button>
      </div>

      <div className="ch-project-content">
        {tab === 'calendar' && (
          <div>
            <div className="ch-calendar-header">
              <div>
                <h3>Calendario del Proyecto</h3>
                <div className="ch-small">Planifica y coordina eventos con tu equipo</div>
              </div>
              <div>
                <button className={viewMode==='month'?'active':''} onClick={()=>setViewMode('month')}>Mes</button>
                <button className={viewMode==='list'?'active':''} onClick={()=>setViewMode('list')}>Lista</button>
                <button className="ch-primary" onClick={()=>setModalOpen(true)}>+ Nuevo Evento</button>
              </div>
            </div>

            {viewMode === 'month' ? (
              <div className="ch-calendar-grid">
                <div className="ch-calendar-box">
                  <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: 420 }}
                    defaultView={'month' as View}
                    views={{ month: true }}
                    onSelectEvent={handleSelectEvent}
                    selectable
                    onSelectSlot={handleSelectSlot}
                    defaultDate={defaultDate}
                    culture="es"
                  />
                </div>

                <div className="ch-calendar-side">
                  <div className="ch-box">
                    <div style={{fontWeight:600,marginBottom:8}}>Eventos del {selectedDate ? selectedDate.toLocaleDateString('es-ES', { day:'numeric', month:'long' }) : ''}</div>
                    {selectedDate ? (
                      events.filter(e => e.start.toISOString().slice(0,10) === selectedDate.toISOString().slice(0,10)).length === 0
                      ? <div className="muted">No hay eventos este día</div>
                      : (
                        <ul>
                          {events.filter(e => e.start.toISOString().slice(0,10) === selectedDate.toISOString().slice(0,10)).map(ev => (
                            <li key={ev.id} style={{padding:'8px 0',borderBottom:'1px solid #f0f0f0'}}>
                              <div style={{fontWeight:600}}>{ev.title}</div>
                              <div className="muted">{ev.desc}</div>
                              <div style={{marginTop:6,fontSize:12}}>{format(ev.start, 'HH:mm')}</div>
                            </li>
                          ))}
                        </ul>
                      )
                    ) : <div className="muted">Selecciona un día para ver eventos</div>}
                  </div>

                  <div style={{height:12}} />

                  <div className="ch-box" style={{display:'flex',flexDirection:'column',gap:12}}>
                    <div style={{display:'flex',gap:12}}>
                      <div className="stat-card"><div className="stat-num">{totalEvents}</div><div className="stat-label">Total Eventos</div></div>
                      <div className="stat-card"><div className="stat-num">{upcoming}</div><div className="stat-label">Próximos</div></div>
                      <div className="stat-card"><div className="stat-num">{eventsToday.length}</div><div className="stat-label">Hoy Seleccionado</div></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="ch-calendar-list" style={{display:'flex',gap:16}}>
                <div style={{flex:1}}>
                  <div className="ch-box">
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                      <div style={{fontWeight:600}}>octubre de 2025</div>
                      <div>
                        <button onClick={() => { /* prev month */ }}>◀</button>
                        <button style={{marginLeft:8}}>Hoy</button>
                        <button style={{marginLeft:8}}>▶</button>
                      </div>
                    </div>
                    <div style={{borderTop:'1px solid #f0f0f0',paddingTop:8}}>
                      {events.map(ev => (
                        <div key={ev.id} style={{padding:'12px',border:'1px solid #f0f0f0',borderRadius:8,display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                          <div>
                            <div style={{fontWeight:600}}>{ev.title}</div>
                            <div className="muted">{ev.desc}</div>
                            <div className="muted" style={{fontSize:12}}>{format(ev.start, "eeee, d 'de' MMMM 'de' yyyy", {locale: es})}</div>
                          </div>
                          <div style={{background:'#f5f5f7',padding:'6px 10px',borderRadius:6,fontWeight:600}}>{format(ev.start,'HH:mm')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{width:360}}>
                  <div className="ch-box">
                    <div style={{fontWeight:600,marginBottom:8}}>Eventos del {selectedDate ? selectedDate.toLocaleDateString('es-ES', { day:'numeric' }) : '—'}</div>
                    {selectedDate ? (
                      events.filter(e => e.start.toISOString().slice(0,10) === selectedDate.toISOString().slice(0,10)).length === 0
                      ? <div className="muted">No hay eventos este día</div>
                      : (
                        <ul>
                          {events.filter(e => e.start.toISOString().slice(0,10) === selectedDate.toISOString().slice(0,10)).map(ev => (
                            <li key={ev.id} style={{padding:'8px 0',borderBottom:'1px solid #f0f0f0'}}>
                              <div style={{fontWeight:600}}>{ev.title}</div>
                              <div className="muted">{ev.desc}</div>
                              <div style={{marginTop:6,fontSize:12}}>{format(ev.start, 'HH:mm')}</div>
                            </li>
                          ))}
                        </ul>
                      )
                    ) : <div className="muted">Selecciona un día para ver eventos</div>}
                  </div>

                  <div style={{height:12}} />

                  <div style={{display:'flex',gap:12}}>
                    <div className="stat-card"><div className="stat-num">{totalEvents}</div><div className="stat-label">Total Eventos</div></div>
                    <div className="stat-card"><div className="stat-num">{upcoming}</div><div className="stat-label">Próximos</div></div>
                    <div className="stat-card"><div className="stat-num">{eventsToday.length}</div><div className="stat-label">Hoy Seleccionado</div></div>
                  </div>
                </div>
              </div>
            )}
            {modalOpen && (
              <CreateEventModal
                onClose={() => setModalOpen(false)}
                onCreate={async (ev) => {
                  // ev: { id, title, desc, start, end }
                  if (!projectId) return;
                  try {
                    const payload:any = {
                      projectId,
                      title: ev.title,
                      description: ev.desc || '',
                      start: ev.start.toISOString(),
                      allDay: false,
                    }
                    if (ev.end) payload.end = ev.end.toISOString();

                    const created = await postJson('/api/events', payload, token || undefined);
                    const toAdd = { id: created._id || created.id, title: created.title, start: new Date(created.start), end: created.end ? new Date(created.end) : addHours(new Date(created.start), 1), desc: created.description || '' };
                    setEventsState(s => [toAdd, ...s]);
                    setSelectedDate(new Date(created.start));
                    setModalOpen(false);
                  } catch (err:any) {
                    console.error('create event', err);
                    if (err && err.status === 401) navigate('/');
                    if (err && err.status === 403) alert('No tienes permisos para crear eventos en este proyecto');
                  }
                }}
              />
            )}
          </div>
        )}

        {tab === 'metrics' && (
          <div>
            {primaryPlatform === 'youtube' && (
              <div>
                <div className="ch-box" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700}}>YouTube</div>
                    <div className="muted">Conexión con la API de YouTube para este usuario</div>
                    {loadingYtAccounts ? (
                      <div className="muted" style={{marginTop:8}}>Cargando cuentas conectadas...</div>
                    ) : (
                      (ytAccounts && ytAccounts.length > 0) ? (
                        <div style={{marginTop:8}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <div className="status-dot connected" style={{width:10,height:10,borderRadius:10,background:'#16a34a'}} />
                            <div style={{fontWeight:600}}>Conectado</div>
                          </div>
                          <div className="muted" style={{marginTop:6}}>Conectado como: <strong>{ytAccounts[0].metadata?.title || ytAccounts[0].metadata?.channelId || 'Cuenta de YouTube'}</strong></div>
                        </div>
                      ) : (
                        <div style={{marginTop:8}} className="muted">No hay cuentas de YouTube conectadas.</div>
                      )
                    )}
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button className="ch-btn ch-btn-secondary" onClick={async ()=>{
                      // Start OAuth to connect another account
                      try {
                        if (!token) { alert('Inicia sesión para conectar una cuenta'); return; }
                        const url = await startYoutubeOAuth(token);
                        // navigate to Google's consent screen
                        window.location.href = url;
                      } catch (err:any) {
                        console.error('start youtube oauth', err);
                        alert('No se pudo iniciar el flujo de conexión: ' + (err && err.message ? err.message : 'Error'));
                      }
                    }}>Conectar con otra cuenta</button>
                    {/* Optionally show manage (open channel metrics) */}
                  </div>
                </div>
                <div style={{height:12}} />
                {/* Only render the metrics component if there is at least one connected account */}
                {(ytAccounts && ytAccounts.length > 0) ? (
                  <YoutubeMetrics projectId={projectId} />
                ) : (
                  <div className="ch-box">
                    <div style={{fontWeight:700}}>Sin cuenta conectada</div>
                    <div className="muted">Conecta una cuenta de YouTube para comenzar a recopilar métricas y sincronizar datos.</div>
                    <div style={{marginTop:8}}>
                      <button className="ch-btn ch-btn-primary" onClick={async ()=>{
                        try {
                          if (!token) { alert('Inicia sesión para conectar una cuenta'); return; }
                          const url = await startYoutubeOAuth(token);
                          window.location.href = url;
                        } catch (err:any) { console.error('start youtube oauth', err); alert('No se pudo iniciar el flujo'); }
                      }}>Conectar Cuenta de YouTube</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {primaryPlatform === 'tiktok' && (
              <div className="ch-box">
                <div style={{fontWeight:700}}>Twich (integración deshabilitada)</div>
                <div className="muted">La integración con Twich se ha deshabilitado temporalmente en el frontend.</div>
              </div>
            )}
            {/* Instagram removed */}
            {!primaryPlatform && (
              <div className="ch-box">
                <div style={{fontWeight:700}}>Sin plataforma seleccionada</div>
                <div className="muted">Este proyecto no tiene una plataforma principal configurada. Crea el proyecto seleccionando YouTube o Twich para ver métricas.</div>
              </div>
            )}
            {primaryPlatform && !['youtube','tiktok'].includes(primaryPlatform) && (
              <div className="ch-box">
                <div style={{fontWeight:700}}>Plataforma no soportada</div>
                <div className="muted">La plataforma "{primaryPlatform}" no tiene un componente de métricas estático configurado.</div>
              </div>
            )}
          </div>
        )}

        {tab === 'scripts' && (
          <div>
            <div className="ch-calendar-header">
              <div>
                <h3>Guiones del Proyecto</h3>
                <div className="ch-small">Crea y edita guiones de forma colaborativa</div>
              </div>
              <div>
                <button className="ch-primary" onClick={async ()=>{
                  if (!projectId) return;
                  const title = prompt('Título del guion:');
                  if (!title) return;
                  const content = prompt('Contenido inicial del guion (texto):') || '';
                  try {
                    const created = await postJson('/api/scripts', { projectId, title, content }, token || undefined);
                    setScripts(s => [created, ...s]);
                    setSelectedScriptId(created._id || created.id);
                    setEditorContent((created.versions && created.versions[created.currentVersionIndex]?.content) || '');
                  } catch (err:any) {
                    console.error('create script', err);
                    if (err && err.status === 401) navigate('/');
                    if (err && err.status === 403) alert('No tienes permisos para crear guiones en este proyecto');
                  }
                }}>+ Nuevo Guion</button>
              </div>
            </div>

            <div className="ch-scripts-container">
              <div className="ch-scripts-left">
                <div className="ch-box">
                  <div style={{fontWeight:700,marginBottom:12}}>Todos los Guiones ({scripts.length})</div>
                  <div className="script-list">
                    {scripts.map(s => {
                      const sid = s._id || s.id;
                      const isSelected = selectedScriptId === sid;
                      return (
                        <div key={sid} className={`script-card ${isSelected? 'selected':''}`} onClick={() => {
                          setSelectedScriptId(sid);
                          setEditorContent((s.versions && s.versions[s.currentVersionIndex]?.content) || '');
                        }} style={{cursor:'pointer'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            <div style={{fontWeight:600}}>{s.title}</div>
                            <div className={`status-badge ${String(s.status||'draft').replace(/\s+/g,'-').toLowerCase()}`}>{s.status || 'draft'}</div>
                          </div>
                          <div className="muted" style={{marginTop:6}}>{/* author unknown */} • {(s.comments||[]).length} comentarios</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="ch-scripts-right">
                <div className="ch-box">
                  {selectedScriptId ? (
                    (() => {
                      const detail = scripts.find(s => (s._id || s.id) === selectedScriptId)
                      if(!detail) return <div className="muted">Guion no encontrado</div>
                      const currentVersion = detail.versions && detail.versions[detail.currentVersionIndex];
                      const lastEditedAt = (currentVersion && currentVersion.createdAt) || detail.updatedAt || detail.createdAt;
                      return (
                        <div>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                            <div>
                              <div style={{fontWeight:700,fontSize:18}}>{detail.title}</div>
                              <div className="muted">Última edición: {lastEditedAt ? new Date(lastEditedAt).toLocaleString() : ''}</div>
                            </div>
                            <div style={{display:'flex',gap:8}}>
                              <button className="ch-btn ch-btn-secondary" onClick={async ()=>{
                                try {
                                  const updated = await patchJson(`/api/scripts/${selectedScriptId}/status`, { status: 'draft' }, token || undefined);
                                  setScripts(ss => ss.map(s => ((s._id||s.id) === selectedScriptId ? updated : s)));
                                } catch (err:any) { console.error('set status', err); }
                              }}>Borrador</button>
                              <button className="ch-btn ch-btn-secondary" onClick={async ()=>{
                                try {
                                  const updated = await patchJson(`/api/scripts/${selectedScriptId}/status`, { status: 'in_review' }, token || undefined);
                                  setScripts(ss => ss.map(s => ((s._id||s.id) === selectedScriptId ? updated : s)));
                                } catch (err:any) { console.error('set status', err); }
                              }}>En Revisión</button>
                              <button className="ch-btn ch-btn-primary" onClick={async ()=>{
                                try {
                                  const updated = await patchJson(`/api/scripts/${selectedScriptId}/status`, { status: 'approved' }, token || undefined);
                                  setScripts(ss => ss.map(s => ((s._id||s.id) === selectedScriptId ? updated : s)));
                                } catch (err:any) { console.error('set status', err); if (err && err.status === 403) alert('Solo líderes pueden aprobar'); }
                              }}>Aprobar</button>
                            </div>
                          </div>

                          <div style={{border:'1px solid #f0f0f0',borderRadius:8,background:'#fff',padding:12,marginBottom:8}}>
                            <textarea value={editorContent} onChange={(e)=>{
                              setEditorContent(e.target.value)
                            }} style={{width:'100%',minHeight:220,border:'none',outline:'none',resize:'vertical'}} />
                          </div>

                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            <div className="muted">{(editorContent || '').length} caracteres</div>
                            <div>
                              <button className="ch-btn ch-btn-secondary" onClick={()=>{
                                // revert to current version
                                setEditorContent((currentVersion && currentVersion.content) || '');
                              }}>Revertir</button>
                              <button className="ch-btn ch-btn-primary" style={{marginLeft:8}} onClick={async ()=>{
                                try {
                                  const updated = await postJson(`/api/scripts/${selectedScriptId}/versions`, { content: editorContent }, token || undefined);
                                  setScripts(ss => ss.map(s => ((s._id||s.id) === selectedScriptId ? updated : s)));
                                } catch (err:any) { console.error('save version', err); }
                              }}>Guardar Cambios</button>
                            </div>
                          </div>

                          <div style={{marginTop:18}}>
                            <div style={{fontWeight:700,marginBottom:8}}>Comentarios ({(detail.comments||[]).length})</div>
                            <div className="comments-list">
                              {(detail.comments||[]).map((c:any, idx:number)=> (
                                <div key={c._id || c.id || idx} className="comment-row">
                                  <div className="comment-avatar">{(c.createdBy || '').toString().split(' ').map((p:any)=>p[0]).slice(0,2).join('')}</div>
                                  <div className="comment-body">
                                    <div style={{display:'flex',justifyContent:'space-between'}}>
                                      <div style={{fontWeight:600}}>{(c.createdBy || '').toString()}</div>
                                      <div className="muted" style={{fontSize:12}}>{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</div>
                                    </div>
                                    <div style={{marginTop:6}}>{c.text}</div>
                                  </div>
                                </div>
                              ))}

                              <div style={{display:'flex',gap:8,marginTop:12}}>
                                <input placeholder="Agregar un comentario..." className="comment-input" id="newCommentInput" />
                                <button className="ch-btn ch-btn-primary" onClick={async ()=>{
                                  const input = document.getElementById('newCommentInput') as HTMLInputElement
                                  if(!input) return
                                  const txt = input.value.trim(); if(!txt) return
                                  try {
                                    const updated = await postJson(`/api/scripts/${selectedScriptId}/comments`, { sectionId: 'body', text: txt }, token || undefined);
                                    setScripts(ss => ss.map(s => ((s._id||s.id) === selectedScriptId ? updated : s)));
                                    input.value = '';
                                  } catch (err:any) { console.error('comment', err); }
                                }}>Comentar</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()
                  ) : (
                    <div className="empty-editor" style={{textAlign:'center',paddingTop:36,paddingBottom:36}}>
                      <div style={{fontSize:36,color:'#c9c9cf'}}>📄</div>
                      <div className="muted" style={{marginTop:12}}>Selecciona un guion para editararlo</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'tasks' && (
          <div>
              <div className="ch-calendar-header">
              <div>
                <h3>Tareas del Proyecto</h3>
                <div className="ch-small">Organiza y da seguimiento a las tareas del equipo</div>
              </div>
              <div>
                {isLeader ? (
                  <button className="ch-primary" onClick={()=>setTaskModalOpen(true)}>+ Nueva Tarea</button>
                ) : null}
              </div>
            </div>

            <div className="ch-box" style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{width:'70%'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{fontWeight:600,marginBottom:6}}>Progreso General</div>
                    <div style={{fontWeight:700}}>{progressPercent}%</div>
                  </div>
                  <div style={{background:'#f3f4f6',height:12,borderRadius:8,overflow:'hidden'}}>
                    <div style={{width:`${progressPercent}%`,height:'100%',background:'#111827'}} />
                  </div>
                </div>
                <div style={{textAlign:'right'}}>{completedCount} de {totalTasks} completadas</div>
              </div>
            </div>

            <div style={{display:'flex',gap:12,marginBottom:12}}>
              <div className="stat-card"><div className="stat-num">{totalTasks}</div><div className="stat-label">Total</div></div>
              <div className="stat-card"><div className="stat-num">{pendingCount}</div><div className="stat-label">Pendientes</div></div>
              <div className="stat-card"><div className="stat-num">{inProgressCount}</div><div className="stat-label">En Progreso</div></div>
              <div className="stat-card"><div className="stat-num">{completedCount}</div><div className="stat-label">Completadas</div></div>
            </div>

            <div className="ch-box">
              <div style={{fontWeight:700,marginBottom:12}}>Todas las Tareas</div>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {(() => {
                  // Sort tasks by dueDate ascending (null/undefined dueDate go last). If equal, use createdAt / _id order.
                  const sorted = (tasks || []).slice().sort((a:any,b:any)=>{
                    const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
                    const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
                    if (ad === bd) {
                      const at = (a._id && a._id.toString) ? a._id.toString() : (a.id || '');
                      const bt = (b._id && b._id.toString) ? b._id.toString() : (b.id || '');
                      return at.localeCompare(bt);
                    }
                    return ad - bd;
                  });
                  return sorted.map(t => (
                  <div key={t.id} className="task-card">
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                        {/* checkbox removed per design: show status badge and actions only */}
                        <div>
                          <div style={{fontWeight:600}}>{t.title}</div>
                          <div className="muted" style={{marginTop:6}}>{t.description}</div>
                          <div className="muted" style={{marginTop:8,fontSize:13}}>
                            <span style={{marginRight:12}}>👤 {t.assignee}</span>
                            <span style={{color: t.dueDate && new Date(t.dueDate) < new Date() ? '#dc2626' : '#666'}}>{t.dueDate ? new Date(t.dueDate).toLocaleDateString('es-ES') : ''}{t.dueDate && new Date(t.dueDate) < new Date() ? ' • Vencida' : ''}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        {t.status === 'in_progress' ? <div className="badge in-progress">En Progreso</div> : null}
                        {t.status === 'pending' ? <div className="badge pending">Pendiente</div> : null}
                        {t.status === 'completed' ? <div className="badge completed">Completada</div> : null}
                        {t.category ? <div className={`badge category-${t.category}`} style={{textTransform:'capitalize'}}>{t.category}</div> : null}
                                <div style={{display:'flex',gap:8}}>
                                  {t.status !== 'completed' && isLeader && <button className="ch-btn ch-btn-primary" onClick={()=> updateTaskStatus(t._id || t.id,'completed')}>Completar</button>}
                                  {/* show delete only to project leader (creator) */}
                                  {isLeader && (
                                    <button className="ch-btn ch-btn-danger" onClick={async ()=>{
                                      // confirm deletion
                                      if (!confirm('¿Eliminar esta tarea? Esta acción no se puede deshacer.')) return;
                                      try {
                                        const idToDelete = t._id || t.id;
                                        await fetch((import.meta.env.VITE_API_URL || 'http://localhost:4000') + `/api/tasks/${idToDelete}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
                                        setTasks(prev => prev.filter(x => (x._id||x.id) !== idToDelete));
                                      } catch (err:any) { console.error('delete task', err); }
                                    }}>Eliminar</button>
                                  )}
                                </div>
                      </div>
                    </div>
                  </div>
                  ))
                })()}
              </div>
            </div>

            {taskModalOpen && (
              <CreateTaskModal members={memberNames} onClose={()=>setTaskModalOpen(false)} onCreate={async (t:any)=>{
                if (!projectId) return;
                try {
                  const payload:any = { projectId, title: t.title, description: t.description || '', dueDate: t.dueDate || null };
                  if (t.category) payload.category = t.category;
                  const created = await postJson('/api/tasks', payload, token || undefined);
                  const normalized = { id: created._id || created.id, _id: created._id, title: created.title, description: created.description, assignees: created.assignees || [], dueDate: created.dueDate, status: created.status || 'pending', category: created.category || 'medio' };
                  setTasks(s => [normalized, ...s]);
                  setTaskModalOpen(false);
                } catch (err:any) {
                  console.error('create task', err);
                  if (err && err.status === 401) navigate('/');
                }
              }} />
            )}
          </div>
        )}
        {tab === 'team' && (
          <div>
            <div className="ch-calendar-header">
              <div>
                <h3>Miembros del Equipo ({project?.members?.length || 0})</h3>
                <div className="ch-small">Gestiona roles y permisos de los miembros del proyecto</div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="ch-primary" onClick={async ()=>{
                  if (!projectId) return;
                  const email = prompt('Email del miembro a invitar:');
                  if (!email) return;
                  try {
                    const resp = await postJson(`/api/projects/${projectId}/invitations`, { email }, token || undefined);
                    alert('Invitación enviada. Token: ' + (resp.token || ''));
                    // refresh project to get updated invitations/members
                    const refreshed = await getJson(`/api/projects/${projectId}`, token || undefined);
                    setProject(refreshed);
                  } catch (err:any) {
                    console.error('invite member', err);
                    if (err && err.status === 401) navigate('/');
                    if (err && err.status === 403) alert('Solo líderes pueden invitar miembros');
                  }
                }}>+ Invitar Miembro</button>
                {/* delete button moved to Configuración tab; only invite remains here */}
              </div>
            </div>

            <div className="ch-box">
              <div className="team-list">
                {(project?.members || []).map((m:any, idx:number) => {
                  const user = m.user || {};
                  const name = user.name || user.email || String(user);
                  const email = user.email || '';
                  const initials = (name.split(' ').map((p:any)=>p[0]).slice(0,2).join('')).toUpperCase();
                  const isMemberLeader = !!m.isLeader;
                  return (
                    <div key={String(user._id || user || idx)} className="team-member-card">
                      <div style={{display:'flex',gap:12,alignItems:'center'}}>
                        <div className="member-avatar" style={{background:'#f3f4f6'}}>{initials}</div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:600}}>{name}</div>
                          <div className="muted" style={{marginTop:4}}>{email}</div>
                          <div style={{marginTop:6}}><span className={`role-badge ${isMemberLeader ? 'leader' : 'member'}`} style={{fontSize:12,fontWeight:600}}>{isMemberLeader ? 'Líder' : 'Miembro'}</span></div>
                        </div>
                        <div style={{display:'flex',gap:8}}>
                          {isLeader && !isMemberLeader && (
                            <button className="ch-btn ch-btn-secondary" onClick={async ()=>{
                              if (!confirm(`Quitar a ${name} del proyecto?`)) return;
                              try {
                                const memberId = (user._id || user.id || user).toString();
                                const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:4000') + `/api/projects/${projectId}/members/${memberId}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
                                if (!res.ok) {
                                  const err = await res.json().catch(()=>({ error: 'Failed' }));
                                  alert('Error al quitar miembro: ' + (err && err.error ? err.error : JSON.stringify(err)));
                                  return;
                                }
                                // refresh project
                                const refreshed = await getJson(`/api/projects/${projectId}`, token || undefined);
                                setProject(refreshed);
                              } catch (err:any) { console.error('remove member', err); alert('Error al quitar miembro'); }
                            }}>Quitar miembro</button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{height:12}} />
          </div>
        )}
        {tab === 'config' && (
          <div>
            <div className="ch-calendar-header">
              <div>
                <h3>Configuración del Proyecto</h3>
                <div className="ch-small">Ajustes y metadatos del proyecto</div>
              </div>
            </div>

            <div style={{height:12}} />
            <div className="ch-box" style={{display:'flex',flexDirection:'column',gap:12}}>
              <div>
                <div style={{fontWeight:700,marginBottom:6}}>Nombre del Proyecto</div>
                {isLeader ? (
                  <input value={nameInput} onChange={(e)=>setNameInput(e.target.value)} style={{width:'100%',padding:8,borderRadius:6,border:'1px solid #e5e7eb'}} />
                ) : (
                  <div className="muted">{project?.name || '—'}</div>
                )}
              </div>

              <div>
                <div style={{fontWeight:700,marginBottom:6}}>Descripción</div>
                {isLeader ? (
                  <textarea value={descriptionInput} onChange={(e)=>setDescriptionInput(e.target.value)} style={{width:'100%',minHeight:80,padding:8,borderRadius:6,border:'1px solid #e5e7eb'}} />
                ) : (
                  <div className="muted">{project?.description || '—'}</div>
                )}
              </div>

              <div>
                <div style={{fontWeight:700,marginBottom:6}}>Fecha de Vencimiento del Proyecto</div>
                <div className="muted">Configura la fecha límite del proyecto. Si la fecha ya pasó, el proyecto se marcará como finalizado automáticamente.</div>
                <div style={{marginTop:8}}>
                  {isLeader ? (
                    <input type="date" value={dueDateInput} onChange={(e)=>setDueDateInput(e.target.value)} />
                  ) : (
                    <div className="muted">{project?.dueDate ? new Date(project.dueDate).toLocaleDateString('es-ES') : 'Sin fecha'}</div>
                  )}
                </div>
              </div>

              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                {isLeader && (
                  <>
                    <button className="ch-btn ch-btn-primary" onClick={async ()=>{
                      if (!projectId) return;
                      try {
                        const payload:any = { name: nameInput, description: descriptionInput, dueDate: dueDateInput || null };
                        const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:4000') + `/api/projects/${projectId}`, { method: 'PUT', headers: { 'Content-Type':'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
                        if (!res.ok) {
                          const err = await res.json().catch(()=>({ error: 'Failed' }));
                          alert('Error al guardar la configuración: ' + (err && err.error ? err.error : JSON.stringify(err)));
                          return;
                        }
                        const updated = await res.json();
                        setProject(updated);
                        alert('Configuración guardada');
                      } catch (err:any) { console.error('save config', err); alert('Error al guardar'); }
                    }}>Guardar</button>
                    <button className="ch-btn ch-btn-danger" onClick={async ()=>{
                      if (!confirm('¿Eliminar este proyecto? Esta acción no se puede deshacer.')) return;
                      try {
                        const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:4000') + `/api/projects/${projectId}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
                        if (!res.ok) {
                          const err = await res.json().catch(()=>({ error: 'Failed' }));
                          alert('Error al borrar el proyecto: ' + (err && err.error ? err.error : JSON.stringify(err)));
                          return;
                        }
                        navigate('/dashboard');
                      } catch (err:any) { console.error('delete project', err); alert('Error al borrar el proyecto'); }
                    }}>Borrar Proyecto</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
