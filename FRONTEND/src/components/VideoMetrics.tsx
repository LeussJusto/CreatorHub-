import React from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const buildDailyData = (series?: any[]) => {
  if (series && series.length>0) {
    return {
      labels: series.map((r:any)=>r.date),
      datasets: [{ label: 'Vistas Diarias', data: series.map((r:any)=>r.views || 0), fill:true, backgroundColor:'rgba(167,139,250,0.35)', borderColor:'rgba(167,139,250,1)', tension:0.3, pointRadius:0 }]
    }
  }
  // fallback: show last 14 days with zero values (no invented sample metrics)
  const days = 14;
  const labels = Array.from({length:days}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    return `${d.getDate().toString().padStart(2,'0')} ${d.toLocaleString('default',{month:'short'})}`;
  });
  return {
    labels,
    datasets: [{ label: 'Vistas Diarias', data: Array(days).fill(0), fill: true, backgroundColor: 'rgba(167,139,250,0.15)', borderColor: 'rgba(167,139,250,0.6)', tension: 0.3, pointRadius:0 }]
  }
}

const chartOptions = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: true, color: 'rgba(0,0,0,0.05)' } },
    y: { grid: { display: true, color: 'rgba(0,0,0,0.05)' }, beginAtZero: true }
  }
}

// No sample videos: show empty list when no perVideo data available

export default function VideoMetrics({ performanceSeries, perVideo }: { performanceSeries?: any[], perVideo?: any[] }): JSX.Element {
  const daily = buildDailyData(performanceSeries);
  const videos = (perVideo && perVideo.length>0) ? perVideo.map((pv:any)=> ({ id: pv.videoId, title: pv.title, date: '', views: (pv.series||[]).reduce((s:any,row:any)=>s + (Number(row.views||0)),0), likes:'—', comments:0, watchTime:'—', duration:'—', series: pv.series })) : [];

  return (
    <div>
      <div className="ch-box" style={{marginBottom:12}}>
        <div style={{fontWeight:700,marginBottom:6}}>Vistas Diarias</div>
        <div className="muted">Rendimiento de visualizaciones en los últimos días</div>
        <div style={{height:280,marginTop:12}}>
          {performanceSeries && performanceSeries.length>0 ? <Line data={daily} options={chartOptions} /> : <div className="muted">No hay datos de series de rendimiento</div>}
        </div>
      </div>

      <div style={{height:12}} />

      <div style={{fontWeight:700,marginBottom:8}}>Rendimiento por Video</div>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {videos && videos.length>0 ? videos.map((v:any) => (
          <div key={v.id || v.title} className="video-list-card">
            <div style={{display:'flex',gap:12,alignItems:'center'}}>
              <div className="video-thumb" />
              <div style={{flex:1}}>
                <div style={{fontWeight:700}}>{v.title}</div>
                <div className="muted">{v.date}</div>
              </div>

              <div style={{display:'flex',gap:24,alignItems:'center'}}>
                <div style={{textAlign:'center'}}>
                  <div className="muted">Vistas</div>
                  <div style={{fontWeight:700}}>{v.views}</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div className="muted">Likes</div>
                  <div style={{fontWeight:700}}>{v.likes}</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div className="muted">Comentarios</div>
                  <div style={{fontWeight:700}}>{v.comments}</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div className="muted">Tiempo de Reproducción</div>
                  <div style={{fontWeight:700}}>{v.watchTime}</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div className="muted">Duración Promedio</div>
                  <div style={{fontWeight:700}}>{v.duration}</div>
                </div>
              </div>
            </div>
          </div>
        )) : <div className="muted">No hay datos por video</div>}
      </div>
    </div>
  )
}
