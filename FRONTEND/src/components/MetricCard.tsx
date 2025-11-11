import React from 'react'
import './MetricCard.css'

type Props = {
  platform: string;
  value: string;
  delta?: string;
  icon?: React.ReactNode;
}

export default function MetricCard({ platform, value, delta, icon }: Props){
  return (
    <div className="ch-metric">
      <div className="ch-metric-top">
        <div className="ch-metric-title">{platform}</div>
        <div className="ch-metric-icon">{icon || '📊'}</div>
      </div>
      <div className="ch-metric-value">{value}</div>
      {delta && <div className="ch-metric-delta">{delta}</div>}
    </div>
  )
}
