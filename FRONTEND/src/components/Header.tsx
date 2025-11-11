import React from 'react'
import './Header.css'
import { useAuth } from '../context/AuthContext'

export default function Header(){
  const { user } = useAuth();
  return (
    <header className="ch-header">
      <div className="ch-brand">
        <div className="ch-logo">🟣</div>
        <div>
          <div className="ch-title">ContentHub</div>
          <div className="ch-sub">Plataforma Colaborativa</div>
        </div>
      </div>

      <div className="ch-user">
        <div className="ch-user-info">
          <div className="ch-user-name">{user?.name || 'Usuario Demo'}</div>
          <div className="ch-user-email">{user?.email || 'demo@creatorhub.test'}</div>
        </div>
        <div className="ch-user-avatar">🙂</div>
      </div>
    </header>
  )
}
