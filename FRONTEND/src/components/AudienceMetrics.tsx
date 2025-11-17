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

export default function AudienceMetrics({ byCountry, byAgeGender, devices, activitySeries }: { byCountry?: any[], byAgeGender?: any[], devices?: any, activitySeries?: any[] }): JSX.Element {
  // If data provided, map it. Otherwise fallback to mock data.
  const countries = byCountry && byCountry.length > 0 ? {
    labels: byCountry.slice(0,6).map(c=>c.country),
    datasets: [{ label: 'Audiencia', data: byCountry.slice(0,6).map(c=>c.views), backgroundColor: ['#7c3aed','#ef476f','#2196f3','#10b981','#ffb020','#ef4444'], borderRadius: 6, barThickness: 18 }]
  } : {
    labels: ['Sin datos'],
    datasets: [{
      label: 'Audiencia',
      data: [0],
      backgroundColor: ['#7c3aed'],
      borderRadius: 6,
      barThickness: 18,
    }]
  }


  // derive gender pie from byAgeGender if provided
  const gender = byAgeGender && byAgeGender.length > 0 ? (() => {
    const sums:{[k:string]:number} = {};
    for (const r of byAgeGender) { const g = r.gender || 'Otros'; sums[g] = (sums[g]||0) + (Number(r.views||0)); }
    const labels = Object.keys(sums);
    const data = labels.map(l => sums[l]);
    return { labels, datasets: [{ data, backgroundColor: ['#3b82f6','#ec4899','#a78bfa'] }] };
  })() : {
    labels: ['Hombres','Mujeres','Otros'],
    datasets: [{ data: [0, 0, 0], backgroundColor: ['#3b82f6','#ec4899','#a78bfa'] }]
  };

  const devicesData = (devices && Array.isArray(devices) && devices.length>0) ? {
    labels: devices.map((d:any)=>d.label),
    datasets: [{ data: devices.map((d:any)=>d.value), backgroundColor:['#7c3aed','#fb7185','#60a5fa'] }]
  } : {
    labels: ['Móvil','Escritorio','Tablet'],
    datasets: [{ data: [0,0,0], backgroundColor:['#7c3aed','#fb7185','#60a5fa'] }]
  }

  const activity = activitySeries && activitySeries.length>0 ? {
    labels: activitySeries.map((r:any)=>r.label),
    datasets:[{ label: 'Actividad', data: activitySeries.map((r:any)=>r.value), backgroundColor:'#a78bfa', barThickness:18, borderRadius:6 }]
  } : (() => {
    const hours = Array.from({length:24}, (_,i) => `${String(i).padStart(2,'0')}:00`);
    return { labels: hours, datasets:[{ label: 'Actividad', data: Array(hours.length).fill(0), backgroundColor:'#a78bfa', barThickness:18, borderRadius:6 }] };
  })()

  // prepare device cards as JSX elements to avoid complex inline expressions in JSX
  const deviceCards = (() => {
    const vals = (devicesData && devicesData.datasets && devicesData.datasets[0] && devicesData.datasets[0].data) ? devicesData.datasets[0].data as number[] : [0,0,0];
    const labs = (devicesData && devicesData.labels) ? devicesData.labels as string[] : ['Móvil','Escritorio','Tablet'];
    return [0,1,2].map(i => (
      <div key={i} className="device-card">
        <div style={{fontWeight:700}}>{labs[i]||'N/D'}</div>
        <div className="muted">{(vals[i]||0).toString()}%</div>
      </div>
    ));
  })();

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
                      {[{label:'13-17 años',v:0},{label:'18-24 años',v:0},{label:'25-34 años',v:0},{label:'35-44 años',v:0},{label:'45+ años',v:0}].map((r,i)=> (
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
                    <div style={{width:160}}><Pie data={devicesData as any} options={smallPieOptions} /></div>
                    <div style={{flex:1,display:'flex',gap:12}}>{deviceCards}</div>
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
