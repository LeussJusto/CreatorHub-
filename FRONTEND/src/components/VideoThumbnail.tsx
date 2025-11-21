import React from 'react';
import './VideoThumbnail.css';

interface VideoThumbnailProps {
  index: number;
  platform?: string;
  title?: string;
  className?: string;
}

export default function VideoThumbnail({ index, platform, title, className = '' }: VideoThumbnailProps) {
  const getPlatformIcon = (p?: string) => {
    switch (p?.toLowerCase()) {
      case 'youtube': return '▶️';
      case 'instagram': return '📸';
      case 'tiktok': return '🎵';
      case 'facebook': return '👥';
      case 'twitch': return '🎮';
      default: return '📹';
    }
  };

  const getPlatformColor = (p?: string) => {
    switch (p?.toLowerCase()) {
      case 'youtube': return '#FF0000';
      case 'instagram': return 'linear-gradient(135deg, #E4405F 0%, #833AB4 50%, #FCAF45 100%)';
      case 'tiktok': return '#000000';
      case 'facebook': return '#1877F2';
      case 'twitch': return '#9146FF';
      default: return '#667eea';
    }
  };

  return (
    <div className={`video-thumbnail-container ${className}`} style={{ background: getPlatformColor(platform) }}>
      <div className="video-thumbnail-content">
        <div className="video-thumbnail-icon">{getPlatformIcon(platform)}</div>
        <div className="video-thumbnail-number">{index + 1}</div>
      </div>
    </div>
  );
}

