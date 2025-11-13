import React, { useState } from 'react'
import './CreateProjectModal.css'
import { postJson } from '../services/api'

export default function CreateProjectModal({ onClose, token, onCreated }:{ onClose: ()=>void, token?: string, onCreated?: (p:any)=>void }){
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'not_started'|'in_progress'|'completed'>('not_started');
  const [dueDate, setDueDate] = useState('');
  const [platforms, setPlatforms] = useState<{instagram:boolean,tiktok:boolean,youtube:boolean}>({instagram:false,tiktok:false,youtube:false});
  const [loading, setLoading] = useState(false);

  const togglePlatform = (k:'instagram'|'tiktok'|'youtube') => {
    setPlatforms(prev => ({ ...prev, [k]: !prev[k] }));
  }

  const submit = async () => {
    if (!name) return alert('Nombre requerido');
    try {
      setLoading(true);
      const selected = Object.keys(platforms).filter(k => (platforms as any)[k]);
      const body:any = { name, description };
      if (selected.length) body.platforms = selected;
      if (status) body.status = status;
      if (dueDate) body.dueDate = dueDate;
      const res = await postJson('/api/projects', body, token);
      alert('Proyecto creado');
      onCreated && onCreated(res);
      onClose();
    } catch (err:any) {
      console.error('create project error', err);
      alert('Error creando proyecto: ' + (err?.data?.error || err?.message || JSON.stringify(err)));
    } finally { setLoading(false); }
  }

  return (
    <div className="ch-modal-overlay">
      <div className="ch-modal">
        <div className="ch-modal-header">
          <h3>Crear Nuevo Proyecto</h3>
          <button onClick={onClose} className="ch-modal-close">×</button>
        </div>
        <div className="ch-modal-body">
          <label>Nombre del Proyecto</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ej: Campaña TikTok Diciembre" />
          <label>Descripción</label>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe el objetivo y alcance del proyecto..." />

          <div style={{display:'flex',gap:12,alignItems:'center',marginTop:8}}>
            <div>
              <label>Estado del Proyecto</label>
              <select value={status} onChange={e=>setStatus(e.target.value as any)}>
                <option value="not_started">No Iniciado</option>
                <option value="in_progress">En Proceso</option>
                <option value="completed">Terminado</option>
              </select>
            </div>
            <div>
              <label>Fecha de Vencimiento</label>
              <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} />
            </div>
          </div>

          <div style={{marginTop:12}}>
            <label>Plataforma Principal</label>
            <div className="ch-platforms">
              <label className={platforms.instagram? 'active':''}><input type="checkbox" checked={platforms.instagram} onChange={()=>togglePlatform('instagram')} /> Instagram</label>
              <label className={platforms.tiktok? 'active':''}><input type="checkbox" checked={platforms.tiktok} onChange={()=>togglePlatform('tiktok')} /> TikTok</label>
              <label className={platforms.youtube? 'active':''}><input type="checkbox" checked={platforms.youtube} onChange={()=>togglePlatform('youtube')} /> YouTube</label>
            </div>
          </div>

        </div>
        <div className="ch-modal-footer">
          <button onClick={onClose}>Cancelar</button>
          <button className="ch-primary" onClick={submit} disabled={loading}>{loading ? 'Creando…' : 'Crear Proyecto'}</button>
        </div>
      </div>
    </div>
  )
}
