import React, { useState } from 'react';
import './styles/login.css';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';

export default function LoginView({ onSwitch }: { onSwitch?: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const auth = useAuth();
  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
  // call auth context login (which calls API and persists token)
  await auth.login({ email, password });
  // redirect to dashboard (SPA)
  navigate('/dashboard');
    } catch (err: any) {
      setError(err?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="promo">
        <div className="promo-badge">Plataforma Colaborativa</div>
        <h1>
          Crea contenido en <span className="accent">equipo</span>
        </h1>
        <p className="promo-sub">
          Organiza proyectos, planifica publicaciones y analiza métricas de todas tus redes sociales en un solo lugar.
        </p>
        <ul className="promo-features">
          <li>Colaboración en tiempo real</li>
          <li>Métricas unificadas</li>
          <li>Gestión flexible de roles</li>
        </ul>
      </div>

      <div className="auth-card">
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-icon">👥</div>
          <h2>Iniciar Sesión</h2>
          <p className="auth-sub">Accede a tu plataforma de contenido</p>

          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required />
          </label>

          <label className="field">
            <span>Contraseña</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </label>

          {error && <div className="error">{error}</div>}

          <button className="cta" disabled={loading}>{loading ? 'Validando...' : 'Iniciar sesión'}</button>

          <div className="auth-footer">
            <a className="link" href="#register" onClick={(e) => { e.preventDefault(); onSwitch && onSwitch(); }}>¿No tienes cuenta? Regístrate</a>
            <div className="demo-note">Demo: Puedes usar cualquier email para probar la plataforma</div>
          </div>
        </form>
      </div>
      {loading && (
        <div className="ch-overlay">
          <Loader />
        </div>
      )}
    </div>
  );
}
