import React, { useState, useRef, useEffect } from 'react'
import './Header.css'
import { useAuth } from '../context/AuthContext'
import Notifications from './Notifications'
import { useNavigate } from 'react-router-dom'

export default function Header(){
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setShowMenu(false);
  };

  const handleProfile = () => {
    navigate('/profile');
    setShowMenu(false);
  };

  const handleBrandClick = () => {
    navigate('/dashboard');
  };

  return (
    <header className="ch-header">
      <div className="ch-brand" onClick={handleBrandClick} style={{ cursor: 'pointer' }}>
        <div className="ch-logo">🟣</div>
        <div>
          <div className="ch-title">CreatorHub</div>
          <div className="ch-sub">Plataforma Colaborativa</div>
        </div>
      </div>

      <div className="ch-user">
        <div style={{marginRight:12}}>
          <Notifications />
        </div>
        <div className="ch-user-info">
          <div className="ch-user-name">{user?.name || 'Usuario Demo'}</div>
          <div className="ch-user-email">{user?.email || 'demo@creatorhub.test'}</div>
        </div>
        <div 
          className="ch-user-avatar ch-user-avatar-clickable" 
          onClick={() => setShowMenu(!showMenu)}
          style={{ cursor: 'pointer' }}
        >
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        
        {showMenu && (
          <div className="ch-user-menu" ref={menuRef}>
            <div className="ch-user-menu-item" onClick={handleProfile}>
              👤 Perfil
            </div>
            <div className="ch-user-menu-divider"></div>
            <div className="ch-user-menu-item ch-user-menu-item-danger" onClick={handleLogout}>
              🚪 Cerrar sesión
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
