import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getIntegrationAccounts } from '../services/integrations';
import { getJson } from '../services/api';
import IntegrationNotice from './IntegrationNotice';
import './PlatformSection.css';

interface PlatformSectionProps {
  platform: 'youtube' | 'instagram' | 'facebook' | 'tiktok' | 'twitch';
  title: string;
  icon: string;
  description: string;
}

export default function PlatformSection({ platform, title, icon, description }: PlatformSectionProps) {
  const { token, initialized } = useAuth();
  const navigate = useNavigate();
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!initialized || !token) return;
    
    const loadAccount = async () => {
      try {
        const accounts = await getIntegrationAccounts(token);
        const acc = (accounts || []).find((a: any) => 
          String(a.platform).toLowerCase() === platform.toLowerCase()
        );
        if (acc) {
          setConnected(true);
          setAccount(acc);
          await loadMetrics(acc.id);
          // Auto-expand when connected and metrics are loaded
          setExpanded(true);
        } else {
          setConnected(false);
          setAccount(null);
          setExpanded(false);
        }
      } catch (err) {
        console.error(`Error loading ${platform} account:`, err);
      }
    };

    loadAccount();
  }, [token, initialized, platform]);

  const loadMetrics = async (accountId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getJson(`/api/integrations/accounts/${accountId}/videos`, token);
      setMetrics(data);
    } catch (err) {
      console.error(`Error loading ${platform} metrics:`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    // IntegrationNotice will handle the connection
  };

  const formatNumber = (num: number | null | undefined): string => {
    if (num == null || num === undefined) return '—';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const getPlatformIcon = () => {
    const icons: Record<string, string> = {
      youtube: '▶️',
      instagram: '📸',
      facebook: '👥',
      tiktok: '🎵',
      twitch: '🎮'
    };
    return icons[platform] || icon;
  };

  const getPlatformGradient = () => {
    const gradients: Record<string, string> = {
      youtube: 'linear-gradient(135deg, #FF0000 0%, #CC0000 100%)',
      instagram: 'linear-gradient(135deg, #E4405F 0%, #833AB4 50%, #FCAF45 100%)',
      facebook: 'linear-gradient(135deg, #1877F2 0%, #0D5F9C 100%)',
      tiktok: 'linear-gradient(135deg, #000000 0%, #FF0050 100%)',
      twitch: 'linear-gradient(135deg, #9146FF 0%, #5C3FAE 100%)'
    };
    return gradients[platform] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  };

  return (
    <div className={`platform-section ${connected ? 'connected' : ''} ${expanded ? 'expanded' : ''}`}>
      <div className="platform-header" onClick={() => connected && setExpanded(!expanded)}>
        <div className="platform-info">
          <div className="platform-icon" style={{background: getPlatformGradient()}}>{getPlatformIcon()}</div>
          <div>
            <h3 className="platform-title">{title}</h3>
            <p className="platform-desc">{description}</p>
          </div>
        </div>
        <div className="platform-status">
          {connected ? (
            <>
              <div className="status-badge connected-badge">
                <span className="status-dot"></span>
                Conectado
              </div>
              {connected && (
                <div className="expand-indicator">
                  {expanded ? '▼' : '▶'}
                </div>
              )}
            </>
          ) : (
            <div className="status-badge disconnected-badge">
              <span className="status-dot"></span>
              Desconectado
            </div>
          )}
        </div>
      </div>

      {!connected && (
        <div className="platform-connect">
          <IntegrationNotice
            platform={title}
            title={`Conectar ${title}`}
            description={description}
            ctaText={`Conectar ${title}`}
          />
        </div>
      )}

      {connected && (
        <div className="platform-metrics">
          {loading ? (
            <div className="metrics-loading">Cargando métricas...</div>
          ) : metrics && Object.keys(metrics).length > 0 && (metrics.profile || metrics.videos || metrics.media) ? (
            <div className="metrics-content">
              {platform === 'youtube' && metrics.profile && (
                <div className="metrics-grid">
                  <div className="metric-item">
                    <div className="metric-label">Suscriptores</div>
                    <div className="metric-value">{formatNumber(metrics.profile.subscriber_count || metrics.profile.subscribers || account?.raw?.subscriberCount)}</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">Visualizaciones</div>
                    <div className="metric-value">{formatNumber(metrics.profile.view_count || metrics.profile.views || account?.raw?.viewCount)}</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">Videos</div>
                    <div className="metric-value">{formatNumber(metrics.profile.video_count || metrics.videos?.length || account?.raw?.videoCount)}</div>
                  </div>
                  {account?.displayName && (
                    <div className="metric-item full-width">
                      <div className="metric-label">Canal</div>
                      <div className="metric-value" style={{fontSize: '18px'}}>{account.displayName}</div>
                    </div>
                  )}
                </div>
              )}

              {platform === 'instagram' && metrics.profile && (
                <div className="metrics-grid">
                  <div className="metric-item">
                    <div className="metric-label">Seguidores</div>
                    <div className="metric-value">{formatNumber(metrics.profile.follower_count || metrics.profile.followers)}</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">Publicaciones</div>
                    <div className="metric-value">{formatNumber(metrics.profile.media_count || metrics.media?.length)}</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">Alcance</div>
                    <div className="metric-value">{formatNumber(metrics.profile.reach || metrics.metricsRaw?.reach)}</div>
                  </div>
                  {metrics.profile.username && (
                    <div className="metric-item full-width">
                      <div className="metric-label">Usuario</div>
                      <div className="metric-value" style={{fontSize: '18px'}}>@{metrics.profile.username}</div>
                    </div>
                  )}
                </div>
              )}

              {platform === 'facebook' && metrics.profile && (
                <div className="metrics-grid">
                  <div className="metric-item">
                    <div className="metric-label">Páginas</div>
                    <div className="metric-value">{formatNumber(metrics.pages?.length || 0)}</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">Publicaciones</div>
                    <div className="metric-value">{formatNumber(metrics.videos?.length || 0)}</div>
                  </div>
                </div>
              )}

              {platform === 'tiktok' && metrics.profile && (
                <div className="metrics-grid">
                  <div className="metric-item">
                    <div className="metric-label">Seguidores</div>
                    <div className="metric-value">{formatNumber(metrics.profile.follower_count)}</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">Likes</div>
                    <div className="metric-value">{formatNumber(metrics.profile.likes_count)}</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">Videos</div>
                    <div className="metric-value">{formatNumber(metrics.profile.video_count || metrics.videos?.length)}</div>
                  </div>
                </div>
              )}

              {platform === 'twitch' && account && (
                <div className="metrics-grid">
                  <div className="metric-item">
                    <div className="metric-label">Usuario</div>
                    <div className="metric-value">{account.displayName || account.raw?.display_name || '—'}</div>
                  </div>
                </div>
              )}

              {expanded && metrics.videos && metrics.videos.length > 0 && (
                <div className="videos-list">
                  <h4>Contenido Reciente</h4>
                  <div className="videos-grid">
                    {metrics.videos.slice(0, 6).map((video: any, idx: number) => (
                      <div key={idx} className="video-card">
                        {video.cover_image_url && (
                          <img src={video.cover_image_url} alt={video.title || ''} />
                        )}
                        <div className="video-info">
                          <div className="video-title">{video.title || video.message || 'Sin título'}</div>
                          {video.metrics && (
                            <div className="video-metrics">
                              {video.metrics.views && <span>👁 {formatNumber(video.metrics.views)}</span>}
                              {video.metrics.likes && <span>❤️ {formatNumber(video.metrics.likes)}</span>}
                              {video.metrics.comments && <span>💬 {formatNumber(video.metrics.comments)}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="view-stats-container">
                <button 
                  className="view-stats-button"
                  onClick={() => navigate(`/platforms/${platform}/stats`)}
                >
                  Ver Todas las Estadísticas →
                </button>
              </div>
            </div>
          ) : (
            <div className="metrics-empty">
              <p>No hay métricas disponibles</p>
              <button 
                className="view-stats-button"
                onClick={() => navigate(`/platforms/${platform}/stats`)}
              >
                Ver Estadísticas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

