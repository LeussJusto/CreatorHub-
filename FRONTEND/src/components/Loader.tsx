import React from 'react'
import './Loader.css'

export default function Loader(){
  return (
    <div className="ch-loader-root" role="status" aria-live="polite">
      <div className="ch-spinner" />
      <div className="ch-loader-text">Cargando…</div>
    </div>
  )
}
