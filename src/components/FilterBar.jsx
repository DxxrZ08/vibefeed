import React from 'react';
import {
  Activity,
  BriefcaseBusiness,
  Clapperboard,
  Filter,
  FlaskConical,
  Globe2,
  Layers3,
  Meh,
  MonitorSmartphone,
  ShieldCheck,
  Smile,
  Trophy,
  Frown,
} from 'lucide-react';
import { NEWS_CATEGORIES, NEWS_REGIONS } from '../utils/api';
import './FilterBar.css';

const FilterBar = ({
  selectedSentiment,
  setSelectedSentiment,
  selectedCategory,
  setSelectedCategory,
  selectedRegion,
  setSelectedRegion,
}) => {
  const categoryIcons = {
    all: Globe2,
    general: Globe2,
    technology: MonitorSmartphone,
    business: BriefcaseBusiness,
    science: FlaskConical,
    health: Activity,
    sports: Trophy,
    entertainment: Clapperboard,
  };

  const sentiments = [
    { label: 'All', icon: <Filter size={14} /> },
    { label: 'Positive', icon: <Smile size={14} /> },
    { label: 'Neutral', icon: <Meh size={14} /> },
    { label: 'Negative', icon: <Frown size={14} /> }
  ];

  return (
    <div className="filter-bar">
      <div className="filter-group region-group">
        <div className="filter-header">
          <Globe2 size={16} />
          <span>Region</span>
        </div>
        <div className="filter-options">
          <select className="region-select" value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
            {NEWS_REGIONS.map((region) => (
              <option key={region.value} value={region.value}>
                {region.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="filter-divider"></div>

      <div className="filter-group category-group">
        <div className="filter-header">
          <Layers3 size={16} />
          <span>Categories</span>
        </div>
        <div className="filter-options scrollable-options">
          {NEWS_CATEGORIES.map((category) => (
            (() => {
              const Icon = categoryIcons[category.key] || ShieldCheck;
              const isActive = selectedCategory === category.key;

              return (
                <button
                  key={category.key}
                  className={`filter-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.key)}
                >
                  <Icon size={15} fill={isActive ? 'currentColor' : 'none'} />
                  {category.label}
                </button>
              );
            })()
          ))}
        </div>
      </div>

      <div className="filter-divider"></div>

      <div className="filter-group">
        <div className="filter-header">
          <Filter size={16} />
          <span>Sentiment</span>
        </div>
        <div className="filter-options">
          {sentiments.map((sentiment) => (
            <button
              key={sentiment.label}
              className={`filter-btn ${selectedSentiment === sentiment.label ? 'active' : ''}`}
              onClick={() => setSelectedSentiment(sentiment.label)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {sentiment.icon}
              {sentiment.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
