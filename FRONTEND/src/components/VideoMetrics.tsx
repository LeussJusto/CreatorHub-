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

const dailyData = {
  labels: ['1 Nov','2 Nov','3 Nov','4 Nov','5 Nov','6 Nov','7 Nov','8 Nov','9 Nov','10 Nov','11 Nov','12 Nov','13 Nov','14 Nov'],
  datasets: [{
    label: 'Vistas Diarias',
    data: [14000,16000,19000,14500,16000,22000,23500,18500,16500,20000,22000,25000,29000,27000],
    fill: true,
    backgroundColor: 'rgba(167,139,250,0.35)',
    borderColor: 'rgba(167,139,250,1)',
    tension: 0.3,
    pointRadius: 0,
  }]
}

const chartOptions = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: true, color: 'rgba(0,0,0,0.05)' } },
    y: { grid: { display: true, color: 'rgba(0,0,0,0.05)' }, beginAtZero: true }
  }
}

const sampleVideos = [
  { id:'v1', title: 'Tutorial de Edición Avanzada', date:'10 Nov 2024', views:'45.6K', likes:'3.4K', comments:289, watchTime:'2,340 horas', duration:'4:23' },
  { id:'v2', title: 'Tips para Creadores de Contenido', date:'8 Nov 2024', views:'38.9K', likes:'2.9K', comments:234, watchTime:'1,890 horas', duration:'3:45' },
  { id:'v3', title: 'Mejores Prácticas en Redes Sociales', date:'5 Nov 2024', views:'52.3K', likes:'4.1K', comments:412, watchTime:'3,120 horas', duration:'5:12' },
]

export default function VideoMetrics(){
  return (
    <div>
      <div className="ch-box" style={{marginBottom:12}}>
        <div style={{fontWeight:700,marginBottom:6}}>Vistas Diarias</div>
        <div className="muted">Rendimiento de visualizaciones en los últimos 14 días</div>
        <div style={{height:280,marginTop:12}}>
          <Line data={dailyData} options={chartOptions} />
        </div>
      </div>

      <div style={{height:12}} />

      <div style={{fontWeight:700,marginBottom:8}}>Rendimiento por Video</div>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {sampleVideos.map(v => (
          <div key={v.id} className="video-list-card">
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
        ))}
      </div>
    </div>
  )
}
