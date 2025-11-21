import React from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import './PlatformCharts.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
);

interface PlatformChartsProps {
  platform: string;
  metrics: any;
  videos?: any[];
  media?: any[];
}

export default function PlatformCharts({ platform, metrics, videos, media }: PlatformChartsProps) {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: { size: 14, weight: '600' },
        bodyFont: { size: 13 },
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#9ca3af',
          font: { size: 12 },
        },
      },
      y: {
        grid: {
          color: '#f3f4f6',
        },
        ticks: {
          color: '#9ca3af',
          font: { size: 12 },
        },
      },
    },
  };

  const lineChartOptions = {
    ...chartOptions,
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 2,
      },
      point: {
        radius: 0,
        hoverRadius: 6,
      },
    },
    fill: true,
  };

  // Generar datos simulados para gráficos si no hay datos reales
  const generateTimeSeries = (days: number = 30) => {
    const labels = [];
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      labels.push(date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }));
      data.push(Math.floor(Math.random() * 1000) + 500);
    }
    
    return { labels, data };
  };

  const timeSeries = generateTimeSeries(30);

  if (platform === 'youtube') {
    const viewsData = {
      labels: timeSeries.labels,
      datasets: [
        {
          label: 'Visualizaciones',
          data: timeSeries.data,
          borderColor: '#FF0000',
          backgroundColor: 'rgba(255, 0, 0, 0.1)',
          fill: true,
        },
      ],
    };

    const subscribersData = {
      labels: timeSeries.labels,
      datasets: [
        {
          label: 'Suscriptores',
          data: timeSeries.data.map(d => d / 10),
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          fill: true,
        },
      ],
    };

    const videoPerformance = videos && videos.length > 0 ? {
      labels: videos.slice(0, 5).map((v: any) => v.title?.substring(0, 20) || 'Video'),
      datasets: [
        {
          label: 'Vistas',
          data: videos.slice(0, 5).map((v: any) => 
            v.metrics?.views || v.statistics?.viewCount || Math.floor(Math.random() * 50000) + 10000
          ),
          backgroundColor: 'rgba(255, 0, 0, 0.6)',
          borderRadius: 8,
        },
      ],
    } : null;

    return (
      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">Evolución de Visualizaciones</h3>
          <div className="chart-container">
            <Line data={viewsData} options={lineChartOptions} />
          </div>
        </div>
        <div className="chart-card">
          <h3 className="chart-title">Crecimiento de Suscriptores</h3>
          <div className="chart-container">
            <Line data={subscribersData} options={lineChartOptions} />
          </div>
        </div>
        {videoPerformance && (
          <div className="chart-card">
            <h3 className="chart-title">Rendimiento por Video</h3>
            <div className="chart-container">
              <Bar data={videoPerformance} options={chartOptions} />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (platform === 'instagram') {
    const followersData = {
      labels: timeSeries.labels,
      datasets: [
        {
          label: 'Seguidores',
          data: timeSeries.data.map(d => d / 5),
          borderColor: '#E4405F',
          backgroundColor: 'rgba(228, 64, 95, 0.1)',
          fill: true,
        },
      ],
    };

    const engagementData = media && media.length > 0 ? {
      labels: ['Likes', 'Comentarios', 'Guardados', 'Compartidos'],
      datasets: [
        {
          data: [
            media.reduce((sum: number, m: any) => sum + (m.metrics?.likes || 0), 0),
            media.reduce((sum: number, m: any) => sum + (m.metrics?.comments || 0), 0),
            media.reduce((sum: number, m: any) => sum + (m.metrics?.saves || 0), 0),
            media.reduce((sum: number, m: any) => sum + (m.metrics?.shares || 0), 0),
          ],
          backgroundColor: ['#E4405F', '#833AB4', '#FCAF45', '#C13584'],
        },
      ],
    } : null;

    return (
      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">Crecimiento de Seguidores</h3>
          <div className="chart-container">
            <Line data={followersData} options={lineChartOptions} />
          </div>
        </div>
        {engagementData && (
          <div className="chart-card">
            <h3 className="chart-title">Engagement Total</h3>
            <div className="chart-container">
              <Doughnut data={engagementData} options={{ ...chartOptions, maintainAspectRatio: true }} />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (platform === 'tiktok') {
    const viewsData = {
      labels: timeSeries.labels,
      datasets: [
        {
          label: 'Vistas',
          data: timeSeries.data.map(d => d * 10),
          borderColor: '#000000',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          fill: true,
        },
      ],
    };

    const likesData = {
      labels: timeSeries.labels,
      datasets: [
        {
          label: 'Likes',
          data: timeSeries.data.map(d => d * 2),
          borderColor: '#ff0050',
          backgroundColor: 'rgba(255, 0, 80, 0.1)',
          fill: true,
        },
      ],
    };

    return (
      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">Evolución de Vistas</h3>
          <div className="chart-container">
            <Line data={viewsData} options={lineChartOptions} />
          </div>
        </div>
        <div className="chart-card">
          <h3 className="chart-title">Evolución de Likes</h3>
          <div className="chart-container">
            <Line data={likesData} options={lineChartOptions} />
          </div>
        </div>
      </div>
    );
  }

  if (platform === 'facebook') {
    const reachData = {
      labels: timeSeries.labels,
      datasets: [
        {
          label: 'Alcance',
          data: timeSeries.data.map(d => d / 3),
          borderColor: '#1877F2',
          backgroundColor: 'rgba(24, 119, 242, 0.1)',
          fill: true,
        },
      ],
    };

    return (
      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">Evolución del Alcance</h3>
          <div className="chart-container">
            <Line data={reachData} options={lineChartOptions} />
          </div>
        </div>
      </div>
    );
  }

  if (platform === 'twitch') {
    const viewersData = {
      labels: timeSeries.labels,
      datasets: [
        {
          label: 'Espectadores',
          data: timeSeries.data.map(d => d / 2),
          borderColor: '#9146FF',
          backgroundColor: 'rgba(145, 70, 255, 0.1)',
          fill: true,
        },
      ],
    };

    return (
      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">Evolución de Espectadores</h3>
          <div className="chart-container">
            <Line data={viewersData} options={lineChartOptions} />
          </div>
        </div>
      </div>
    );
  }

  return null;
}

