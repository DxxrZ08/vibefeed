import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import { listPosts } from '../controllers/postController';
import { NEWS_CATEGORIES } from '../utils/newsTaxonomy';
import './NewsDesk.css';

const PAGE_SIZE = 6;

const NewsDesk = () => {
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [posts, setPosts] = useState([]);
  const [pageCursor, setPageCursor] = useState(null);
  const [cursorTrail, setCursorTrail] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const searchQuery = searchParams.get('search')?.trim().toLowerCase() || '';
  const availableCategories = useMemo(() => NEWS_CATEGORIES.filter((category) => category.key !== 'all'), []);

  useEffect(() => {
    let mounted = true;

    const loadPosts = async () => {
      try {
        setLoading(true);
        setError('');

        const result = await listPosts({
          category: selectedCategory,
          pageSize: PAGE_SIZE,
          cursor: pageCursor,
        });

        if (!mounted) {
          return;
        }

        setPosts(result.posts);
        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
      } catch (loadError) {
        if (mounted) {
          setError(loadError.message || 'Unable to load posts.');
          setPosts([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadPosts();

    return () => {
      mounted = false;
    };
  }, [pageCursor, selectedCategory]);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setPageCursor(null);
    setCursorTrail([]);
  };

  const handleNext = () => {
    if (!nextCursor) {
      return;
    }

    setCursorTrail((previous) => [...previous, pageCursor]);
    setPageCursor(nextCursor);
  };

  const handlePrevious = () => {
    const updated = [...cursorTrail];
    const previousCursor = updated.pop() ?? null;
    setCursorTrail(updated);
    setPageCursor(previousCursor);
  };

  const visiblePosts = useMemo(() => {
    if (!searchQuery) {
      return posts;
    }

    return posts.filter((post) =>
      `${post.title} ${post.content} ${post.category} ${post.authorName || ''}`.toLowerCase().includes(searchQuery)
    );
  }, [posts, searchQuery]);

  return (
    <div className="news-desk-page">
      <section className="news-desk-hero">
        <div>
          <p className="desk-kicker">Firestore Feed</p>
          <h1>Editorial news desk</h1>
          <p className="desk-description">
            This feed is powered directly by your Firebase `posts` collection, with category filtering and pagination.
          </p>
        </div>
        <div className="desk-chip">
          <Newspaper size={18} />
          Live from Firestore
        </div>
      </section>

      <section className="desk-filters">
        <button
          type="button"
          className={`desk-filter ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => handleCategoryChange('all')}
        >
          All
        </button>
        {availableCategories.map((category) => (
          <button
            key={category.key}
            type="button"
            className={`desk-filter ${selectedCategory === category.key ? 'active' : ''}`}
            onClick={() => handleCategoryChange(category.key)}
          >
            {category.label}
          </button>
        ))}
      </section>

      {searchQuery && (
        <div className="desk-empty-state">
          <p>Showing Firestore posts matching "{searchParams.get('search')}".</p>
        </div>
      )}

      {loading ? (
        <div className="desk-empty-state">
          <p>Loading Firestore posts...</p>
        </div>
      ) : error ? (
        <div className="desk-empty-state error">
          <p>{error}</p>
        </div>
      ) : visiblePosts.length === 0 ? (
        <div className="desk-empty-state">
          <p>No posts found for this category or search yet.</p>
        </div>
      ) : (
        <>
          <div className="desk-grid">
            {visiblePosts.map((post) => (
              <article key={post.id} className="desk-card">
                <div className="desk-card-image">
                  <img
                    src={post.imageUrl || 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=80'}
                    alt={post.title}
                  />
                </div>
                <div className="desk-card-body">
                  <div className="desk-meta">
                    <span>{post.category}</span>
                    <span>•</span>
                    <span>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Just now'}</span>
                  </div>
                  <h2>{post.title}</h2>
                  <p>{post.content}</p>
                  <div className="desk-author">By {post.authorName || 'Admin Desk'}</div>
                </div>
              </article>
            ))}
          </div>

          <div className="desk-pagination">
            <button type="button" onClick={handlePrevious} disabled={cursorTrail.length === 0}>
              <ChevronLeft size={16} />
              Previous
            </button>
            <button type="button" onClick={handleNext} disabled={!hasMore}>
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default NewsDesk;
