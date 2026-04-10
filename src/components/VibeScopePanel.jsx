import React from 'react';
import { Globe2, Radar, Sparkles, TrendingUp } from 'lucide-react';
import { getRegionByValue } from '../utils/newsTaxonomy';
import './VibeScopePanel.css';

const VibeScopePanel = ({ data, loading }) => {
  if (loading) {
    return (
      <section className="vibe-scope-panel loading">
        <div className="vibe-scope-header">
          <div>
            <p className="vibe-kicker">Unique Feature</p>
            <h2>Narrative Divergence Radar</h2>
          </div>
          <Radar size={28} />
        </div>
        <p className="vibe-insight">Scanning how the same news mood changes from region to region...</p>
        <div className="vibe-grid">
          {Array.from({ length: 3 }).map((_, index) => (
            <article key={index} className="vibe-card skeleton vibe-skeleton-card">
              <div className="skeleton-line short" />
              <div className="skeleton-line medium" />
              <div className="skeleton-line long" />
              <div className="skeleton-pills">
                <span className="skeleton-pill" />
                <span className="skeleton-pill" />
                <span className="skeleton-pill" />
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="vibe-scope-panel">
      <div className="vibe-scope-header">
        <div>
          <p className="vibe-kicker">Unique Feature</p>
          <h2>Narrative Divergence Radar</h2>
        </div>
        <div className="divergence-badge">
          <TrendingUp size={16} />
          <span>{data.divergenceScore}/100 divergence</span>
        </div>
      </div>

      <p className="vibe-insight">{data.insight}</p>

      <div className="emerging-keywords">
        {data.emergingKeywords.map((keyword) => (
          <span key={keyword} className="emerging-pill">
            <Sparkles size={12} />
            {keyword}
          </span>
        ))}
      </div>

      <div className="vibe-grid">
        {data.cards.map((card) => {
          const region = getRegionByValue(card.region);

          return (
            <article key={card.region} className="vibe-card">
              <div className="vibe-card-header">
                <div>
                  <span className="region-chip">
                    <Globe2 size={14} />
                    {region.label}
                  </span>
                  <h3>{card.dominantTopic}</h3>
                </div>
                <span className="vibe-count">{card.articleCount} live signals</span>
              </div>
              <p className="vibe-headline">{card.headline}</p>
              <p className="vibe-summary">{card.summary}</p>
              <div className="vibe-keywords">
                {card.topKeywords.map((keyword) => (
                  <span key={keyword} className="keyword-chip">
                    {keyword}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default VibeScopePanel;
