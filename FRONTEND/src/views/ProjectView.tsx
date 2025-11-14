import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getJson } from '../services/api'
import { useAuth } from '../context/AuthContext'
import './ProjectView.css'
import CreateEventModal from '../components/CreateEventModal'
import CreateTaskModal from '../components/CreateTaskModal'
import AudienceMetrics from '../components/AudienceMetrics'
import VideoMetrics from '../components/VideoMetrics'
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
  const [tab, setTab] = useState<'calendar'|'scripts'|'tasks'|'metrics'|'team'>('calendar');
  const [viewMode, setViewMode] = useState<'month'|'list'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date(2025,9,19));

  // Static events for demo (date YYYY-MM-DD)
  const staticEvents = [
    { id: 'e1', title: 'Grabar TikTok', desc: 'Baile', date: '2025-10-19', time: '12:26' },
    { id: 'e2', title: 'Edición Video 1', desc: 'YouTube', date: '2025-10-20', time: '09:00' },
    { id: 'e3', title: 'Publicar Instagram', desc: 'Instagram', date: '2025-10-22', time: '18:00' },
    { id: 'e4', title: 'Planificación', desc: 'Reunión', date: '2025-10-25', time: '10:00' },
    { id: 'e5', title: 'Revisión final', desc: 'YouTube', date: '2025-10-27', time: '16:00' },
    { id: 'e6', title: 'Sesión Fotos', desc: 'Instagram', date: '2025-10-30', time: '11:00' },
  ];

  // Sample scripts for the 'Guiones' view
  const sampleScripts = [
    { id: 's1', title: 'TikTok - Trend Navideño #1', author: 'María García', comments: 2, status: 'En Revisión' },
    { id: 's2', title: 'Instagram Reel - Tutorial Edición', author: 'Ana Martínez', comments: 0, status: 'Borrador' },
    { id: 's3', title: 'YouTube - Video Semanal', author: 'Diego Ramírez', comments: 1, status: 'Aprobado' },
  ]

  // Details & comments per script (local mock)
  const initialScriptDetails: Record<string, any> = {
    s1: {
      lastEditedBy: 'María García',
      lastEditedAt: new Date(2025, 11, 13, 15, 30),
      content: `# Guion TikTok - Trend Navideño

## Concepto
Vídeo de 15 segundos siguiendo el trend de "POV: Eres Santa preparándote para Navidad"

## Escenas
1. **Intro (0-3s)**: Despertar con pijama de Santa
2. **Desarrollo (3-10s)**: Revisando lista de regalos en tablet
3. **Cierre (10-15s)**: Guión a cámara y texto "24 de diciembre here we go"

## Audio
- Canción: "Jingle Bell Rock" (versión trending)

## Hashtags
#NavidadTikTok #SantaClaus #Navidad2024`,
      comments: [
        { id: 'c1', author: 'Carlos López', text: 'Me gusta el concepto! Sugiero agregar un efecto de transición entre escenas', createdAt: new Date(2025,11,13,16,0) },
        { id: 'c2', author: 'María García', text: 'Perfecto, lo grabaremos mañana en la mañana', createdAt: new Date(2025,11,13,16,15) },
      ],
    },
    s2: {
      lastEditedBy: 'Ana Martínez',
      lastEditedAt: new Date(2025, 9, 1, 10, 0),
      content: 'Guion para Instagram Reel - placeholder',
      comments: [],
    },
    s3: {
      lastEditedBy: 'Diego Ramírez',
      lastEditedAt: new Date(2025, 9, 2, 11, 0),
      content: 'Guion para YouTube - placeholder',
      comments: [ { id: 'c3', author: 'Diego Ramírez', text: 'Listo para publicar', createdAt: new Date(2025,9,2,12,0) } ],
    }
  }
  const [scriptDetails, setScriptDetails] = useState<Record<string, any>>(initialScriptDetails)
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null)
  // Sample members (for assign dropdown)
  const sampleMembers = ['María García','Carlos López','Ana Martínez','Diego Ramírez']

  // Sample tasks
  const initialTasks = [
    { id: 't1', title: 'Grabar video TikTok trend navideño', description: 'Seguir el guion aprobado y grabar las 3 escenas', assignee: 'María García', dueDate: '2025-12-15', status: 'in_progress' },
    { id: 't2', title: 'Editar reel de Instagram - Tutorial', description: 'Agregar transiciones y efectos según el guion', assignee: 'Carlos López', dueDate: '2025-12-16', status: 'pending' },
    { id: 't3', title: 'Diseñar miniatura para video-YouTube', description: 'Miniatura llamativa para el video de crecimiento', assignee: 'Ana Martínez', dueDate: '2025-12-14', status: 'completed' },
  ]
  const [tasks, setTasks] = useState(initialTasks)
  const [taskModalOpen, setTaskModalOpen] = useState(false)

  // Detailed team members for Equipo tab
  const teamMembers = [
    { id: 'm1', name: 'María García', email: 'maria@example.com', roles: ['Líder'], avatar: 'MG', avatarBg: '#fff7ed' },
    { id: 'm2', name: 'Carlos López', email: 'carlos@example.com', roles: ['Miembro','Diseñador'], avatar: 'CL', avatarBg: '#f8f0ff' },
    { id: 'm3', name: 'Ana Martínez', email: 'ana@example.com', roles: ['Editor de Video'], avatar: 'AM', avatarBg: '#ecfdf5' },
  ]

  const totalTasks = tasks.length
  const pendingCount = tasks.filter(t=>t.status==='pending').length
  const inProgressCount = tasks.filter(t=>t.status==='in_progress').length
  const completedCount = tasks.filter(t=>t.status==='completed').length
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedCount/totalTasks)*100)

  function addTask(t:any){
    setTasks(prev => [t, ...prev])
  }

  function updateTaskStatus(id:string, status:string){
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  // Map static events to react-big-calendar events
  const [eventsState, setEventsState] = useState(() => staticEvents.map(ev => {
    const [y, m, d] = ev.date.split('-').map(Number);
    const [hh, mm] = ev.time.split(':').map(Number);
    const start = new Date(y, m-1, d, hh, mm);
    const end = addHours(start, 1);
    return { id: ev.id, title: ev.title, start, end, desc: ev.desc }
  }))
  const events = eventsState
  const [modalOpen, setModalOpen] = useState(false)
  const totalEvents = events.length
  const today = selectedDate ? new Date(selectedDate) : null
  const eventsToday = today ? events.filter(e => e.start.toISOString().slice(0,10) === today.toISOString().slice(0,10)) : []
  const upcoming = events.filter(e => e.start > new Date()).length

  const { token, initialized } = useAuth();

  useEffect(() => {
    if (!projectId) return;
    // wait until auth restored
    if (!initialized) return;
    (async () => {
      try {
        const data = await getJson(`/api/projects/${projectId}`, token || undefined);
        setProject(data);
      } catch (err: any) {
        console.error('fetch project', err);
        // handle unauthorized: redirect to login
        if (err && err.status === 401) {
          // token invalid or missing
          navigate('/');
        }
      }
    })();
  }, [projectId, token, initialized, navigate]);

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

  return (
    <div className="ch-project-page">
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
                onCreate={(ev) => {
                  // ev: { id, title, desc, start, end }
                  const toAdd = { id: ev.id, title: ev.title, start: ev.start, end: ev.end || addHours(ev.start,1), desc: ev.desc || '' }
                  setEventsState(s => [toAdd, ...s])
                  setSelectedDate(ev.start)
                }}
              />
            )}
          </div>
        )}

        {tab === 'metrics' && (
          <div>
            <div className="ch-calendar-header">
              <div>
                <h3>Métricas del Canal</h3>
                <div className="ch-small">Panel completo de análisis y rendimiento</div>
              </div>
              <div>
                <button className="ch-secondary">🔄 Actualizar Datos</button>
              </div>
            </div>

            <div className="metrics-card">
              <div className="metrics-banner" />
              <div className="metrics-body">
                <div style={{display:'flex',alignItems:'center',gap:16}}>
                  <div className="metrics-avatar">CS</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:18}}>{ytMetrics.channelName}</div>
                    <div className="muted">Suscriptores</div>
                    <div style={{fontSize:22,fontWeight:700,marginTop:6}}>{ytMetrics.subscribers}</div>
                    <div style={{color:'#10b981',fontSize:13,marginTop:6}}>{ytMetrics.subscribersDelta} este mes</div>
                  </div>
                </div>

                <div style={{marginLeft:'auto',display:'flex',gap:24,alignItems:'center'}}>
                  <div style={{textAlign:'right'}}>
                    <div className="muted">Total de Videos</div>
                    <div style={{fontWeight:700,fontSize:18}}>{ytMetrics.videosCount}</div>
                    <div className="muted">Publicados</div>
                  </div>

                  <div style={{textAlign:'right'}}>
                    <div className="platform-pill">YouTube</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{height:12}} />

            <div className="metrics-tabs">
              <button className={metricTab==='rendimiento'?'active':''} onClick={()=>setMetricTab('rendimiento')}>Rendimiento</button>
              <button className={metricTab==='audiencia'?'active':''} onClick={()=>setMetricTab('audiencia')}>Audiencia</button>
              <button className={metricTab==='porvideo'?'active':''} onClick={()=>setMetricTab('porvideo')}>Por Video</button>
            </div>

            <div style={{height:12}} />

            {metricTab === 'rendimiento' && (
              <div className="ch-box">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <div>
                    <div style={{fontWeight:700}}>Métricas de Rendimiento</div>
                    <div className="muted">Estadísticas generales del canal</div>
                  </div>
                  <div>
                    <button className="ch-btn ch-btn-secondary">Detalles Específicos</button>
                  </div>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>
                  <div className="metric-card">
                    <div className="muted">Vistas</div>
                    <div className="metric-value">{ytMetrics.views}</div>
                    <div style={{color:'#10b981',fontSize:13}}>↗ {ytMetrics.viewsDelta} vs. mes anterior</div>
                  </div>

                  <div className="metric-card">
                    <div className="muted">Tiempo de Reproducción</div>
                    <div className="metric-value">{ytMetrics.watchTime}</div>
                    <div style={{color:'#10b981',fontSize:13}}>↗ {ytMetrics.watchTimeDelta} vs. mes anterior</div>
                  </div>

                  <div className="metric-card">
                    <div className="muted">Likes</div>
                    <div className="metric-value">{ytMetrics.likes}</div>
                    <div style={{color:'#10b981',fontSize:13}}>↗ {ytMetrics.likesDelta} vs. mes anterior</div>
                  </div>

                  <div className="metric-card">
                    <div className="muted">Suscripciones Ganadas</div>
                    <div className="metric-value" style={{color:'#10b981'}}>{ytMetrics.subsGain}</div>
                    <div style={{color:'#10b981',fontSize:13}}>↗ Excelente crecimiento</div>
                  </div>

                  <div className="metric-card">
                    <div className="muted">Suscripciones Perdidas</div>
                    <div className="metric-value" style={{color:'#dc2626'}}>{ytMetrics.subsLost}</div>
                    <div className="muted">Tasa de retención: 92.5%</div>
                  </div>
                </div>
              </div>
            )}

            {metricTab === 'audiencia' && (
              <div>
                {/* Audience metrics component */}
                {/* Lazy inline import to avoid heavy initial bundle if desired later */}
                <AudienceMetrics />
              </div>
            )}

            {metricTab === 'porvideo' && (
              <div>
                <VideoMetrics />
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
                <button className="ch-primary">+ Nuevo Guion</button>
              </div>
            </div>

            <div className="ch-scripts-container">
              <div className="ch-scripts-left">
                <div className="ch-box">
                  <div style={{fontWeight:700,marginBottom:12}}>Todos los Guiones ({sampleScripts.length})</div>
                  <div className="script-list">
                    {sampleScripts.map(s => {
                      const isSelected = selectedScriptId === s.id
                      return (
                        <div key={s.id} className={`script-card ${isSelected? 'selected':''}`} onClick={() => setSelectedScriptId(s.id)} style={{cursor:'pointer'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            <div style={{fontWeight:600}}>{s.title}</div>
                            <div className={`status-badge ${s.status.replace(/\s+/g,'-').toLowerCase()}`}>{s.status}</div>
                          </div>
                          <div className="muted" style={{marginTop:6}}>{s.author} • {s.comments} comentarios</div>
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
                      const detail = scriptDetails[selectedScriptId]
                      if(!detail) return <div className="muted">Guion no encontrado</div>
                      return (
                        <div>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                            <div>
                              <div style={{fontWeight:700,fontSize:18}}>{sampleScripts.find(s=>s.id===selectedScriptId)?.title}</div>
                              <div className="muted">Última edición: {detail.lastEditedBy} • {detail.lastEditedAt.toLocaleString()}</div>
                            </div>
                            <div style={{display:'flex',gap:8}}>
                              <button className="ch-btn ch-btn-secondary">Borrador</button>
                              <button className="ch-btn ch-btn-secondary">En Revisión</button>
                              <button className="ch-btn ch-btn-primary">Aprobar</button>
                            </div>
                          </div>

                          <div style={{border:'1px solid #f0f0f0',borderRadius:8,background:'#fff',padding:12,marginBottom:8}}>
                            <textarea value={detail.content} onChange={(e)=>{
                              const val = e.target.value
                              setScriptDetails(sd=>({ ...sd, [selectedScriptId]: { ...sd[selectedScriptId], content: val } }))
                            }} style={{width:'100%',minHeight:220,border:'none',outline:'none',resize:'vertical'}} />
                          </div>

                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            <div className="muted">{(detail.content || '').length} caracteres</div>
                            <div>
                              <button className="ch-btn ch-btn-secondary" onClick={()=>{
                                // revert: reload from initial
                                setScriptDetails(sd=>({ ...sd, [selectedScriptId]: initialScriptDetails[selectedScriptId] }))
                              }}>Revertir</button>
                              <button className="ch-btn ch-btn-primary" style={{marginLeft:8}} onClick={()=>{
                                // simulate save: update last edited
                                setScriptDetails(sd=>({ ...sd, [selectedScriptId]: { ...sd[selectedScriptId], lastEditedAt: new Date() } }))
                              }}>Guardar Cambios</button>
                            </div>
                          </div>

                          <div style={{marginTop:18}}>
                            <div style={{fontWeight:700,marginBottom:8}}>Comentarios ({(detail.comments||[]).length})</div>
                            <div className="comments-list">
                              {(detail.comments||[]).map((c:any)=> (
                                <div key={c.id} className="comment-row">
                                  <div className="comment-avatar">{c.author.split(' ').map((p:any)=>p[0]).slice(0,2).join('')}</div>
                                  <div className="comment-body">
                                    <div style={{display:'flex',justifyContent:'space-between'}}>
                                      <div style={{fontWeight:600}}>{c.author}</div>
                                      <div className="muted" style={{fontSize:12}}>{c.createdAt.toLocaleString()}</div>
                                    </div>
                                    <div style={{marginTop:6}}>{c.text}</div>
                                  </div>
                                </div>
                              ))}

                              <div style={{display:'flex',gap:8,marginTop:12}}>
                                <input placeholder="Agregar un comentario..." className="comment-input" id="newCommentInput" />
                                <button className="ch-btn ch-btn-primary" onClick={()=>{
                                  const input = document.getElementById('newCommentInput') as HTMLInputElement
                                  if(!input) return
                                  const txt = input.value.trim(); if(!txt) return
                                  const newC = { id: String(Date.now()), author: 'Tu Nombre', text: txt, createdAt: new Date() }
                                  setScriptDetails(sd=>({ ...sd, [selectedScriptId]: { ...sd[selectedScriptId], comments: [ ...(sd[selectedScriptId].comments||[]), newC ] } }))
                                  input.value = ''
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
                <button className="ch-primary" onClick={()=>setTaskModalOpen(true)}>+ Nueva Tarea</button>
              </div>
            </div>

            <div className="ch-box" style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{width:'70%'}}>
                  <div style={{fontWeight:600,marginBottom:6}}>Progreso General</div>
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
                {tasks.map(t => (
                  <div key={t.id} className="task-card">
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                        <input type="checkbox" checked={t.status==='completed'} onChange={(e)=> updateTaskStatus(t.id, e.target.checked ? 'completed' : 'in_progress')} />
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
                        <div style={{display:'flex',gap:8}}>
                          {t.status !== 'completed' && <button className="ch-btn ch-btn-secondary" onClick={()=> updateTaskStatus(t.id,'in_progress')}>En Progreso</button>}
                          {t.status !== 'completed' && <button className="ch-btn ch-btn-primary" onClick={()=> updateTaskStatus(t.id,'completed')}>Completar</button>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {taskModalOpen && (
              <CreateTaskModal members={sampleMembers} onClose={()=>setTaskModalOpen(false)} onCreate={(t:any)=> addTask(t)} />
            )}
          </div>
        )}
        {tab === 'team' && (
          <div>
            <div className="ch-calendar-header">
              <div>
                <h3>Miembros del Equipo ({teamMembers.length})</h3>
                <div className="ch-small">Gestiona roles y permisos de los miembros del proyecto</div>
              </div>
              <div>
                <button className="ch-primary">+ Invitar Miembro</button>
              </div>
            </div>

            <div className="ch-box">
              <div className="team-list">
                {teamMembers.map(m => (
                  <div key={m.id} className="team-member-card">
                    <div style={{display:'flex',gap:12,alignItems:'center'}}>
                      <div className="member-avatar" style={{background:m.avatarBg}}>{m.avatar}</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600}}>{m.name}</div>
                        <div className="muted" style={{marginTop:4}}>{m.email}</div>
                        <div style={{marginTop:8,display:'flex',gap:8}}>
                          {m.roles.map((r:string,idx:number)=> (
                            <div key={idx} className={`role-badge role-${r.replace(/\s+/g,'-').toLowerCase()}`}>{r}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{height:12}} />

            <div className="ch-box role-info-box">
              <div style={{fontWeight:700,marginBottom:8}}>Información de Roles</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><div style={{fontWeight:600}}>Líder:</div><div className="muted">Gestiona miembros y tiene control total</div></div>
                <div><div style={{fontWeight:600}}>Miembro:</div><div className="muted">Acceso completo a herramientas del proyecto</div></div>
                <div><div style={{fontWeight:600}}>Diseñador:</div><div className="muted">Especialista en diseño visual y gráfico</div></div>
                <div><div style={{fontWeight:600}}>Editor de Video:</div><div className="muted">Edición y producción de video</div></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
