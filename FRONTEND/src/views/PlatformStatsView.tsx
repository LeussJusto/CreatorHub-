import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getIntegrationAccounts } from '../services/integrations';
import { getJson } from '../services/api';
import Header from '../components/Header';
import AIAssistant from '../components/AIAssistant';
import VideoThumbnail from '../components/VideoThumbnail';
import StatsTabs from '../components/StatsTabs';
import PlatformCharts from '../components/PlatformCharts';
import AdditionalMetrics from '../components/AdditionalMetrics';
import './PlatformStatsView.css';

const platformConfig: Record<string, { title: string; icon: string; color: string }> = {
  youtube: { title: 'YouTube', icon: '▶️', color: '#FF0000' },
  instagram: { title: 'Instagram', icon: '📸', color: 'linear-gradient(135deg, #E4405F 0%, #833AB4 50%, #FCAF45 100%)' },
  facebook: { title: 'Facebook', icon: '👥', color: '#1877F2' },
  tiktok: { title: 'TikTok', icon: '🎵', color: '#000000' },
  twitch: { title: 'Twitch', icon: '🎮', color: '#9146FF' }
};

export default function PlatformStatsView() {
  const { platform } = useParams<{ platform: string }>();
  const { token, initialized } = useAuth();
  const navigate = useNavigate();
  const [account, setAccount] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!initialized || !token || !platform) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load account
        const accounts = await getIntegrationAccounts(token);
        const acc = (accounts || []).find((a: any) => 
          String(a.platform).toLowerCase() === platform.toLowerCase()
        );

        if (!acc) {
          setError('No se encontró una cuenta conectada para esta plataforma');
          setLoading(false);
          return;
        }

        setAccount(acc);

        // Load metrics
        try {
          const data = await getJson(`/api/integrations/accounts/${acc.id}/videos`, token);
          // Si no hay datos pero hay account, establecer metrics vacío para mostrar info básica
          if (data) {
            setMetrics(data);
          } else {
            // Para Twitch, aún queremos mostrar la info del account
            setMetrics({ profile: acc.raw || {}, videos: [] });
          }
        } catch (err: any) {
          console.error('Error loading metrics:', err);
          // Para Twitch, aún mostrar info básica del account aunque falle la carga
          if (platform?.toLowerCase() === 'twitch') {
            setMetrics({ profile: acc.raw || {}, videos: [] });
            setError(null); // No mostrar error para Twitch si tenemos account
          } else {
            setError('No se pudieron cargar las métricas');
          }
        }
      } catch (err: any) {
        console.error('Error loading account:', err);
        setError('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token, initialized, platform]);

  const formatNumber = (num: number | null | undefined): string => {
    if (num == null || num === undefined) return '—';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const config = platform ? platformConfig[platform.toLowerCase()] : null;

  if (!platform || !config) {
    return (
      <div className="platform-stats-root">
        <Header />
        <div className="platform-stats-error">
          <h2>Plataforma no encontrada</h2>
          <button onClick={() => navigate('/dashboard')}>Volver al Dashboard</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="platform-stats-root">
        <Header />
        <div className="platform-stats-loading">
          <div className="loading-spinner"></div>
          <p>Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (error && !account) {
    return (
      <div className="platform-stats-root">
        <Header />
        <div className="platform-stats-error">
          <h2>{error}</h2>
          <button onClick={() => navigate('/dashboard')}>Volver al Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="platform-stats-root">
      <Header />
      <main className="platform-stats-main">
        <div className="stats-header">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            ← Volver
          </button>
          <div className="header-content">
            <div className="platform-icon-large" style={{background: typeof config.color === 'string' && config.color.includes('gradient') ? config.color : `linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%)`}}>
              {config.icon}
            </div>
            <div>
              <h1 className="stats-title">Estadísticas de {config.title}</h1>
              {account?.displayName && (
                <p className="stats-subtitle">{account.displayName}</p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}

        {metrics && (
          <StatsTabs
            tabs={[
              { id: 'resumen', label: 'Resumen', icon: '📊' },
              { id: 'graficos', label: 'Gráficos', icon: '📈' },
              { id: 'mas-estadisticas', label: 'Más Estadísticas', icon: '📋' },
              { id: 'contenido', label: 'Contenido', icon: '📹' },
            ]}
            defaultTab="resumen"
          >
            {/* Tab: Resumen */}
            <div className="tab-content">
              {platform === 'youtube' && metrics.profile && (
                <section className="stats-section">
                  <h2 className="section-title">Resumen del Canal</h2>
                  <div className="metrics-grid-large">
                    <div className="metric-card-large">
                      <div className="metric-icon">👥</div>
                      <div className="metric-info">
                        <div className="metric-label-large">Suscriptores</div>
                        <div className="metric-value-large">
                          {formatNumber(metrics.profile.subscriber_count || metrics.profile.subscribers || account?.raw?.subscriberCount)}
                        </div>
                      </div>
                    </div>
                    <div className="metric-card-large">
                      <div className="metric-icon">👁️</div>
                      <div className="metric-info">
                        <div className="metric-label-large">Visualizaciones</div>
                        <div className="metric-value-large">
                          {formatNumber(metrics.profile.view_count || metrics.profile.views || account?.raw?.viewCount)}
                        </div>
                      </div>
                    </div>
                    <div className="metric-card-large">
                      <div className="metric-icon">📹</div>
                      <div className="metric-info">
                        <div className="metric-label-large">Videos</div>
                        <div className="metric-value-large">
                          {formatNumber(metrics.profile.video_count || metrics.videos?.length || account?.raw?.videoCount)}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {platform === 'instagram' && metrics.profile && (
                <section className="stats-section">
                  <h2 className="section-title">Resumen del Perfil</h2>
                  <div className="metrics-grid-large">
                    <div className="metric-card-large">
                      <div className="metric-icon">👥</div>
                      <div className="metric-info">
                        <div className="metric-label-large">Seguidores</div>
                        <div className="metric-value-large">
                          {formatNumber(metrics.profile.follower_count || metrics.profile.followers)}
                        </div>
                      </div>
                    </div>
                    <div className="metric-card-large">
                      <div className="metric-icon">📸</div>
                      <div className="metric-info">
                        <div className="metric-label-large">Publicaciones</div>
                        <div className="metric-value-large">
                          {formatNumber(metrics.profile.media_count || metrics.media?.length)}
                        </div>
                      </div>
                    </div>
                    <div className="metric-card-large">
                      <div className="metric-icon">📊</div>
                      <div className="metric-info">
                        <div className="metric-label-large">Alcance</div>
                        <div className="metric-value-large">
                          {formatNumber(metrics.profile.reach || metrics.metricsRaw?.reach)}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {platform === 'facebook' && metrics.profile && (
                <section className="stats-section">
                  <h2 className="section-title">Resumen</h2>
                  <div className="metrics-grid-large">
                    <div className="metric-card-large">
                      <div className="metric-icon">📄</div>
                      <div className="metric-info">
                        <div className="metric-label-large">Páginas</div>
                        <div className="metric-value-large">
                          {formatNumber(metrics.pages?.length || 0)}
                        </div>
                      </div>
                    </div>
                    <div className="metric-card-large">
                      <div className="metric-icon">📝</div>
                      <div className="metric-info">
                        <div className="metric-label-large">Publicaciones</div>
                        <div className="metric-value-large">
                          {formatNumber(metrics.videos?.length || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {platform === 'tiktok' && metrics.profile && (
                <section className="stats-section">
                  <h2 className="section-title">Resumen del Perfil</h2>
                  <div className="metrics-grid-large">
                    <div className="metric-card-large">
                      <div className="metric-icon">👥</div>
                      <div className="metric-info">
                        <div className="metric-label-large">Seguidores</div>
                        <div className="metric-value-large">
                          {formatNumber(metrics.profile.follower_count)}
                        </div>
                      </div>
                    </div>
                    <div className="metric-card-large">
                      <div className="metric-icon">❤️</div>
                      <div className="metric-info">
                        <div className="metric-label-large">Likes</div>
                        <div className="metric-value-large">
                          {formatNumber(metrics.profile.likes_count)}
                        </div>
                      </div>
                    </div>
                    <div className="metric-card-large">
                      <div className="metric-icon">📹</div>
                      <div className="metric-info">
                        <div className="metric-label-large">Videos</div>
                        <div className="metric-value-large">
                          {formatNumber(metrics.profile.video_count || metrics.videos?.length)}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {platform === 'twitch' && metrics && metrics.profile && (
                <section className="stats-section">
                  <h2 className="section-title">Resumen del Canal</h2>
                  <div className="metrics-grid-large">
                    <div className="metric-card-large">
                      <div className="metric-icon">👁️</div>
                      <div className="metric-info">
                        <div className="metric-label-large">Visualizaciones</div>
                        <div className="metric-value-large">
                          {formatNumber(metrics.profile.view_count || metrics.profile.views)}
                        </div>
                      </div>
                    </div>
                    <div className="metric-card-large">
                      <div className="metric-icon">👥</div>
                      <div className="metric-info">
                        <div className="metric-label-large">Seguidores</div>
                        <div className="metric-value-large">
                          {formatNumber(metrics.profile.follower_count || metrics.profile.followers)}
                        </div>
                      </div>
                    </div>
                    <div className="metric-card-large">
                      <div className="metric-icon">👤</div>
                      <div className="metric-info">
                        <div className="metric-label-large">Usuario</div>
                        <div className="metric-value-large" style={{fontSize: '20px'}}>
                          {metrics.profile.display_name || metrics.profile.login || account?.displayName || '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {platform === 'twitch' && account && !metrics && (
                <section className="stats-section">
                  <h2 className="section-title">Información del Canal</h2>
                  <div className="metrics-grid-large">
                    <div className="metric-card-large">
                      <div className="metric-icon">👤</div>
                      <div className="metric-info">
                        <div className="metric-label-large">Usuario</div>
                        <div className="metric-value-large" style={{fontSize: '24px'}}>
                          {account.displayName || account.raw?.display_name || '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Tab: Gráficos */}
            <div className="tab-content">
              {platform && (
                <PlatformCharts
                  platform={platform}
                  metrics={metrics}
                  videos={metrics?.videos}
                  media={metrics?.media}
                />
              )}
            </div>

            {/* Tab: Más Estadísticas */}
            <div className="tab-content">
              {platform && (
                <AdditionalMetrics
                  platform={platform}
                  metrics={metrics}
                  videos={metrics?.videos}
                  media={metrics?.media}
                />
              )}
            </div>

            {/* Tab: Contenido */}
            <div className="tab-content">
              {platform === 'youtube' && metrics.videos && metrics.videos.length > 0 && (
                <section className="stats-section">
                  <h2 className="section-title">Videos Recientes</h2>
                  <div className="videos-list-large">
                    {(expandedSections['youtube-videos'] ? metrics.videos : metrics.videos.slice(0, 3)).map((video: any, idx: number) => (
                      <div key={idx} className="video-card-large">
                        {video.thumbnail_url && !video.thumbnail_url.includes('placeholder') && !video.thumbnail_url.includes('via.placeholder') ? (
                          <img src={video.thumbnail_url} alt={video.title || ''} className="video-thumbnail" />
                        ) : (
                          <VideoThumbnail index={idx} platform={platform} title={video.title} className="video-thumbnail" />
                        )}
                        <div className="video-details">
                          <h3 className="video-title-large">{video.title || 'Sin título'}</h3>
                          {video.published_at && (
                            <p className="video-date">{new Date(video.published_at).toLocaleDateString('es-ES')}</p>
                          )}
                          {video.metrics && (
                            <div className="video-metrics-large">
                              {video.metrics.views && <span>👁️ {formatNumber(video.metrics.views)}</span>}
                              {video.metrics.likes && <span>❤️ {formatNumber(video.metrics.likes)}</span>}
                              {video.metrics.comments && <span>💬 {formatNumber(video.metrics.comments)}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {metrics.videos.length > 3 && (
                    <button 
                      className="ver-mas-btn"
                      onClick={() => setExpandedSections(prev => ({ ...prev, 'youtube-videos': !prev['youtube-videos'] }))}
                    >
                      {expandedSections['youtube-videos'] ? 'Ver menos' : 'Ver más'}
                    </button>
                  )}
                </section>
              )}

              {platform === 'instagram' && metrics.media && metrics.media.length > 0 && (
                <section className="stats-section">
                  <h2 className="section-title">Publicaciones Recientes</h2>
                  <div className="videos-list-large">
                    {(expandedSections['instagram-media'] ? metrics.media : metrics.media.slice(0, 3)).map((media: any, idx: number) => (
                      <div key={idx} className="video-card-large">
                        {media.thumbnail_url && !media.thumbnail_url.includes('placeholder') && !media.thumbnail_url.includes('via.placeholder') ? (
                          <img src={media.thumbnail_url} alt={media.caption || ''} className="video-thumbnail" />
                        ) : (
                          <VideoThumbnail index={idx} platform={platform} title={media.caption} className="video-thumbnail" />
                        )}
                        <div className="video-details">
                          <p className="video-caption">{media.caption || 'Sin descripción'}</p>
                          {media.timestamp && (
                            <p className="video-date">{new Date(media.timestamp).toLocaleDateString('es-ES')}</p>
                          )}
                          {media.metrics && (
                            <div className="video-metrics-large">
                              {media.metrics.likes && <span>❤️ {formatNumber(media.metrics.likes)}</span>}
                              {media.metrics.comments && <span>💬 {formatNumber(media.metrics.comments)}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {metrics.media.length > 3 && (
                    <button 
                      className="ver-mas-btn"
                      onClick={() => setExpandedSections(prev => ({ ...prev, 'instagram-media': !prev['instagram-media'] }))}
                    >
                      {expandedSections['instagram-media'] ? 'Ver menos' : 'Ver más'}
                    </button>
                  )}
                </section>
              )}

              {platform === 'facebook' && metrics.videos && metrics.videos.length > 0 && (
                <section className="stats-section">
                  <h2 className="section-title">Publicaciones Recientes</h2>
                  <div className="videos-list-large">
                    {(expandedSections['facebook-posts'] ? metrics.videos : metrics.videos.slice(0, 3)).map((post: any, idx: number) => (
                      <div key={idx} className="video-card-large">
                        {post.cover_image_url && !post.cover_image_url.includes('placeholder') && !post.cover_image_url.includes('via.placeholder') ? (
                          <img src={post.cover_image_url} alt={post.message || ''} className="video-thumbnail" />
                        ) : (
                          <VideoThumbnail index={idx} platform={platform} title={post.message} className="video-thumbnail" />
                        )}
                        <div className="video-details">
                          <p className="video-caption">{post.message || 'Sin mensaje'}</p>
                          {post.created_time && (
                            <p className="video-date">{new Date(post.created_time).toLocaleDateString('es-ES')}</p>
                          )}
                          {post.metrics && (
                            <div className="video-metrics-large">
                              {post.metrics.likes && <span>👍 {formatNumber(post.metrics.likes)}</span>}
                              {post.metrics.comments && <span>💬 {formatNumber(post.metrics.comments)}</span>}
                              {post.metrics.shares && <span>🔄 {formatNumber(post.metrics.shares)}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {metrics.videos.length > 3 && (
                    <button 
                      className="ver-mas-btn"
                      onClick={() => setExpandedSections(prev => ({ ...prev, 'facebook-posts': !prev['facebook-posts'] }))}
                    >
                      {expandedSections['facebook-posts'] ? 'Ver menos' : 'Ver más'}
                    </button>
                  )}
                </section>
              )}

              {platform === 'tiktok' && metrics.videos && metrics.videos.length > 0 && (
                <section className="stats-section">
                  <h2 className="section-title">Videos Recientes</h2>
                  <div className="videos-list-large">
                    {(expandedSections['tiktok-videos'] ? metrics.videos : metrics.videos.slice(0, 3)).map((video: any, idx: number) => (
                      <div key={idx} className="video-card-large">
                        {video.cover_image_url && !video.cover_image_url.includes('placeholder') && !video.cover_image_url.includes('via.placeholder') ? (
                          <img src={video.cover_image_url} alt={video.title || ''} className="video-thumbnail" />
                        ) : (
                          <VideoThumbnail index={idx} platform={platform} title={video.title} className="video-thumbnail" />
                        )}
                        <div className="video-details">
                          <h3 className="video-title-large">{video.title || 'Sin título'}</h3>
                          {video.create_time && (
                            <p className="video-date">{new Date(video.create_time).toLocaleDateString('es-ES')}</p>
                          )}
                          {video.metrics && (
                            <div className="video-metrics-large">
                              {video.metrics.views && <span>👁️ {formatNumber(video.metrics.views)}</span>}
                              {video.metrics.likes && <span>❤️ {formatNumber(video.metrics.likes)}</span>}
                              {video.metrics.comments && <span>💬 {formatNumber(video.metrics.comments)}</span>}
                              {video.metrics.shares && <span>🔄 {formatNumber(video.metrics.shares)}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {metrics.videos.length > 3 && (
                    <button 
                      className="ver-mas-btn"
                      onClick={() => setExpandedSections(prev => ({ ...prev, 'tiktok-videos': !prev['tiktok-videos'] }))}
                    >
                      {expandedSections['tiktok-videos'] ? 'Ver menos' : 'Ver más'}
                    </button>
                  )}
                </section>
              )}

              {platform === 'twitch' && metrics.videos && metrics.videos.length > 0 && (
                <section className="stats-section">
                  <h2 className="section-title">Clips Recientes</h2>
                  <div className="videos-list-large">
                    {(expandedSections['twitch-clips'] ? metrics.videos : metrics.videos.slice(0, 3)).map((video: any, idx: number) => (
                      <div key={idx} className="video-card-large">
                        {video.thumbnail_url && !video.thumbnail_url.includes('placeholder') && !video.thumbnail_url.includes('via.placeholder') ? (
                          <img src={video.thumbnail_url} alt={video.title || ''} className="video-thumbnail" />
                        ) : (
                          <VideoThumbnail index={idx} platform={platform} title={video.title} className="video-thumbnail" />
                        )}
                        <div className="video-details">
                          <h3 className="video-title-large">{video.title || 'Sin título'}</h3>
                          {video.created_at && (
                            <p className="video-date">{new Date(video.created_at).toLocaleDateString('es-ES')}</p>
                          )}
                          {video.metrics && (
                            <div className="video-metrics-large">
                              {video.metrics.views && <span>👁️ {formatNumber(video.metrics.views)}</span>}
                              {video.metrics.likes && <span>❤️ {formatNumber(video.metrics.likes)}</span>}
                              {video.metrics.comments && <span>💬 {formatNumber(video.metrics.comments)}</span>}
                            </div>
                          )}
                          {video.view_count && (
                            <div className="video-metrics-large">
                              <span>👁️ {formatNumber(video.view_count)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {metrics.videos.length > 3 && (
                    <button 
                      className="ver-mas-btn"
                      onClick={() => setExpandedSections(prev => ({ ...prev, 'twitch-clips': !prev['twitch-clips'] }))}
                    >
                      {expandedSections['twitch-clips'] ? 'Ver menos' : 'Ver más'}
                    </button>
                  )}
                </section>
              )}
            </div>
          </StatsTabs>
        )}

        {!metrics && !error && (
          <div className="no-metrics">
            <p>No hay métricas disponibles en este momento</p>
          </div>
        )}

        {/* Asistente de IA - siempre visible si hay cuenta conectada */}
        {account && (
          <section className="stats-section ai-section">
            <AIAssistant 
              platform={platform || ''} 
              metrics={metrics || {}} 
              account={account} 
            />
          </section>
        )}
      </main>
    </div>
  );
}

