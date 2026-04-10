import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings, Sparkles, TrendingUp, Brain, Zap, BarChart3 } from 'lucide-react';
import ArticleCard from '../components/ArticleCard';
import { fetchNewsBundle } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import './ForYou.css';

const FIRESTORE_TIMEOUT_MS = 5000;

const ForYou = () => {
  const { currentUser, userData } = useAuth();
  const [userPreferences, setUserPreferences] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [mlStats, setMlStats] = useState({
    avgRelevance: 0,
    totalAnalyzed: 0,
    keywords: [],
    processingTime: 0
  });

  const availableRegions = [
    { label: 'United States', value: 'us' },
    { label: 'United Kingdom', value: 'gb' },
    { label: 'India', value: 'in' },
    { label: 'Australia', value: 'au' },
    { label: 'France', value: 'fr' }
  ];

  // Fetch user preferences from Firestore
  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (!currentUser) {
        setLoadingPreferences(false);
        return;
      }

      try {
        const fallbackPreferences = {
          interests: userData?.interests || userData?.preferences || [],
          regions: userData?.regions || ['us'],
          name: userData?.name || currentUser.displayName || 'Reader',
        };

        const userDoc = await Promise.race([
          getDoc(doc(db, 'users', currentUser.uid)),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firestore user preferences timed out.')), FIRESTORE_TIMEOUT_MS)
          ),
        ]);

        if (userDoc.exists()) {
          const firestoreUserData = userDoc.data();
          setUserPreferences({
            interests: firestoreUserData.interests || firestoreUserData.preferences || fallbackPreferences.interests,
            regions: firestoreUserData.regions || fallbackPreferences.regions,
            name: firestoreUserData.name || fallbackPreferences.name,
          });
        } else {
          setUserPreferences(fallbackPreferences);
        }
      } catch (error) {
        console.error('Error fetching user preferences:', error);
        setUserPreferences({
          interests: userData?.interests || userData?.preferences || [],
          regions: userData?.regions || ['us'],
          name: userData?.name || currentUser.displayName || 'Reader',
        });
      }
      setLoadingPreferences(false);
    };

    fetchUserPreferences();
  }, [currentUser, userData]);

  // Fetch articles based on user preferences with ML
  useEffect(() => {
    const fetchPersonalizedArticles = async () => {
      if (loadingPreferences) return;

      setLoading(true);
      const startTime = performance.now();

      try {
        if (!userPreferences || userPreferences.interests.length === 0) {
          setArticles([]);
          setLoading(false);
          return;
        }

        // Fetch articles using ML-powered API
        const primaryRegion = userPreferences.regions?.[0] || 'us';
        const bundle = await fetchNewsBundle('all', primaryRegion, userPreferences.interests);
        const data = bundle.articles;

        // Calculate ML stats
        const processingTime = Math.round(performance.now() - startTime);
        const avgRel = data.length
          ? data.reduce((sum, a) => sum + (a.relevanceScore || 0), 0) / data.length
          : 0;

        // Extract all keywords
        const allKeywords = data.flatMap(a => a.keywords || []).slice(0, 10);

        setMlStats({
          avgRelevance: Math.round(avgRel),
          totalAnalyzed: data.length,
          keywords: [...new Set(allKeywords)],
          processingTime
        });

        setArticles(data);
      } catch (error) {
        console.error('Error fetching personalized articles:', error);
        setArticles([]);
      }

      setLoading(false);
    };

    fetchPersonalizedArticles();
  }, [userPreferences, loadingPreferences]);

  // Show login prompt if not logged in
  if (!loadingPreferences && !currentUser) {
    return (
      <div className="for-you-page">
        <div className="fy-prompt-container">
          <div className="fy-prompt-icon">
            <Sparkles size={48} />
          </div>
          <h2>Personalize Your Feed</h2>
          <p>Sign in to get AI-curated news tailored to your interests and preferences.</p>
          <div className="fy-prompt-actions">
            <Link to="/login" className="fy-btn fy-btn-primary">
              Sign In
            </Link>
            <Link to="/signup" className="fy-btn fy-btn-secondary">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while fetching preferences
  if (loadingPreferences) {
    return (
      <div className="for-you-page">
        <div className="loading-spinner">
          <p>Loading your preferences...</p>
        </div>
      </div>
    );
  }

  // Show prompt if user has no preferences set
  if (!userPreferences || userPreferences.interests.length === 0) {
    return (
      <div className="for-you-page">
        <div className="fy-prompt-container">
          <div className="fy-prompt-icon">
            <Settings size={48} />
          </div>
          <h2>Set Your Preferences</h2>
          <p>Select your interests and preferred regions to get a personalized news feed curated by our ML algorithms.</p>
          <Link to="/onboarding" className="fy-btn fy-btn-primary">
            <Settings size={18} />
            Set Preferences
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="for-you-page">
      {/* ML Stats Banner */}
      <div className="ml-stats-banner">
        <div className="ml-stat-item">
          <Brain size={20} />
          <div>
            <span className="ml-stat-value">{mlStats.totalAnalyzed}</span>
            <span className="ml-stat-label">Articles Analyzed</span>
          </div>
        </div>
        <div className="ml-stat-item">
          <TrendingUp size={20} />
          <div>
            <span className="ml-stat-value">{mlStats.avgRelevance}%</span>
            <span className="ml-stat-label">Avg Relevance</span>
          </div>
        </div>
        <div className="ml-stat-item">
          <Zap size={20} />
          <div>
            <span className="ml-stat-value">{mlStats.processingTime}ms</span>
            <span className="ml-stat-label">ML Processing</span>
          </div>
        </div>
      </div>

      {/* Personalized Header */}
      <header className="fy-header">
        <div className="fy-header-content">
          <div className="fy-title-section">
            <div className="fy-brand">
              <Sparkles className="fy-sparkle-icon" size={24} />
              <h1 className="fy-page-title">For You</h1>
            </div>
            <p className="fy-subtitle">
              AI-curated news based on your interests
            </p>
          </div>
          <Link to="/onboarding" className="fy-edit-btn">
            <Settings size={18} />
            <span>Edit Preferences</span>
          </Link>
        </div>

        {/* Interest Tags */}
        <div className="fy-tags-container">
          <div className="fy-tags-label">Your interests:</div>
          <div className="fy-tags">
            {userPreferences.interests.map((interest, index) => (
              <span key={index} className="fy-tag">
                {interest}
              </span>
            ))}
          </div>
          {userPreferences.regions && userPreferences.regions.length > 0 && (
            <div className="fy-regions">
              <TrendingUp size={14} className="fy-region-icon" />
              <span className="fy-regions-text">
                Regions: {userPreferences.regions.map(r =>
                  availableRegions.find(region => region.value === r)?.label || r
                ).join(', ')}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Articles Grid */}
      {loading ? (
        <div className="fy-loading-container">
          <div className="fy-loading-spinner"></div>
          <p>Running ML algorithms...</p>
          <div className="fy-loading-steps">
            <span>✓ Keyword extraction</span>
            <span>✓ Sentiment analysis</span>
            <span>→ Calculating relevance...</span>
          </div>
        </div>
      ) : articles.length > 0 ? (
        <>
          <div className="fy-results-header">
            <BarChart3 size={18} />
            <span>Ranked by ML relevance to your interests</span>
          </div>
          <div className="articles-grid">
            {articles.map((article, index) => (
              <div key={article.id || index} className={index < 3 ? 'fy-featured' : ''}>
                {index < 3 && (
                  <div className={`fy-rank-badge rank-${index + 1}`}>
                    #{index + 1} Match
                  </div>
                )}
                <ArticleCard article={article} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="no-results">
          <p>No articles found matching your preferences. Try expanding your interests.</p>
          <Link to="/onboarding" className="fy-btn fy-btn-secondary">
            Update Preferences
          </Link>
        </div>
      )}
    </div>
  );
};

export default ForYou;
