import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider, RequireAuth } from './context/AuthContext'
import DashboardView from './views/DashboardView'
import IntegrationSuccessView from './views/IntegrationSuccessView'
import ProjectView from './views/ProjectView'
import ProfileView from './views/ProfileView'
import PlatformStatsView from './views/PlatformStatsView'

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/dashboard" element={<RequireAuth><DashboardView /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><ProfileView /></RequireAuth>} />
          <Route path="/integrations/success" element={<IntegrationSuccessView />} />
          <Route path="/projects/:projectId" element={<RequireAuth><ProjectView /></RequireAuth>} />
          <Route path="/platforms/:platform/stats" element={<RequireAuth><PlatformStatsView /></RequireAuth>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
