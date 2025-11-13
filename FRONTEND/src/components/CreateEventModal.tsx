import React, { useState } from 'react'

type Props = {
  onClose: () => void,
  onCreate: (ev: { id: string, title: string, desc?: string, start: Date, end?: Date }) => void
}

export default function CreateEventModal({ onClose, onCreate }: Props){
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  function handleCreate(){
    if(!title || !date || !startTime) return;
    const [y, m, d] = date.split('-').map(Number)
    const [hh, mm] = startTime.split(':').map(Number)
    const start = new Date(y, m-1, d, hh, mm)
    let end: Date | undefined = undefined
    if(endTime){
      const [eh, em] = endTime.split(':').map(Number)
      end = new Date(y, m-1, d, eh, em)
    }
    const ev = { id: String(Date.now()), title, desc, start, end }
    onCreate(ev)
    onClose()
  }

  return (
    <div className="ch-modal-overlay">
      <div className="ch-modal">
        <div className="ch-modal-header">
          <h3>Crear Nuevo Evento</h3>
          <button className="ch-close" onClick={onClose}>×</button>
        </div>
        <div className="ch-modal-body">
          <label>Título del Evento</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ej: Grabar TikTok - Trends" />

          <label style={{marginTop:12}}>Descripción</label>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Detalles del evento..." />

          <div style={{display:'flex',gap:8,marginTop:12}}>
            <div style={{flex:1}}>
              <label>Fecha</label>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
            </div>
            <div style={{width:120}}>
              <label>Hora Inicio</label>
              <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} />
            </div>
            <div style={{width:140}}>
              <label>Hora Fin (opcional)</label>
              <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="ch-modal-footer">
          <button className="ch-btn ch-btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="ch-btn ch-btn-primary" onClick={handleCreate}>Crear Evento</button>
        </div>
      </div>
    </div>
  )
}
