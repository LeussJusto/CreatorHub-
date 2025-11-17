import React from 'react'

export default function TiktokMetrics({ projectId }: { projectId?: string }){
  return (
    <div className="ch-box">
      <div className="ch-calendar-header">
        <div>
          <h3>Métricas de TikTok</h3>
          <div className="ch-small">Panel estático</div>
        </div>
      </div>

      <div style={{padding:12}} className="muted">Aquí va TikTok (contenido estático por ahora)</div>
    </div>
  )
}
