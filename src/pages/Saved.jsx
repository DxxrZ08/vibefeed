import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBookmarks } from '../context/BookmarksContext';
import { useAuth } from '../context/AuthContext';
import ArticleCard from '../components/ArticleCard';
import { Bookmark, Newspaper, ArrowRight, Globe2, Layers3, Sparkles } from 'lucide-react';
import './Saved.css';

const Saved = () => {
  const { bookmarks, loading } = useBookmarks();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const topSource = bookmarks.reduce((acc, article) => {
    const key = article.source || 'Unknown Source';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const topCategory = bookmarks.reduce((acc, article) => {
    const key = article.category || 'General';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const dominantSource = Object.entries(topSource).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None yet';
  const dominantCategory = Object.entries(topCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None yet';

  if (!currentUser) {
    return (
      <div className="saved-page">
        <div className="saved-empty">
          <div className="empty-icon">
            <Bookmark size={48} strokeWidth={1.5} />
          </div>
          <h2 className="empty-title">Sign in to Save Articles</h2>
          <p className="empty-description">
            Create an account or sign in to save articles and read them later.
          </p>
          <div className="empty-actions">
            <Link to="/login" className="empty-btn primary">
              Sign In
            </Link>
            <Link to="/signup" className="empty-btn secondary">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="saved-page">
        <div className="loading-spinner">
          <p>Loading your saved articles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="saved-page">
      <header className="saved-header">
        <div className="header-content">
          <div className="header-icon">
            <Bookmark size={28} strokeWidth={2} />
          </div>
          <div className="header-text">
            <h1 className="page-title">Saved Articles</h1>
            <p className="page-subtitle">
              {bookmarks.length === 0
                ? 'Save articles to read later'
                : `${bookmarks.length} article${bookmarks.length !== 1 ? 's' : ''} saved`}
            </p>
          </div>
        </div>
      </header>

      {bookmarks.length > 0 && (
        <section className="profile-grid saved-insights">
          <article className="profile-card">
            <h2>Collection signal</h2>
            <p className="profile-helper">Your saved library is already shaping into a reading fingerprint.</p>
            <div className="interest-grid">
              <span className="interest-chip active">
                <Sparkles size={14} />
                {bookmarks.length} saved
              </span>
              <span className="interest-chip active">
                <Layers3 size={14} />
                {dominantCategory}
              </span>
              <span className="interest-chip active">
                <Globe2 size={14} />
                {dominantSource}
              </span>
            </div>
          </article>
        </section>
      )}

      {bookmarks.length > 0 ? (
        <div className="articles-grid">
          {bookmarks.map(article => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <div className="saved-empty">
          <div className="empty-icon">
            <Newspaper size={48} strokeWidth={1.5} />
          </div>
          <h2 className="empty-title">No Saved Articles Yet</h2>
          <p className="empty-description">
            Browse articles and click the bookmark icon to save them for later reading.
          </p>
          <button onClick={() => navigate('/')} className="empty-btn primary">
            <span>Browse Articles</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Saved;
