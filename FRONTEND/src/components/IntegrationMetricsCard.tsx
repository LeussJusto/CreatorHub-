import React from 'react';
import './IntegrationMetricsCard.css';
import { useAuth } from '../context/AuthContext';
import { getIntegrationAccounts, startInstagramOAuth } from '../services/integrations';

export default function IntegrationMetricsCard(){
  const { token } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [account, setAccount] = React.useState<any | null>(null);
  const [profile, setProfile] = React.useState<any | null>(null);
  const [media, setMedia] = React.useState<any[] | null>(null);
  const [logs, setLogs] = React.useState<string[]>([]);

  const pushLog = (msg: string, obj?: any) => {
    try { console.log(msg, obj || ''); } catch(e){}
    setLogs(prev => [
      `${new Date().toLocaleTimeString()} - ${msg}`,
      ...prev
    ].slice(0,50));
  };

  React.useEffect(() => {
    (async () => {
      if (!token) return;
      await loadDetails();
    })();
  }, [token]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      pushLog('Fetching integration accounts');
      const accounts = await getIntegrationAccounts(token!);
      pushLog('Accounts fetched', accounts);
      const ig = (accounts || []).find((a:any)=>String(a.platform).toLowerCase() === 'instagram');
      if (!ig) {
        setAccount(null);
        pushLog('No Instagram account connected');
        setLoading(false);
        return;
      }
      setAccount(ig);

      // fetch detailed profile + media from backend
      pushLog('Fetching detailed profile/media for account', ig.id);
      const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:4000') + `/api/integrations/accounts/${ig.id}/videos`, {
        headers: { Authorization: `Bearer ${token!}`, Accept: 'application/json' }
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        pushLog(`Failed to fetch account details (HTTP ${res.status})`, err);
        setProfile(null);
        setMedia(null);
      } else {
        const body = await res.json();
        pushLog('Account details response', body);
        setProfile(body.profile || null);
        setMedia(body.media || []);
      }
    } catch (e:any) {
      pushLog('Error loading integration metrics', e && (e.message || String(e)));
      setAccount(null);
    } finally {
      setLoading(false);
    }
  };

  const onConnect = async () => {
    try {
      if (!token) throw new Error('No auth token');
      pushLog('Starting Instagram OAuth (user triggered)');
      const url = await startInstagramOAuth(token!);
      window.location.href = url;
    } catch (e:any) {
      pushLog('Failed to start OAuth', e && (e.message || String(e)));
      alert(e?.message || 'No se pudo iniciar conexión');
    }
  };

  const picture = () => {
    // Prefer top-level `profile.profile_picture_url`, then `profile.raw.*`, then media, then account.raw
    const p = profile && (profile.profile_picture_url || (profile.raw && (profile.raw.profile_picture_url || profile.raw.profile_picture)) || profile.profile_picture || null);
    if (p) return p;
    if (media && media.length > 0) return media[0].media_url || media[0].thumbnail_url || null;
    if (account && account.raw) {
      const r = account.raw;
      return r && (r.profile_picture_url || r.picture || r.image) || null;
    }
    return null;
  };

  return (
    <div className="ch-integration-metrics-card">
      <div className="ch-integration-metrics-left">
        <h4>Estado de Integraciones</h4>
        <div className="ch-integration-metrics-sub">Resumen rápido de conexiones y métricas</div>

        {loading ? (
          <div className="muted">Cargando métricas…</div>
        ) : (
          <div style={{marginTop:12}}>
            {!account ? (
              <div className="ch-not-connected">
                <div className="ch-not-connected-text">Falta conectar Instagram</div>
                <button className="ch-cta" onClick={onConnect}>Conectar Instagram</button>
              </div>
            ) : (
              <div className="ch-connected">
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                    {picture() ? (
                      <img src={picture() as string} alt="Foto de perfil Instagram" style={{width:72,height:72,borderRadius:'50%',objectFit:'cover'}} />
                    ) : null}
                    <div style={{fontWeight:600,marginTop:8}}>{profile?.username || account.displayName || 'Cuenta Instagram'}</div>
                    <div className="muted">Publicaciones: {profile?.media_count ?? account?.metadata?.media_count ?? 0}</div>
                  </div>
                  <div style={{marginLeft:12}}>
                    <button className="ch-cta" onClick={async () => { pushLog('Manual recheck requested'); await loadDetails(); }}>Recomprobar</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="ch-integration-metrics-logs">
        <div style={{fontWeight:600}}>Logs</div>
        <div style={{fontSize:12,marginTop:6,color:'#666'}}>Las últimas acciones relacionadas con la integración (también se registran en la consola).</div>
        <div className="ch-integration-log-list">
          {logs.length === 0 ? <div className="muted">Sin logs aún</div> : logs.map((l,i) => <div key={i} className="ch-log-line">{l}</div>)}
        </div>
      </div>
    </div>
  );
}
