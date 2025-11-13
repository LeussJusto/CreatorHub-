import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider, RequireAuth } from './context/AuthContext'
import DashboardView from './views/DashboardView'
import IntegrationSuccessView from './views/IntegrationSuccessView'
import ProjectView from './views/ProjectView'

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/dashboard" element={<RequireAuth><DashboardView /></RequireAuth>} />
          <Route path="/integrations/success" element={<IntegrationSuccessView />} />
          <Route path="/projects/:projectId" element={<RequireAuth><ProjectView /></RequireAuth>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
