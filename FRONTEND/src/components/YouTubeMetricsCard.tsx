import React, { useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type MetricEntry = {
  account: string;
  metric?: any;
  error?: string;
}

export default function YouTubeMetricsCard({ results, token }: { results: MetricEntry[], token?: string }){
  if (!results || results.length === 0) return (
    <div style={{border:'1px solid #eee',padding:12,borderRadius:8,background:'#fff'}}>No hay métricas disponibles aún.</div>
  )

  const [videosByAccount, setVideosByAccount] = useState<Record<string, any[]>>({});
  const [loadingAccount, setLoadingAccount] = useState<Record<string, boolean>>({});

  return (
    <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:12}}>
      {results.map((r, i) => (
        <div key={i} style={{minWidth:220,flex: '1 0 220px',border:'1px solid #ddd',padding:12,borderRadius:8,background:'#fff'}}>
          <div style={{fontWeight:700,marginBottom:8}}>Cuenta: {r.account}</div>
          {r.error && <div style={{color:'red'}}>Error: {r.error}</div>}
          {r.metric && (
            <div>
              <div>Suscriptores: {r.metric.metrics?.subscribers ?? '—'}</div>
              <div>Vistas: {r.metric.metrics?.views ?? '—'}</div>
              <div>Videos (count): {r.metric.metrics?.videos ?? '—'}</div>
              <div style={{marginTop:8}}>
                <small>¿Mostrar videos públicos?</small>
                <div style={{marginTop:6}}>
                  <button onClick={async () => {
                    if (!token) return alert('Debes iniciar sesión para listar videos');
                    try {
                      setLoadingAccount(prev => ({ ...prev, [r.account]: true }));
                      const res = await fetch(`${API}/api/integrations/accounts/${r.account}/videos?shortsOnly=true&publicOnly=true`, {
                        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
                      });
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        return alert('Error fetching videos: ' + (err?.error || err?.message || res.status));
                      }
                      const data = await res.json();
                      setVideosByAccount(prev => ({ ...prev, [r.account]: data.videos || [] }));
                    } catch (err: any) {
                      console.error('list videos error', err);
                      alert('Error al listar videos: ' + (err?.message || err));
                    } finally {
                      setLoadingAccount(prev => ({ ...prev, [r.account]: false }));
                    }
                  }}>{loadingAccount[r.account] ? 'Cargando…' : 'Mostrar videos públicos'}</button>
                </div>
              </div>
            </div>
          )}
          {videosByAccount[r.account] && (
            <div style={{marginTop:8}}>
              <div style={{fontWeight:600}}>Videos (shorts públicos):</div>
              <ul>
                {videosByAccount[r.account].map((v:any) => (
                  <li key={v.id}>{v.title} — {v.durationSeconds}s</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
