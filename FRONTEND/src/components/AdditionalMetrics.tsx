import React from 'react';
import './AdditionalMetrics.css';

interface AdditionalMetricsProps {
  platform: string;
  metrics: any;
  videos?: any[];
  media?: any[];
}

export default function AdditionalMetrics({ platform, metrics, videos, media }: AdditionalMetricsProps) {
  const formatNumber = (num: number | null | undefined): string => {
    if (num == null || num === undefined) return '—';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const calculateEngagementRate = () => {
    if (platform === 'youtube' && videos && videos.length > 0) {
      const totalViews = videos.reduce((sum: number, v: any) => 
        sum + (Number(v.metrics?.views || v.statistics?.viewCount || 0)), 0
      );
      const totalLikes = videos.reduce((sum: number, v: any) => 
        sum + (Number(v.metrics?.likes || v.statistics?.likeCount || 0)), 0
      );
      const totalComments = videos.reduce((sum: number, v: any) => 
        sum + (Number(v.metrics?.comments || v.statistics?.commentCount || 0)), 0
      );
      const engagement = totalLikes + totalComments;
      return totalViews > 0 ? ((engagement / totalViews) * 100).toFixed(2) : '0.00';
    }
    if (platform === 'instagram' && media && media.length > 0) {
      const totalFollowers = metrics.profile?.follower_count || metrics.profile?.followers || 1;
      const totalLikes = media.reduce((sum: number, m: any) => sum + (m.metrics?.likes || 0), 0);
      const totalComments = media.reduce((sum: number, m: any) => sum + (m.metrics?.comments || 0), 0);
      const engagement = totalLikes + totalComments;
      return ((engagement / (totalFollowers * media.length)) * 100).toFixed(2);
    }
    if (platform === 'tiktok' && videos && videos.length > 0) {
      const totalViews = videos.reduce((sum: number, v: any) => sum + (v.metrics?.views || 0), 0);
      const totalLikes = videos.reduce((sum: number, v: any) => sum + (v.metrics?.likes || 0), 0);
      const totalComments = videos.reduce((sum: number, v: any) => sum + (v.metrics?.comments || 0), 0);
      const engagement = totalLikes + totalComments;
      return totalViews > 0 ? ((engagement / totalViews) * 100).toFixed(2) : '0.00';
    }
    return '—';
  };

  const calculateAverageViews = () => {
    if (videos && videos.length > 0) {
      const total = videos.reduce((sum: number, v: any) => 
        sum + (Number(v.metrics?.views || v.statistics?.viewCount || v.view_count || 0)), 0
      );
      return formatNumber(Math.floor(total / videos.length));
    }
    return '—';
  };

  const calculateAverageLikes = () => {
    if (videos && videos.length > 0) {
      const total = videos.reduce((sum: number, v: any) => 
        sum + (Number(v.metrics?.likes || v.statistics?.likeCount || 0)), 0
      );
      return formatNumber(Math.floor(total / videos.length));
    }
    if (media && media.length > 0) {
      const total = media.reduce((sum: number, m: any) => sum + (m.metrics?.likes || 0), 0);
      return formatNumber(Math.floor(total / media.length));
    }
    return '—';
  };

  const calculateTotalEngagement = () => {
    if (videos && videos.length > 0) {
      const likes = videos.reduce((sum: number, v: any) => 
        sum + (Number(v.metrics?.likes || v.statistics?.likeCount || 0)), 0
      );
      const comments = videos.reduce((sum: number, v: any) => 
        sum + (Number(v.metrics?.comments || v.statistics?.commentCount || 0)), 0
      );
      const shares = videos.reduce((sum: number, v: any) => 
        sum + (Number(v.metrics?.shares || v.statistics?.shareCount || 0)), 0
      );
      return formatNumber(likes + comments + shares);
    }
    if (media && media.length > 0) {
      const likes = media.reduce((sum: number, m: any) => sum + (m.metrics?.likes || 0), 0);
      const comments = media.reduce((sum: number, m: any) => sum + (m.metrics?.comments || 0), 0);
      const saves = media.reduce((sum: number, m: any) => sum + (m.metrics?.saves || 0), 0);
      const shares = media.reduce((sum: number, m: any) => sum + (m.metrics?.shares || 0), 0);
      return formatNumber(likes + comments + saves + shares);
    }
    return '—';
  };

  const getMetricsForPlatform = () => {
    const baseMetrics = [
      {
        label: 'Tasa de Engagement',
        value: `${calculateEngagementRate()}%`,
        icon: '📈',
        description: 'Interacción promedio con tu contenido'
      },
      {
        label: 'Promedio de Vistas',
        value: calculateAverageViews(),
        icon: '👁️',
        description: 'Vistas promedio por publicación'
      },
      {
        label: 'Promedio de Likes',
        value: calculateAverageLikes(),
        icon: '❤️',
        description: 'Likes promedio por publicación'
      },
      {
        label: 'Engagement Total',
        value: calculateTotalEngagement(),
        icon: '💬',
        description: 'Total de interacciones'
      },
    ];

    if (platform === 'youtube') {
      return [
        ...baseMetrics,
        {
          label: 'Tiempo de Visualización',
          value: '—',
          icon: '⏱️',
          description: 'Tiempo promedio de visualización'
        },
        {
          label: 'Tasa de Retención',
          value: '—',
          icon: '📊',
          description: 'Porcentaje de retención de audiencia'
        },
      ];
    }

    if (platform === 'instagram') {
      return [
        ...baseMetrics,
        {
          label: 'Alcance Promedio',
          value: formatNumber(metrics.profile?.reach ? metrics.profile.reach / (media?.length || 1) : 0),
          icon: '📡',
          description: 'Alcance promedio por publicación'
        },
        {
          label: 'Tasa de Guardados',
          value: media && media.length > 0 
            ? `${((media.reduce((sum: number, m: any) => sum + (m.metrics?.saves || 0), 0) / (media.length * (metrics.profile?.follower_count || 1))) * 100).toFixed(2)}%`
            : '—',
          icon: '🔖',
          description: 'Porcentaje de guardados'
        },
      ];
    }

    if (platform === 'tiktok') {
      return [
        ...baseMetrics,
        {
          label: 'Promedio de Compartidos',
          value: videos && videos.length > 0
            ? formatNumber(Math.floor(videos.reduce((sum: number, v: any) => sum + (v.metrics?.shares || 0), 0) / videos.length))
            : '—',
          icon: '🔄',
          description: 'Compartidos promedio por video'
        },
        {
          label: 'Ratio Likes/Vistas',
          value: videos && videos.length > 0
            ? `${((videos.reduce((sum: number, v: any) => sum + (v.metrics?.likes || 0), 0) / videos.reduce((sum: number, v: any) => sum + (v.metrics?.views || 0), 1)) * 100).toFixed(2)}%`
            : '—',
          icon: '📊',
          description: 'Porcentaje de likes sobre vistas'
        },
      ];
    }

    if (platform === 'facebook') {
      return [
        ...baseMetrics,
        {
          label: 'Alcance Total',
          value: formatNumber(metrics.profile?.reach || 0),
          icon: '📡',
          description: 'Total de personas alcanzadas'
        },
        {
          label: 'Promedio de Reacciones',
          value: videos && videos.length > 0
            ? formatNumber(Math.floor(videos.reduce((sum: number, v: any) => sum + (v.metrics?.reactions || 0), 0) / videos.length))
            : '—',
          icon: '👍',
          description: 'Reacciones promedio por post'
        },
      ];
    }

    if (platform === 'twitch') {
      return [
        {
          label: 'Promedio de Espectadores',
          value: formatNumber(metrics.profile?.view_count ? metrics.profile.view_count / 10 : 0),
          icon: '👥',
          description: 'Espectadores promedio por stream'
        },
        {
          label: 'Tasa de Conversión',
          value: '—',
          icon: '📈',
          description: 'Conversión de visitantes a seguidores'
        },
        {
          label: 'Horas Totales',
          value: '—',
          icon: '⏱️',
          description: 'Tiempo total de streaming'
        },
      ];
    }

    return baseMetrics;
  };

  const additionalMetrics = getMetricsForPlatform();

  return (
    <div className="additional-metrics">
      <div className="metrics-grid-additional">
        {additionalMetrics.map((metric, idx) => (
          <div key={idx} className="metric-card-additional">
            <div className="metric-icon-additional">{metric.icon}</div>
            <div className="metric-content-additional">
              <div className="metric-label-additional">{metric.label}</div>
              <div className="metric-value-additional">{metric.value}</div>
              <div className="metric-description">{metric.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

