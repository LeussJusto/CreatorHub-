import React, { useState } from 'react';
import './StatsTabs.css';

interface StatsTabsProps {
  children: React.ReactNode;
  tabs: Array<{ id: string; label: string; icon?: string }>;
  defaultTab?: string;
}

export default function StatsTabs({ children, tabs, defaultTab }: StatsTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '');

  return (
    <div className="stats-tabs-container">
      <div className="stats-tabs-header">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`stats-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon && <span className="tab-icon">{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="stats-tabs-content">
        {React.Children.toArray(children).map((child, index) => {
          if (tabs[index]?.id === activeTab) {
            return <div key={tabs[index].id} className="tab-panel">{child}</div>;
          }
          return null;
        })}
      </div>
    </div>
  );
}

