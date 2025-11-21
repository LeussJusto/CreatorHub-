import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import ProjectCard from '../components/ProjectCard';
import PlatformSection from '../components/PlatformSection';
import './Dashboard.css';
import CreateProjectModal from '../components/CreateProjectModal';
import { getJson } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function DashboardView(){
  const { token } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [projects, setProjects] = useState<any[] | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all'|'not_started'|'in_progress'|'completed'>('all');
  const navigate = useNavigate();

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

  return (
    <div className="ch-dashboard-root">
      <Header />

      <main className="ch-dashboard-main">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Redes Sociales</h1>
            <p className="dashboard-subtitle">Conecta tus plataformas y visualiza todas tus estadísticas en un solo lugar</p>
          </div>
        </div>

        <section className="platforms-section">
          <PlatformSection
            platform="youtube"
            title="YouTube"
            icon="▶️"
            description="Conecta tu canal de YouTube para ver suscriptores, visualizaciones y métricas de videos"
          />
          
          <PlatformSection
            platform="instagram"
            title="Instagram"
            icon="📸"
            description="Conecta tu cuenta de Instagram Business/Creator para ver seguidores, alcance y engagement"
          />
          
          <PlatformSection
            platform="facebook"
            title="Facebook"
            icon="👥"
            description="Conecta tu perfil y páginas de Facebook para ver métricas de publicaciones y engagement"
          />
          
          <PlatformSection
            platform="tiktok"
            title="TikTok"
            icon="🎵"
            description="Conecta tu cuenta de TikTok para ver seguidores, likes y métricas de videos"
          />
          
          <PlatformSection
            platform="twitch"
            title="Twitch"
            icon="🎮"
            description="Conecta tu canal de Twitch para ver seguidores y métricas de streaming"
          />
        </section>

        <section className="ch-projects">
          <div className="ch-projects-header">
            <div>
              <h3>Mis Proyectos</h3>
              <div className="ch-sub">Gestiona y colabora en tus proyectos de contenido</div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <select value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value as any)} className="filter-select">
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
        try {
          const normalized = { _id: p._id || p.id, name: p.name, description: p.description, status: p.status, dueDate: p.dueDate, members: p.members || [] };
          setProjects(prev => {
            const arr = (prev || []).slice();
            arr.unshift(normalized);
            arr.sort((a:any,b:any)=>{
              const rank = (s:any) => s === 'in_progress' ? 0 : (s === 'not_started' ? 1 : 2);
              return rank(a.status) - rank(b.status);
            });
            return arr;
          });
        } catch (e) {
          console.error('onCreated handler error', e);
        }
      }} />}
    </div>
  )
}

