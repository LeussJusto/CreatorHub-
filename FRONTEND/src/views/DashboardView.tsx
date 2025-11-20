import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import MetricCard from '../components/MetricCard';
import ProjectCard from '../components/ProjectCard';
import IntegrationNotice from '../components/IntegrationNotice';
import IntegrationMetricsCard from '../components/IntegrationMetricsCard';
import './Dashboard.css';
import CreateProjectModal from '../components/CreateProjectModal';
import { getJson, postJson } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function DashboardView(){
  const { user, logout, token } = useAuth();
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [youtubeResults, setYoutubeResults] = useState<any[] | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [projects, setProjects] = useState<any[] | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all'|'not_started'|'in_progress'|'completed'>('all');
  const navigate = useNavigate();

  const getYoutubeSummary = () => {
    if (!youtubeResults || youtubeResults.length === 0) return null;
    // youtubeResults: [{ account, metric }]
    // pick first account for summary
    const first = youtubeResults[0].metric;
    const subs = first?.metrics?.overview?.subscriberCount ?? null;
    const views = first?.metrics?.performance?.totals?.views ?? null;
    return { platform: 'YouTube', value: subs != null ? `${Number(subs).toLocaleString()}` : '—', delta: views != null ? `+${Number(views).toLocaleString()} visualizaciones (30d)` : '', icon: '▶️' };
  };

  // Twich integration removed from frontend — placeholder shown in UI

  // Twich integration removed — no follower discovery in this view

  // projects will be fetched from backend

  React.useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await getJson('/api/projects/mine', token ?? undefined);
        const list = (data || []);
        // sort so 'in_progress' projects appear first
        list.sort((a:any,b:any)=>{
          const rank = (s:any) => s === 'in_progress' ? 0 : (s === 'not_started' ? 1 : 2);
          return rank(a.status) - rank(b.status);
        });
        setProjects(list);
        if (list.length > 0) {
          // prefer selecting the first in_progress project
          const firstInProgress = list.find((p:any)=>p.status === 'in_progress');
          setSelectedProject((firstInProgress || list[0])._id);
        }
      } catch (err) {
        console.error('fetch projects', err);
        setProjects([]);
      }
    };

    loadProjects();

    const onProjectsUpdated = () => {
      loadProjects();
    };
    window.addEventListener('projects:updated', onProjectsUpdated as EventListener);
    return () => { window.removeEventListener('projects:updated', onProjectsUpdated as EventListener); };
  }, [token]);

  // fetch metrics when a project is selected
  React.useEffect(() => {
    const loadMetrics = async () => {
      if (!selectedProject) return setYoutubeResults(null);
      try {
        const proj = (projects || []).find(p => p._id === selectedProject) as any | undefined;
        const platforms = proj?.platforms || [];
        // If the project includes YouTube, fetch youtube metrics; otherwise clear
        if (platforms.includes('youtube')) {
          // Try to GET stored metrics first
          const data = await getJson(`/api/analytics/metrics/${selectedProject}?platform=youtube`, token ?? undefined);
          if (data && Array.isArray(data) && data.length > 0) {
            const list = (data || []).map((m:any) => ({ account: m.accountId, metric: m }));
            setYoutubeResults(list);
          } else {
            // No stored metrics — force a fetch from integrations and use the returned payload directly
            try {
              const fetched = await postJson('/api/analytics/fetch', { project: selectedProject }, token ?? undefined);
              const results = (fetched.results || []).map((r:any) => ({ account: r.account, metric: r.metric, error: r.error }));
              setYoutubeResults(results);
            } catch (fe) {
              console.error('forced fetch error', fe);
              setYoutubeResults([]);
            }
          }
        } else {
          setYoutubeResults(null);
        }
      } catch (err) {
        console.error('fetch metrics', err);
        setYoutubeResults([]);
      }
    };
    loadMetrics();
  }, [selectedProject, token]);

  return (
    <div className="ch-dashboard-root">
      <Header />

      <main className="ch-dashboard-main">
        <section className="ch-metrics">
          <MetricCard key="Twich" platform="Twich" value="—" delta="Conecta tu cuenta para ver métricas" icon="🎵" />
          {/* youtube summary shown to the right (outside project) */}
          {(() => {
            const y = getYoutubeSummary();
            const toShow = y ?? { platform: 'YouTube', value: '—', delta: 'Conecta tu cuenta para ver métricas', icon: '▶️' };
            return <MetricCard key={toShow.platform} platform={toShow.platform} value={toShow.value} delta={toShow.delta} icon={toShow.icon} />;
          })()}
          {/* Instagram placeholder card next to Twich and YouTube */}
          <MetricCard key="Instagram" platform="Instagram" value="—" delta="Conecta tu cuenta para ver métricas" icon="📸" />
        </section>

        <section style={{marginTop:8}}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <IntegrationNotice
              platform="YouTube"
              title="Conectar API de YouTube"
              description="Para obtener métricas en tiempo real de YouTube, conecta la API oficial: YouTube Data API"
              ctaText="Conectar API de YouTube"
            />

            <IntegrationNotice
              platform="Twich"
              title="Conectar API de Twich"
              description="Conecta Twich para sincronizar métricas de video y seguidores (próximamente)."
              ctaText="Conectar API de Twich"
            />

            <IntegrationNotice
              platform="Instagram"
              title="Conectar API de Instagram"
              description="Conecta Instagram para obtener métricas de perfil y publicaciones (Business/Creator)."
              ctaText="Conectar API de Instagram"
            />
          </div>
          {/* Removed project selector per request: no filter between integration and projects list */}
        </section>

        {/* Integration metrics card: shows connection status, basic profile and recent media */}
        <section>
          <IntegrationMetricsCard />
        </section>

        <section className="ch-projects">
          <div className="ch-projects-header">
            <div>
              <h3>Mis Proyectos</h3>
              <div className="ch-sub">Gestiona y colabora en tus proyectos de contenido</div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <select value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value as any)}>
                <option value="all">Todos</option>
                <option value="not_started">No Iniciado</option>
                <option value="in_progress">En Proceso</option>
                <option value="completed">Terminado</option>
              </select>
              <button className="ch-new-btn" onClick={()=>setShowCreate(true)}>+ Nuevo Proyecto</button>
            </div>
          </div>

          <div className="ch-projects-grid">
            {((projects || [])
              // apply filter
              .filter(p => filterStatus === 'all' ? true : p.status === filterStatus)
            ).map(p => {
              const mapped = {
                id: p._id,
                title: p.name,
                status: p.status === 'in_progress' ? 'En Proceso' : (p.status === 'completed' ? 'Terminado' : 'No Iniciado'),
                description: p.description,
                due: p.dueDate ? new Date(p.dueDate).toLocaleDateString() : undefined,
                members: (p.members || []).map((m:any,i:number) => `M${i+1}`),
              };
              return <ProjectCard key={mapped.id} project={mapped} onClick={() => navigate(`/projects/${mapped.id}`)} />
            })}
          </div>
        </section>
      </main>
      {showCreate && <CreateProjectModal token={token ?? undefined} onClose={()=>setShowCreate(false)} onCreated={(p:any)=>{
        // Insert newly created project into local list so it appears without reload
        try {
          const normalized = { _id: p._id || p.id, name: p.name, description: p.description, status: p.status, dueDate: p.dueDate, members: p.members || [] };
          setProjects(prev => {
            const arr = (prev || []).slice();
            arr.unshift(normalized);
            // keep in_progress projects first
            arr.sort((a:any,b:any)=>{
              const rank = (s:any) => s === 'in_progress' ? 0 : (s === 'not_started' ? 1 : 2);
              return rank(a.status) - rank(b.status);
            });
            return arr;
          });
          setSelectedProject(normalized._id);
        } catch (e) {
          console.error('onCreated handler error', e);
        }
      }} />}
    </div>
  )
}

