import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getJson } from '../services/api'
import './ProjectView.css'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import startOfWeek from 'date-fns/startOfWeek'
import getDay from 'date-fns/getDay'
import addHours from 'date-fns/addHours'
import es from 'date-fns/locale/es'
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

  // Map static events to react-big-calendar events
  const events = staticEvents.map(ev => {
    const [y, m, d] = ev.date.split('-').map(Number);
    const [hh, mm] = ev.time.split(':').map(Number);
    const start = new Date(y, m-1, d, hh, mm);
    const end = addHours(start, 1);
    return { id: ev.id, title: ev.title, start, end, desc: ev.desc }
  })

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
                <button className="ch-primary">+ Nuevo Evento</button>
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
          </div>
        )}
      </div>
    </div>
  )
}
