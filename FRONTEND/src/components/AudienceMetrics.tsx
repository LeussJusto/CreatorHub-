import React from 'react'
import { Bar, Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

export default function AudienceMetrics(){
  // Mock data matching the screenshots
  const countries = {
    labels: ['México','España','Argentina','Colombia','Perú','Otros'],
    datasets: [{
      label: 'Audiencia',
      data: [35, 20, 18, 12, 8, 5],
      backgroundColor: ['#7c3aed','#ef476f','#2196f3','#10b981','#ffb020','#ef4444'],
      borderRadius: 6,
      barThickness: 18,
    }]
  }

  const gender = {
    labels: ['Hombres','Mujeres','Otros'],
    datasets: [{
      data: [40, 58, 2],
      backgroundColor: ['#3b82f6','#ec4899','#a78bfa'],
    }]
  }

  const devices = {
    labels: ['Móvil','Escritorio','Tablet'],
    datasets: [{ data:[68,24,8], backgroundColor:['#7c3aed','#fb7185','#60a5fa'] }]
  }

  const activity = {
    labels: ['00:00','03:00','06:00','09:00','12:00','15:00','18:00','21:00'],
    datasets:[{ label: 'Actividad', data:[10,6,14,45,68,72,98,90], backgroundColor:'#a78bfa', barThickness:18, borderRadius:6 }]
  }

  const barOptions = { indexAxis: 'y' as const, responsive:true, plugins:{ legend:{ display:false } }, scales:{ x:{ grid:{ display:false } }, y:{ grid:{ display:false } } } }
  const smallPieOptions = { responsive:true, plugins:{ legend:{ position:'right' as const, labels:{ boxWidth:12 } } } }

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <div>
        <div className="ch-box" style={{marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div>
              <div style={{fontWeight:700}}>Datos de Audiencia</div>
              <div className="muted">Información demográfica y comportamiento</div>
            </div>
            <div><button className="ch-btn ch-btn-secondary">Detalles Específicos</button></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="chart-card">
              <div style={{fontWeight:700,marginBottom:8}}>País</div>
              <Bar data={countries} options={barOptions} />
            </div>

            <div>
              <div className="chart-card" style={{marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontWeight:700}}>Edad y Género</div>
                </div>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <div style={{width:160}}>
                    <Pie data={gender} options={smallPieOptions} />
                  </div>
                  <div style={{flex:1}}>
                    <div style={{marginBottom:6}}>Por Edad</div>
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {[{label:'13-17 años',v:8},{label:'18-24 años',v:35},{label:'25-34 años',v:40},{label:'35-44 años',v:12},{label:'45+ años',v:5}].map((r,i)=> (
                        <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <div className="muted">{r.label}</div>
                          <div style={{width:160,background:'#f3f4f6',height:10,borderRadius:8,overflow:'hidden'}}>
                            <div style={{width:`${r.v}%`,height:'100%',background:'#7c3aed'}} />
                          </div>
                          <div style={{width:36,textAlign:'right'}}>{r.v}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr',gap:12}}>
                <div className="ch-box">
                  <div style={{fontWeight:700,marginBottom:8}}>Dispositivos</div>
                  <div style={{display:'flex',gap:12,alignItems:'center'}}>
                    <div style={{width:160}}><Pie data={devices} options={smallPieOptions} /></div>
                    <div style={{flex:1,display:'flex',gap:12}}>
                      <div className="device-card"><div style={{fontWeight:700}}>Móvil</div><div className="muted">68%</div></div>
                      <div className="device-card"><div style={{fontWeight:700}}>Escritorio</div><div className="muted">24%</div></div>
                      <div className="device-card"><div style={{fontWeight:700}}>Tablet</div><div className="muted">8%</div></div>
                    </div>
                  </div>
                </div>

                <div className="ch-box">
                  <div style={{fontWeight:700,marginBottom:8}}>Horario de Mayor Actividad</div>
                  <Bar data={activity} options={{ responsive:true, plugins:{ legend:{ display:false } }, scales:{ x:{ grid:{ display:false } } } }} />
                  <div style={{marginTop:10,background:'#f3efff',padding:10,borderRadius:8,color:'#6b21a8'}}>Mejor horario: Entre 18:00 - 21:00 hrs (95% de actividad)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
