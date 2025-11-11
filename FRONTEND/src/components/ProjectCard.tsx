import React from 'react'
import './ProjectCard.css'

type Project = {
  id: string;
  title: string;
  status: string;
  description?: string;
  due?: string;
  members?: string[];
}

export default function ProjectCard({ project }: { project: Project }){
  return (
    <div className="ch-project-card">
      <div className="ch-project-header">
        <div className="ch-project-title">{project.title}</div>
        <div className={`ch-badge ch-badge-${project.status.toLowerCase().replace(/\s+/g,'-')}`}>{project.status}</div>
      </div>
      <div className="ch-project-desc">{project.description}</div>
      <div className="ch-project-meta">
        {project.due && <div className="ch-due">Vence: {project.due}</div>}
        <div className="ch-members">
          {project.members?.slice(0,3).map((m,i) => (<span key={i} className="ch-member">{m}</span>))}
          {project.members && project.members.length > 3 && <span className="ch-more">+{project.members.length - 3}</span>}
        </div>
      </div>
    </div>
  )
}
