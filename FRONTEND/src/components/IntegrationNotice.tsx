import React, { useState } from 'react'
import './IntegrationNotice.css'
import { useAuth } from '../context/AuthContext'
import { startYoutubeOAuth } from '../services/integrations'

type Props = {
  platform: string;
  title?: string;
  description?: string;
  ctaText?: string;
}

export default function IntegrationNotice({ platform, title, description, ctaText }: Props){
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const onConnect = async () => {
    try {
      if (!token) throw new Error('No estás autenticado');
      setLoading(true);
      const url = await startYoutubeOAuth(token);
      // redirect browser to Google consent page
      window.location.href = url;
    } catch (err: any) {
      console.error('startYoutubeOAuth error', err);
      alert(err?.message || 'No se pudo iniciar el flujo de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ch-integration">
      <div className="ch-integration-left">
        <div className="ch-integration-icon">📡</div>
        <div>
          <div className="ch-integration-title">{title || `Conectar API de ${platform}`}</div>
          <div className="ch-integration-desc">{description || `Para obtener métricas en tiempo real de ${platform}, conecta la API oficial.`}</div>
        </div>
      </div>
      <div className="ch-integration-cta">
        <button className="ch-cta" onClick={onConnect} disabled={loading}>{loading ? 'Redirigiendo…' : (ctaText || `Conectar API de ${platform}`)}</button>
        <div className="ch-note">Actualmente mostrando datos de ejemplo. En producción, estos serían datos reales de tu cuenta.</div>
      </div>
    </div>
  )
}
