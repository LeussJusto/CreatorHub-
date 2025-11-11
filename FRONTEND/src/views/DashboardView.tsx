import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import MetricCard from '../components/MetricCard';
import ProjectCard from '../components/ProjectCard';
import IntegrationNotice from '../components/IntegrationNotice';
import './Dashboard.css';
import { fetchYoutubeMetrics } from '../services/integrations';
import YouTubeMetricsCard from '../components/YouTubeMetricsCard';

export default function DashboardView(){
  const { user, logout, token } = useAuth();
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [youtubeResults, setYoutubeResults] = useState<any[] | null>(null);

  const metrics = [
    { platform: 'Instagram', value: '45.2K', delta: '+1,200 seguidores este mes', icon: '📷' },
    { platform: 'TikTok', value: '128.5K', delta: '+5,300 seguidores este mes', icon: '🎵' },
    { platform: 'YouTube', value: '23.8K', delta: '+800 suscriptores este mes', icon: '▶️' },
  ];

  const projects = [
    { id: 'p1', title: 'YouTube - Serie Tutoriales', status: 'Terminado', description: 'Videos educativos sobre edición', due: '19 oct 2025', members: ['M1','M2','M3','M4'] },
    { id: 'p2', title: 'Campaña TikTok Diciembre', status: 'En Proceso', description: 'Contenido navideño para aumentar engagement', due: '24 oct 2025', members: ['M1','M2','M3'] },
    { id: 'p3', title: 'Instagram Stories Semanales', status: 'No Iniciado', description: 'Planificación de stories diarios', due: '29 nov 2025', members: ['M1','M2'] },
  ];

  return (
    <div className="ch-dashboard-root">
      <Header />

      <main className="ch-dashboard-main">
        <section className="ch-metrics">
          {metrics.map((m) => (
            <MetricCard key={m.platform} platform={m.platform} value={m.value} delta={m.delta} icon={m.icon} />
          ))}
        </section>

        <section style={{marginTop:8}}>
          <IntegrationNotice
            platform="YouTube"
            title="Conectar API de YouTube"
            description="Para obtener métricas en tiempo real de YouTube, conecta la API oficial: YouTube Data API"
            ctaText="Conectar API de YouTube"
          />
          <div style={{marginTop:12}}>
            <button className="ch-cta" disabled={loadingFetch} onClick={async () => {
              try {
                if (!token) return alert('Debes iniciar sesión para probar las métricas');
                setLoadingFetch(true);
                // Use a placeholder valid ObjectId to satisfy backend validation for testing
                const fakeProjectId = '000000000000000000000000';
                const resp = await fetchYoutubeMetrics(token, fakeProjectId);
                const list = resp?.results || [];
                setYoutubeResults(list);
              } catch (err: any) {
                console.error('fetchYoutubeMetrics error', err);
                alert('Error al obtener métricas: ' + (err?.message || err));
              } finally {
                setLoadingFetch(false);
              }
            }}>{loadingFetch ? 'Obteniendo métricas…' : 'Métricas YouTube'}</button>
          </div>
          {youtubeResults && <YouTubeMetricsCard results={youtubeResults} token={token ?? undefined} />}
        </section>

        <section className="ch-projects">
          <div className="ch-projects-header">
            <div>
              <h3>Mis Proyectos</h3>
              <div className="ch-sub">Gestiona y colabora en tus proyectos de contenido</div>
            </div>
            <div>
              <button className="ch-new-btn">+ Nuevo Proyecto</button>
            </div>
          </div>

          <div className="ch-projects-grid">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
