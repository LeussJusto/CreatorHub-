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

  const fmt = (v: any) => (v == null ? '—' : (typeof v === 'number' ? v.toLocaleString() : v));

  const peakDayFromSeries = (series: any[] = []) => {
    if (!series || series.length === 0) return null;
    let max = -Infinity; let maxRow = null;
    for (const r of series) {
      const val = Number(r.views || r['views'] || 0);
      if (val > max) { max = val; maxRow = r; }
    }
    return maxRow ? `${maxRow.date} (${Number(max).toLocaleString()} views)` : null;
  }

  return (
    <div style={{display:'flex',gap:12,flexDirection:'column',marginTop:12}}>
      {results.map((r, i) => {
        const metricDoc = r.metric;
        const m = metricDoc?.metrics || {};
        const overview = m.overview || {};
        const perf = m.performance || {};
        const audience = m.audience || {};
        const perVideo = m.perVideo || [];

        return (
          <div key={i} style={{border:'1px solid #ddd',padding:12,borderRadius:8,background:'#fff'}}>
            <div style={{display:'flex',gap:12,alignItems:'center'}}>
              {overview.channelAvatar ? <img src={overview.channelAvatar} alt="avatar" style={{width:48,height:48,borderRadius:24}} /> : <div style={{width:48,height:48,borderRadius:24,background:'#eee'}} />}
              <div>
                <div style={{fontWeight:700}}>{overview.channelTitle || overview.channelId || r.account}</div>
                <div style={{fontSize:12,color:'#666'}}>Canal ID: {overview.channelId || '—'}</div>
              </div>
            </div>

            <div style={{display:'flex',gap:16,marginTop:12,flexWrap:'wrap'}}>
              <div style={{minWidth:160}}>
                <div style={{fontSize:12,color:'#444'}}>Suscriptores</div>
                <div style={{fontWeight:700}}>{fmt(overview.subscriberCount)}</div>
              </div>
              <div style={{minWidth:160}}>
                <div style={{fontSize:12,color:'#444'}}>Total videos</div>
                <div style={{fontWeight:700}}>{fmt(overview.videoCount)}</div>
              </div>
              <div style={{minWidth:160}}>
                <div style={{fontSize:12,color:'#444'}}>Vistas (30d)</div>
                <div style={{fontWeight:700}}>{fmt(perf.totals?.views)}</div>
              </div>
              <div style={{minWidth:160}}>
                <div style={{fontSize:12,color:'#444'}}>Tiempo reproducción (min)</div>
                <div style={{fontWeight:700}}>{fmt(perf.totals?.estimatedMinutesWatched)}</div>
              </div>
              <div style={{minWidth:160}}>
                <div style={{fontSize:12,color:'#444'}}>Avg view duration (s)</div>
                <div style={{fontWeight:700}}>{fmt(perf.series && perf.series.length>0 ? perf.series.reduce((a:any,b:any)=>a+(b.averageViewDuration||0),0)/perf.series.length : perf.totals?.averageViewDuration ?? '—')}</div>
              </div>
              <div style={{minWidth:160}}>
                <div style={{fontSize:12,color:'#444'}}>Suscriptores netos (30d)</div>
                <div style={{fontWeight:700}}>{fmt((perf.totals?.subscribersGained || 0) - (perf.totals?.subscribersLost || 0))}</div>
              </div>
            </div>

            <div style={{marginTop:12}}>
              <div style={{fontWeight:600}}>Audiencia</div>
              <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:6}}>
                <div style={{minWidth:200}}>
                  <div style={{fontSize:12,color:'#444'}}>Por país (top)</div>
                  <ul style={{marginTop:6}}>
                    {(audience.byCountry || []).slice(0,8).map((c:any, idx:number) => (
                      <li key={idx}>{c.country}: {fmt(c.views)}</li>
                    ))}
                    {(!audience.byCountry || audience.byCountry.length===0) && <li>—</li>}
                  </ul>
                </div>
                <div style={{minWidth:200}}>
                  <div style={{fontSize:12,color:'#444'}}>Por edad / género</div>
                  <ul style={{marginTop:6}}>
                    {(audience.byAgeGender || []).slice(0,10).map((ag:any, idx:number) => (
                      <li key={idx}>{ag.ageGroup} / {ag.gender}: {fmt(ag.views)}</li>
                    ))}
                    {(!audience.byAgeGender || audience.byAgeGender.length===0) && <li>—</li>}
                  </ul>
                </div>
                <div style={{minWidth:200}}>
                  <div style={{fontSize:12,color:'#444'}}>Pico de actividad (mayor día)</div>
                  <div style={{marginTop:6}}>{peakDayFromSeries(perf.series) || '—'}</div>
                </div>
              </div>
            </div>

            <div style={{marginTop:12}}>
              <div style={{fontWeight:600}}>Métricas por video (simplificado)</div>
              <div style={{marginTop:8}}>
                {(perVideo || []).map((pv:any, idx:number) => {
                  const total = (pv.series || []).reduce((s:any,row:any)=>s + (Number(row.views||0)),0);
                  return (
                    <div key={idx} style={{padding:8,border:'1px solid #f0f0f0',borderRadius:6,marginBottom:8}}>
                      <div style={{fontWeight:600}}>{pv.title || pv.videoId}</div>
                      <div style={{fontSize:12,color:'#555'}}>Total views (range): {fmt(total)}</div>
                      <div style={{fontSize:12,color:'#333',marginTop:6}}>Series (last {pv.series?.length ?? 0} days):</div>
                      <div style={{fontSize:12,marginTop:4}}>
                        {pv.series && pv.series.length>0 ? pv.series.slice(-7).map((s:any,i:number)=> <span key={i} style={{marginRight:6}}>{s.date}:{s.views}</span>) : '—'}
                      </div>
                    </div>
                  )
                })}
                {(!perVideo || perVideo.length===0) && <div style={{color:'#666'}}>No hay datos por video</div>}
              </div>
            </div>

            <div style={{marginTop:10}}>
              <small style={{color:'#666'}}>Capturado: {metricDoc?.capturedAt ? new Date(metricDoc.capturedAt).toLocaleString() : '—'}</small>
            </div>
          </div>
        )
      })}
    </div>
  )
}
