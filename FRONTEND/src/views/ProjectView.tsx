import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getJson } from '../services/api'
import './ProjectView.css'
import CreateEventModal from '../components/CreateEventModal'
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

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const data = await getJson(`/api/projects/${projectId}`, undefined);
        setProject(data);
      } catch (err) {
        console.error('fetch project', err);
      }
    })();
  }, [projectId]);

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
      </div>
    </div>
  )
}
