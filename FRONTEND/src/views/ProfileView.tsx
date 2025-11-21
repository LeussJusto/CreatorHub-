import React from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

export default function ProfileView() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="ch-profile-container">
      <Header />
      <div className="ch-profile-content">
        <div className="ch-profile-card">
          <div className="ch-profile-header">
            <h1>Mi Perfil</h1>
            <p className="ch-profile-subtitle">Gestiona tu información personal</p>
          </div>

          <div className="ch-profile-section">
            <div className="ch-profile-avatar-large">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            
            <div className="ch-profile-info">
              <div className="ch-profile-field">
                <label>Nombre</label>
                <div className="ch-profile-value">{user.name || 'No especificado'}</div>
              </div>

              <div className="ch-profile-field">
                <label>Email</label>
                <div className="ch-profile-value">{user.email || 'No especificado'}</div>
              </div>

              <div className="ch-profile-field">
                <label>ID de Usuario</label>
                <div className="ch-profile-value ch-profile-value-muted">{user.id || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div className="ch-profile-actions">
            <button 
              className="ch-profile-button ch-profile-button-secondary"
              onClick={() => navigate('/dashboard')}
            >
              Volver al Dashboard
            </button>
            <button 
              className="ch-profile-button ch-profile-button-danger"
              onClick={handleLogout}
            >
              🚪 Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

