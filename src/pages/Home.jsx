import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowUpRight, Brain, Globe2, Radar, RefreshCw, Search, Sparkles, TrendingUp } from 'lucide-react';
import ArticleCard from '../components/ArticleCard';
import FilterBar from '../components/FilterBar';
import VibeScopePanel from '../components/VibeScopePanel';
import { fetchNewsBundle, fetchVibeScope, searchNews } from '../utils/api';
import { getCategoryByKey, getCategoryBySlug, getRegionByValue, REGION_PACKS } from '../utils/newsTaxonomy';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const Home = () => {
  const { category: categorySlug } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();

  const initialCategory = getCategoryBySlug(categorySlug).key;
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedSentiment, setSelectedSentiment] = useState('All');
  const [selectedRegion, setSelectedRegion] = useState(userData?.regions?.[0] || 'us');
  const location = useLocation();
  const initialQuery = new URLSearchParams(location.search).get('search') || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(initialQuery);
  const [articles, setArticles] = useState([]);
  const [storyClusters, setStoryClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [vibeScope, setVibeScope] = useState(null);
  const [loadingVibeScope, setLoadingVibeScope] = useState(true);
  const [feedMeta, setFeedMeta] = useState({
    avgRelevance: 0,
    totalAnalyzed: 0,
    topSources: [],
    provider: 'live',
    clusters: 0,
    digest: '',
  });

  const userPreferences = useMemo(() => userData?.interests || ['technology', 'business'], [userData]);
  const currentCategory = getCategoryByKey(selectedCategory);
  const currentRegion = getRegionByValue(selectedRegion);
  const regionPack = useMemo(() => REGION_PACKS[selectedRegion] || ['us', 'gb', 'in'], [selectedRegion]);

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    if (userData?.regions?.[0]) {
      setSelectedRegion(userData.regions[0]);
    }
  }, [userData]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('search') || '';
    if (query !== searchQuery) {
      setSearchQuery(query);
    }
  }, [location.search]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  const applyBundle = (bundle) => {
    setArticles(bundle.articles || []);
    setStoryClusters(bundle.clusters || []);

    const nextArticles = bundle.articles || [];
    const avgRelevance = nextArticles.length
      ? Math.round(nextArticles.reduce((sum, article) => sum + (article.relevanceScore || 0), 0) / nextArticles.length)
      : 0;
    const topSources = [...new Set(nextArticles.map((article) => article.source).filter(Boolean))].slice(0, 4);

    setFeedMeta({
      avgRelevance,
      totalAnalyzed: nextArticles.length,
      topSources,
      provider: bundle.meta?.provider || 'live',
      clusters: bundle.clusters?.length || 0,
      digest: bundle.digest || '',
    });
  };

  const loadFeed = async (forceRefresh = false) => {
    setLoading(!forceRefresh);
    setSyncing(forceRefresh);

    try {
      const bundle = debouncedSearchQuery
        ? await searchNews({
            query: debouncedSearchQuery,
            category: selectedCategory,
            region: selectedRegion,
            userPreferences,
          })
        : await fetchNewsBundle(selectedCategory, selectedRegion, userPreferences);

      applyBundle(bundle);
    } catch (error) {
      console.error('Error loading feed:', error);
      setArticles([]);
      setStoryClusters([]);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const bundle = debouncedSearchQuery
          ? await searchNews({
              query: debouncedSearchQuery,
              category: selectedCategory,
              region: selectedRegion,
              userPreferences,
            })
          : await fetchNewsBundle(selectedCategory, selectedRegion, userPreferences);

        if (active) {
          applyBundle(bundle);
        }
      } catch (error) {
        if (active) {
          console.error('Error loading feed:', error);
          setArticles([]);
          setStoryClusters([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    setLoading(true);
    run();

    return () => {
      active = false;
    };
  }, [debouncedSearchQuery, selectedCategory, selectedRegion, userPreferences]);

  useEffect(() => {
    let active = true;

    const loadVibeScope = async () => {
      setLoadingVibeScope(true);
      try {
        const data = await fetchVibeScope(selectedCategory, regionPack);
        if (active) {
          setVibeScope(data);
        }
      } catch (error) {
        if (active) {
          console.error('Error loading Vibe Scope:', error);
          setVibeScope(null);
        }
      } finally {
        if (active) {
          setLoadingVibeScope(false);
        }
      }
    };

    loadVibeScope();

    return () => {
      active = false;
    };
  }, [selectedCategory, regionPack]);

  const handleCategoryChange = (categoryKey) => {
    setSelectedCategory(categoryKey);
    const category = getCategoryByKey(categoryKey);
    navigate(category.slug ? `/${category.slug}` : '/');
  };

  const filteredArticles = useMemo(
    () =>
      articles.filter((article) => {
        if (selectedSentiment === 'All') {
          return true;
        }

        return article.sentiment === selectedSentiment;
      }),
    [articles, selectedSentiment]
  );

  const topPick = filteredArticles[0];
  const topSources = feedMeta.topSources.length ? feedMeta.topSources : ['global publishers'];
  const sourcePreview = topSources.slice(0, 3);
  const activeFilterSummary = selectedSentiment === 'All' ? 'All sentiments' : `${selectedSentiment} sentiment`;

  return (
    <div className="home-page">
      <section className="hero-signal">
        <div className="hero-copy">
          <p className="hero-kicker">Live intelligence feed</p>
          <h1>
            {currentCategory.label} for {currentRegion.label}
          </h1>
          <p className="hero-description">
            Scan what is moving now, compare how stories shift across regions, and open the source story when you want
            the original context.
          </p>

          <div className="hero-pills">
            <span className="hero-pill">
              <Brain size={14} />
              AI summaries
            </span>
            <span className="hero-pill">
              <TrendingUp size={14} />
              ML-ranked relevance
            </span>
            <span className="hero-pill">
              <Radar size={14} />
              Cross-region context
            </span>
          </div>

          <div className="hero-summary-row" aria-label="Feed summary">
            <div className="hero-summary-item">
              <span className="stat-label">Live stories</span>
              <strong>{feedMeta.totalAnalyzed}</strong>
            </div>
            <div className="hero-summary-item">
              <span className="stat-label">Average fit</span>
              <strong>{feedMeta.avgRelevance}%</strong>
            </div>
            <div className="hero-summary-item">
              <span className="stat-label">Regions</span>
              <strong>{regionPack.length}</strong>
            </div>
          </div>
        </div>

        <aside className="hero-panel">
          <div className="hero-panel-card">
            <span className="panel-label">Feed brief</span>
            <p>{feedMeta.digest || 'A concise brief will appear here once the feed has enough live coverage.'}</p>
          </div>
          <div className="hero-panel-card compact">
            <span className="panel-label">Sources in view</span>
            <div className="source-stack">
              {sourcePreview.map((source) => (
                <span key={source} className="source-pill">
                  {source}
                </span>
              ))}
            </div>
          </div>
          <div className="hero-panel-card compact">
            <span className="panel-label">Current mode</span>
            <p>
              {activeFilterSummary} in {currentRegion.label}
            </p>
          </div>
        </aside>
      </section>

      <section className="live-deck">
        <div className="live-deck-copy">
          <div className="live-badge">
            <Globe2 size={14} />
            Real-time feed active
          </div>
          <h2>Signal deck</h2>
          <p>Tracking {currentCategory.description} from {currentRegion.label}. Open the source story for the full read.</p>
        </div>
        <button className={`sync-btn deck-sync ${syncing ? 'syncing' : ''}`} onClick={() => loadFeed(true)} disabled={syncing}>
          <RefreshCw size={18} className="sync-icon" />
          <span>{syncing ? 'Refreshing signals...' : 'Refresh live feed'}</span>
        </button>
      </section>

      <section className="intelligence-strip">
        <div className="search-shell">
          <Search size={18} />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search stories, companies, topics, or regions"
          />
        </div>
        <div className="digest-card">
          <span className="digest-label">AI newsroom brief</span>
          <p>{feedMeta.digest || 'Live digest will appear here as the feed refreshes.'}</p>
        </div>
      </section>

      <FilterBar
        selectedCategory={selectedCategory}
        setSelectedCategory={handleCategoryChange}
        selectedSentiment={selectedSentiment}
        setSelectedSentiment={setSelectedSentiment}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
      />

      <VibeScopePanel data={vibeScope} loading={loadingVibeScope} />

      {storyClusters.length > 0 && (
        <section className="cluster-panel">
          <div className="cluster-panel-header">
            <div>
              <p className="cluster-kicker">Story clusters</p>
              <h2>What is connected right now</h2>
            </div>
            <span className="cluster-meta">{storyClusters.length} active clusters</span>
          </div>
          <div className="cluster-grid">
            {storyClusters.map((cluster) => (
              <article key={cluster.id} className="cluster-card">
                <p className="cluster-topic">{cluster.topic}</p>
                <h3>{cluster.representativeHeadline}</h3>
                <div className="cluster-keywords">
                  {(cluster.keywords || []).slice(0, 4).map((keyword) => (
                    <span key={keyword}>{keyword}</span>
                  ))}
                </div>
                <p className="cluster-footnote">
                  {cluster.headlineCount} linked signals across {cluster.regions?.length || 1} region
                  {(cluster.regions?.length || 1) > 1 ? 's' : ''}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      <header className="home-header">
        <div className="header-title-section">
          <h2 className="page-title">Live story matrix</h2>
          <span className="ml-badge">
            <Sparkles size={14} />
            {currentCategory.label}
          </span>
        </div>
        <p className="page-subtitle">
          Your feed is tuned to <strong>{userPreferences.join(', ')}</strong> and sourced from{' '}
          <strong>{topSources.join(', ')}</strong> via <strong>{feedMeta.provider}</strong>.
        </p>
      </header>

      <div className="results-info">
        <span>
          {filteredArticles.length} stories in {currentRegion.label} after sentiment and category filtering
        </span>
        <span>{feedMeta.clusters} clusters mapped</span>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Pulling live headlines and ranking them with Vibefeed intelligence...</p>
          <span className="loading-subtitle">Fetching sources, building summaries, scoring narrative fit</span>
        </div>
      ) : filteredArticles.length > 0 ? (
        <>
          {topPick && (
            <section className="top-story-surface">
              <div className="top-story-copy">
                <p className="section-kicker">Top story</p>
                <h3>{topPick.title}</h3>
                <p>{topPick.summary}</p>
                <div className="top-story-meta">
                  <span className="top-story-chip">
                    <Sparkles size={13} />
                    {topPick.relevanceScore || 0}% fit
                  </span>
                  <span className="top-story-chip subtle">{topPick.source}</span>
                  {topPick.region && <span className="top-story-chip subtle">{String(topPick.region).toUpperCase()}</span>}
                </div>
              </div>
              <a className="top-story-link" href={topPick.url} target="_blank" rel="noreferrer">
                Open source story
                <ArrowUpRight size={16} />
              </a>
            </section>
          )}

          <div className="articles-grid">
            {filteredArticles.map((article, index) => (
              <div key={article.id} className={index < 3 ? 'featured-article' : ''}>
                {index === 0 && topPick?.relevanceScore > 85 && (
                  <div className="featured-label">
                    <Sparkles size={14} />
                    Prime signal - {topPick.relevanceScore}% fit
                  </div>
                )}
                {index === 1 && (
                  <div className="featured-label secondary">
                    <TrendingUp size={14} />
                    Momentum watch
                  </div>
                )}
                {index === 2 && (
                  <div className="featured-label tertiary">
                    <Radar size={14} />
                    Narrative shift
                  </div>
                )}
                <ArticleCard article={article} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="no-results">
          <div className="no-results-icon">
            <Search size={48} opacity={0.5} />
          </div>
          <h3>No live stories matched this filter</h3>
          <p>Try switching region, broadening sentiment, or opening a wider category.</p>
        </div>
      )}
    </div>
  );
};

export default Home;
