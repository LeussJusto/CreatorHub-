import React, { useState } from 'react'

type Props = {
  onClose: () => void,
  onCreate: (task: any) => void,
  members: string[]
}

export default function CreateTaskModal({ onClose, onCreate, members }: Props){
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [assignee, setAssignee] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [category, setCategory] = useState('medio')

  function handleCreate(){
    if(!title) return
    const task = {
      id: String(Date.now()),
      title,
      description: desc,
      assignee,
      dueDate: dueDate || null,
      status: 'pending',
      category
    }
    onCreate(task)
    onClose()
  }

  return (
    <div className="ch-modal-overlay">
      <div className="ch-modal">
        <div className="ch-modal-header">
          <h3>Crear Nueva Tarea</h3>
          <button className="ch-close" onClick={onClose}>×</button>
        </div>
        <div className="ch-modal-body">
          <label>Título de la Tarea</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ej: Editar video de YouTube" />

          <label style={{marginTop:12}}>Descripción</label>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Detalles de la tarea..." />

          <label style={{marginTop:12}}>Asignar a</label>
          <select value={assignee} onChange={e=>setAssignee(e.target.value)}>
            <option value="">Seleccionar miembro</option>
            {members.map(m=> <option key={m} value={m}>{m}</option>)}
          </select>

          <label style={{marginTop:12}}>Fecha límite</label>
          <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} />

          <label style={{marginTop:12}}>Prioridad</label>
          <select value={category} onChange={e=>setCategory(e.target.value)}>
            <option value="bajo">Bajo</option>
            <option value="medio">Medio</option>
            <option value="alto">Alto</option>
          </select>
        </div>
        <div className="ch-modal-footer">
          <button className="ch-btn ch-btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="ch-btn ch-btn-primary" onClick={handleCreate}>Crear Tarea</button>
        </div>
      </div>
    </div>
  )
}
