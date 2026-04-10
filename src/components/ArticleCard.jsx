import React, { useState } from 'react';
import { ArrowUpRight, Bookmark, Clock3, MapPinned, Sparkles, Star, Zap } from 'lucide-react';
import { useBookmarks } from '../context/BookmarksContext';
import { useAuth } from '../context/AuthContext';
import './ArticleCard.css';

const buildStableMatch = (article) => {
  if (article.relevanceScore) {
    return article.relevanceScore;
  }

  const source = `${article.title || ''}${article.source || ''}${article.region || ''}`;
  const hash = [...source].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return 72 + (hash % 18);
};

const ArticleCard = ({ article }) => {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { currentUser } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  const {
    id,
    title,
    image,
    summary,
    source,
    date,
    sentiment,
    mlTags,
    url,
    category,
    region,
    topic,
    breakingScore,
    freshnessScore,
  } = article;

  const bookmarked = isBookmarked(id);
  const matchPercentage = buildStableMatch(article);

  const getSentimentClass = (currentSentiment) => {
    switch (currentSentiment?.toLowerCase()) {
      case 'positive':
        return 'sentiment-pos';
      case 'negative':
        return 'sentiment-neg';
      case 'neutral':
      default:
        return 'sentiment-neu';
    }
  };

  const handleBookmarkClick = (event) => {
    event.stopPropagation();
    event.preventDefault();

    if (currentUser) {
      void toggleBookmark(article);
    }
  };

  return (
    <article className="article-card interactive-surface" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div className="article-image-container">
        <img src={image} alt={title} className="article-image" loading="lazy" />
        <div className="image-gradient" />

        <div className="badges-container">
          <span className={`sentiment-badge ${getSentimentClass(sentiment)}`}>{sentiment}</span>
          {currentUser && matchPercentage > 88 && (
            <span className="ml-match-badge">
              <Sparkles size={12} />
              {matchPercentage}% Match
            </span>
          )}
        </div>

        {currentUser && (
          <div className="relevance-score">
            <Star size={14} fill="#fbbf24" />
            <span>{matchPercentage}%</span>
          </div>
        )}

        {currentUser && (
          <button
            className={`bookmark-btn ${bookmarked ? 'bookmarked' : ''} ${isHovered ? 'visible' : ''}`}
            onClick={handleBookmarkClick}
            aria-label={bookmarked ? 'Remove from saved' : 'Save article'}
            title={bookmarked ? 'Remove from saved' : 'Save article'}
          >
            <Bookmark size={18} fill={bookmarked ? 'currentColor' : 'none'} strokeWidth={bookmarked ? 2.5 : 2} />
          </button>
        )}
      </div>

      <div className="article-content">
        <div className="article-meta">
          <span className="article-source">{source}</span>
          <span className="meta-pill">
            <Clock3 size={13} />
            <time className="article-date">{new Date(date).toLocaleDateString()}</time>
          </span>
          {region && (
            <span className="meta-pill">
              <MapPinned size={13} />
              <span className="article-region">{String(region).toUpperCase()}</span>
            </span>
          )}
        </div>

        <h2 className="article-title">{title}</h2>
        <p className="article-summary">{summary}</p>

        <div className="article-footer">
          {(mlTags || ['AI Matched']).slice(0, 2).map((tag) => (
            <span key={tag} className="ml-tag">
              <Zap size={12} />
              {tag}
            </span>
          ))}
          {category && <span className="category-tag">{category}</span>}
          {topic && <span className="category-tag subtle">{topic}</span>}
          {breakingScore > 90 && <span className="category-tag subtle">Breaking</span>}
          {freshnessScore > 85 && <span className="category-tag subtle">Fresh</span>}
        </div>

        {isHovered && article.keywords && article.keywords.length > 0 && (
          <div className="article-keywords">
            <span className="keywords-label">Signal map:</span>
            {article.keywords.slice(0, 4).map((keyword) => (
              <span key={keyword} className="keyword-tag">
                {keyword}
              </span>
            ))}
          </div>
        )}

        <a className="read-more-btn" href={url} target="_blank" rel="noreferrer">
          Open source story
          <ArrowUpRight size={16} />
        </a>
      </div>
    </article>
  );
};

export default ArticleCard;
