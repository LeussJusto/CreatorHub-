import React, { useState, useEffect } from 'react'
import AudienceMetrics from './AudienceMetrics'
import VideoMetrics from './VideoMetrics'
import { useAuth } from '../context/AuthContext'
import { getJson } from '../services/api'

export default function YoutubeMetrics({ projectId }: { projectId?: string }){
  const [metricTab, setMetricTab] = useState<'rendimiento'|'audiencia'|'porvideo'>('rendimiento')
  const { token, initialized } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]); // array of SocialMetric docs mapped

  // local summary derived from first account (fallback to sample values)
  const [summary, setSummary] = useState<any>({
    channelName: 'Creativos Studio',
    subscribers: '—',
    subscribersDelta: '+0',
    videosCount: 0,
    views: '—',
    viewsDelta: '—',
    watchTime: '—',
    watchTimeDelta: '—',
    likes: '—',
    likesDelta: '—',
    subsGain: 0,
    subsLost: 0,
  });

  const fmtNum = (v:any) => (v == null ? '—' : (typeof v === 'number' ? v.toLocaleString() : String(v)));

  useEffect(() => {
    if (!projectId) return;
    if (!initialized) return;
    if (!token) {
      setError('No autenticado');
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const items = await getJson(`/api/analytics/metrics/${projectId}?platform=youtube`, token);
        // items is array of SocialMetric docs
        const mapped = (items || []).map((it:any) => ({ account: it.accountId || it.accountId, metric: it }));
        if (cancelled) return;
        setResults(mapped);
        // derive summary from latest available metric (use last item)
        const first = mapped.length > 0 ? mapped[mapped.length - 1].metric : null;
        if (first && first.metrics) {
          const m = first.metrics || {};
          const o = m.overview || {};
          const perf = m.performance || {};
          setSummary({
            channelName: o.channelTitle || o.channelId || 'Canal',
            subscribers: fmtNum(o.subscriberCount),
            channelAvatar: o.channelAvatar || null,
            subscribersDelta: perf.totals?.subscribersGained ? `+${fmtNum(perf.totals.subscribersGained)}` : '+0',
            videosCount: fmtNum(o.videoCount),
            views: fmtNum(perf.totals?.views),
            viewsDelta: '—',
            watchTime: perf.totals?.estimatedMinutesWatched ? `${Math.round((perf.totals.estimatedMinutesWatched||0)/60).toLocaleString()} horas` : '—',
            watchTimeDelta: '—',
            likes: '—',
            likesDelta: '—',
            subsGain: fmtNum(perf.totals?.subscribersGained || 0),
            subsLost: fmtNum(perf.totals?.subscribersLost || 0),
          });
        }
      } catch (e:any) {
        console.error('load metrics', e);
        setError(e?.data?.error || e?.message || 'Error al cargar métricas');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, initialized, token]);

  return (
    <div>
      <div className="ch-calendar-header">
        <div>
          <h3>Métricas del Canal</h3>
          <div className="ch-small">Panel completo de análisis y rendimiento</div>
        </div>
        <div>
          <button className="ch-secondary" onClick={async ()=>{
            if (!projectId || !token) return;
            setLoading(true); setError(null);
            try {
              const items = await getJson(`/api/analytics/metrics/${projectId}?platform=youtube`, token);
              const mapped = (items || []).map((it:any) => ({ account: it.accountId || it.accountId, metric: it }));
              setResults(mapped);
              const first = mapped.length > 0 ? mapped[mapped.length - 1].metric : null;
              if (first && first.metrics) {
                const m = first.metrics || {};
                const o = m.overview || {};
                const perf = m.performance || {};
                setSummary({
                  channelName: o.channelTitle || o.channelId || 'Canal',
                  subscribers: fmtNum(o.subscriberCount),
                  subscribersDelta: perf.totals?.subscribersGained ? `+${fmtNum(perf.totals.subscribersGained)}` : '+0',
                  videosCount: fmtNum(o.videoCount),
                  views: fmtNum(perf.totals?.views),
                  viewsDelta: '—',
                  watchTime: perf.totals?.estimatedMinutesWatched ? `${Math.round((perf.totals.estimatedMinutesWatched||0)/60).toLocaleString()} horas` : '—',
                  watchTimeDelta: '—',
                  likes: '—',
                  likesDelta: '—',
                  subsGain: fmtNum(perf.totals?.subscribersGained || 0),
                  subsLost: fmtNum(perf.totals?.subscribersLost || 0),
                });
              }
            } catch (e:any) { setError(e?.data?.error || e?.message || 'Error al refrescar'); }
            setLoading(false);
          }}>🔄 Actualizar Datos</button>
        </div>
      </div>

      <div className="metrics-card">
        <div className="metrics-banner" />
        <div className="metrics-body">
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            {summary.channelAvatar ? (
              <img src={summary.channelAvatar} alt="avatar" style={{width:48,height:48,borderRadius:24,objectFit:'cover'}} />
            ) : (
              <div className="metrics-avatar">CS</div>
            )}
            <div>
              <div style={{fontWeight:700,fontSize:18}}>{summary.channelName}</div>
              <div className="muted">Suscriptores</div>
              <div style={{fontSize:22,fontWeight:700,marginTop:6}}>{summary.subscribers}</div>
              <div style={{color:'#10b981',fontSize:13,marginTop:6}}>{summary.subscribersDelta} este mes</div>
            </div>
          </div>

          <div style={{marginLeft:'auto',display:'flex',gap:24,alignItems:'center'}}>
            <div style={{textAlign:'right'}}>
              <div className="muted">Total de Videos</div>
              <div style={{fontWeight:700,fontSize:18}}>{summary.videosCount}</div>
              <div className="muted">Publicados</div>
            </div>

            <div style={{textAlign:'right'}}>
              <div className="platform-pill">YouTube</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{height:12}} />

      <div className="metrics-tabs">
        <button className={metricTab==='rendimiento'?'active':''} onClick={()=>setMetricTab('rendimiento')}>Rendimiento</button>
        <button className={metricTab==='audiencia'?'active':''} onClick={()=>setMetricTab('audiencia')}>Audiencia</button>
        <button className={metricTab==='porvideo'?'active':''} onClick={()=>setMetricTab('porvideo')}>Por Video</button>
      </div>

      <div style={{height:12}} />

      {metricTab === 'rendimiento' && (
        <div className="ch-box">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div>
              <div style={{fontWeight:700}}>Métricas de Rendimiento</div>
              <div className="muted">Estadísticas generales del canal</div>
            </div>
            <div>
              <button className="ch-btn ch-btn-secondary">Detalles Específicos</button>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>
            <div className="metric-card">
              <div className="muted">Vistas</div>
              <div className="metric-value">{summary.views}</div>
              <div style={{color:'#10b981',fontSize:13}}>↗ {summary.viewsDelta} vs. mes anterior</div>
            </div>

            <div className="metric-card">
              <div className="muted">Tiempo de Reproducción</div>
              <div className="metric-value">{summary.watchTime}</div>
              <div style={{color:'#10b981',fontSize:13}}>↗ {summary.watchTimeDelta} vs. mes anterior</div>
            </div>

            <div className="metric-card">
              <div className="muted">Likes</div>
              <div className="metric-value">{summary.likes}</div>
              <div style={{color:'#10b981',fontSize:13}}>↗ {summary.likesDelta} vs. mes anterior</div>
            </div>

            <div className="metric-card">
              <div className="muted">Suscripciones Ganadas</div>
              <div className="metric-value" style={{color:'#10b981'}}>{summary.subsGain}</div>
              <div style={{color:'#10b981',fontSize:13}}>↗ Excelente crecimiento</div>
            </div>

            <div className="metric-card">
              <div className="muted">Suscripciones Perdidas</div>
              <div className="metric-value" style={{color:'#dc2626'}}>{summary.subsLost}</div>
              <div className="muted">Tasa de retención: 92.5%</div>
            </div>
          </div>
        </div>
      )}
      {metricTab === 'audiencia' && (
        <div>
          {loading && <div className="muted">Cargando audiencia...</div>}
          {error && <div className="muted" style={{color:'#dc2626'}}>{error}</div>}
          {!loading && !error && <AudienceMetrics
            byCountry={results[0]?.metric?.metrics?.audience?.byCountry}
            byAgeGender={results[0]?.metric?.metrics?.audience?.byAgeGender}
            devices={results[0]?.metric?.metrics?.audience?.devices}
            activitySeries={results[0]?.metric?.metrics?.audience?.activitySeries}
          />}
        </div>
      )}

      {metricTab === 'porvideo' && (
        <div>
          {loading && <div className="muted">Cargando métricas por video...</div>}
          {error && <div className="muted" style={{color:'#dc2626'}}>{error}</div>}
          {!loading && !error && <VideoMetrics
            performanceSeries={results[0]?.metric?.metrics?.performance?.series}
            perVideo={results[0]?.metric?.metrics?.perVideo}
          />}
        </div>
      )}
    </div>
  )
}
