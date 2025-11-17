import React, { useState } from 'react'
import './IntegrationNotice.css'
import { useAuth } from '../context/AuthContext'
import { startYoutubeOAuth, getIntegrationAccounts } from '../services/integrations'

type Props = {
  platform: string;
  title?: string;
  description?: string;
  ctaText?: string;
}

export default function IntegrationNotice({ platform, title, description, ctaText }: Props){
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState<any | null>(null);

  const onConnect = async () => {
    try {
      if (!token) throw new Error('No estás autenticado');
      setLoading(true);
      // Only YouTube OAuth is implemented on the backend.
      if (String(platform || '').toLowerCase() === 'youtube') {
        const url = await startYoutubeOAuth(token);
        // redirect browser to Google consent page
        window.location.href = url;
      } else {
        // For other platforms, redirect user to the integrations management page
        // where we can show instructions or future connect flows.
        window.location.href = '/integrations';
      }
    } catch (err: any) {
      console.error('startYoutubeOAuth error', err);
      alert(err?.message || 'No se pudo iniciar el flujo de conexión');
    } finally {
      setLoading(false);
    }
  }

  // Check whether there's an existing connected account for this platform
  React.useEffect(() => {
    (async () => {
      if (!token) return;
      setChecking(true);
      try {
        const accounts = await getIntegrationAccounts(token);
        if (!accounts || !Array.isArray(accounts)) {
          setConnectedAccount(null);
          return;
        }
        const found = accounts.find((a:any) => String((a.platform||'')).toLowerCase() === String(platform||'').toLowerCase());
        setConnectedAccount(found || null);
      } catch (err:any) {
        console.error('check integration accounts', err);
        setConnectedAccount(null);
      } finally {
        setChecking(false);
      }
    })();
  }, [platform, token]);

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
        {checking ? (
          <div className="muted">Comprobando conexión…</div>
        ) : (
          <>
            <button className="ch-cta" onClick={onConnect} disabled={loading}>{loading ? 'Redirigiendo…' : (connectedAccount ? `Conectar API de ${platform} con otra cuenta` : (ctaText || `Conectar API de ${platform}`))}</button>
            {connectedAccount && (
              <div style={{marginTop:8}} className="muted">Conectado actualmente{connectedAccount.metadata?.title ? ` como ${connectedAccount.metadata.title}` : ''}.</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
