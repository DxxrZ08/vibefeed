import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Pencil, Plus, Shield, Trash2, Users } from 'lucide-react';
import { createManagedPost, deleteManagedPost, listPosts, updateManagedPost } from '../controllers/postController';
import { deleteManagedUser } from '../controllers/userController';
import { watchDashboardStats } from '../controllers/dashboardController';
import { useAuth } from '../context/AuthContext';
import { NEWS_CATEGORIES } from '../utils/newsTaxonomy';
import './AdminDashboard.css';

const PAGE_SIZE = 5;
const emptyForm = {
  title: '',
  content: '',
  category: 'general',
  imageUrl: '',
};

const AdminDashboard = () => {
  const { currentUser, userData, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    categoriesCount: {},
    recentPosts: [],
    usersList: [],
  });
  const [posts, setPosts] = useState([]);
  const [pageCursor, setPageCursor] = useState(null);
  const [cursorTrail, setCursorTrail] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formState, setFormState] = useState(emptyForm);
  const [editingPostId, setEditingPostId] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [saving, setSaving] = useState(false);

  const editableCategories = useMemo(() => NEWS_CATEGORIES.filter((category) => category.key !== 'all'), []);

  useEffect(() => {
    if (!isAdmin) {
      return undefined;
    }

    const unsubscribe = watchDashboardStats(
      { userData },
      (nextStats) => {
        setStats(nextStats);
      },
      (statsError) => {
        setError(statsError.message || 'Unable to load dashboard stats.');
      }
    );

    return unsubscribe;
  }, [isAdmin, userData]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let active = true;

    const loadPosts = async () => {
      try {
        setLoadingPosts(true);
        setError('');

        const result = await listPosts({
          category: categoryFilter,
          pageSize: PAGE_SIZE,
          cursor: pageCursor,
        });

        if (!active) {
          return;
        }

        setPosts(result.posts);
        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'Unable to load posts.');
          setPosts([]);
        }
      } finally {
        if (active) {
          setLoadingPosts(false);
        }
      }
    };

    loadPosts();

    return () => {
      active = false;
    };
  }, [categoryFilter, isAdmin, pageCursor]);

  const resetPaging = () => {
    setPageCursor(null);
    setCursorTrail([]);
    setNextCursor(null);
    setHasMore(false);
  };

  const handleChange = (field, value) => {
    setFormState((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleEdit = (post) => {
    setEditingPostId(post.id);
    setFormState({
      title: post.title,
      content: post.content,
      category: post.category,
      imageUrl: post.imageUrl || '',
    });
    setStatus('');
    setError('');
  };

  const handleDelete = async (postId) => {
    try {
      setError('');
      setStatus('');
      await deleteManagedPost({ postId, userData });
      setStatus('Post deleted successfully.');
      resetPaging();
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete post.');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      if (!window.confirm("Are you sure you want to delete this user document? This action cannot be undone.")) return;
      setError('');
      setStatus('');
      await deleteManagedUser({ userId, userData });
      setStatus('User deleted successfully.');
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete user.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');
      setStatus('');

      if (editingPostId) {
        await updateManagedPost({
          postId: editingPostId,
          input: formState,
          userData,
        });
        setStatus('Post updated successfully.');
      } else {
        await createManagedPost({
          input: formState,
          currentUser,
          userData,
        });
        setStatus('Post created successfully.');
      }

      setFormState(emptyForm);
      setEditingPostId(null);
      resetPaging();
    } catch (submitError) {
      setError(submitError.message || 'Unable to save post.');
    } finally {
      setSaving(false);
    }
  };

  const categorySummary = Object.entries(stats.categoriesCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  if (!isAdmin) {
    return (
      <div className="admin-dashboard">
        <div className="admin-empty">
          <Shield size={36} />
          <h1>Admin access required</h1>
          <p>Your account role is not admin yet. Add your email to `VITE_ADMIN_EMAILS` or promote the Firestore user role.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <section className="admin-hero">
        <div>
          <p className="admin-kicker">Firebase Admin</p>
          <h1>Content and dashboard control</h1>
          <p>Manage your Firestore `posts` collection and monitor the app in real time.</p>
        </div>
      </section>

      <section className="admin-stats-grid">
        <article className="admin-stat-card">
          <Users size={20} />
          <div>
            <span>Total users</span>
            <strong>{stats.totalUsers}</strong>
          </div>
        </article>
        <article className="admin-stat-card">
          <BarChart3 size={20} />
          <div>
            <span>Total posts</span>
            <strong>{stats.totalPosts}</strong>
          </div>
        </article>
        <article className="admin-stat-card category-card">
          <div>
            <span>Top categories</span>
            <div className="category-summary">
              {categorySummary.length > 0 ? (
                categorySummary.map(([category, count]) => (
                  <span key={category}>
                    {category}: {count}
                  </span>
                ))
              ) : (
                <span>No categories yet</span>
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="admin-layout">
        <div className="admin-form-card">
          <div className="admin-section-header">
            <h2>{editingPostId ? 'Edit post' : 'Create post'}</h2>
            {editingPostId && (
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setEditingPostId(null);
                  setFormState(emptyForm);
                }}
              >
                Cancel edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="admin-form">
            <label>
              Title
              <input value={formState.title} onChange={(event) => handleChange('title', event.target.value)} />
            </label>
            <label>
              Content
              <textarea
                rows="7"
                value={formState.content}
                onChange={(event) => handleChange('content', event.target.value)}
              />
            </label>
            <label>
              Category
              <select value={formState.category} onChange={(event) => handleChange('category', event.target.value)}>
                {editableCategories.map((category) => (
                  <option key={category.key} value={category.key}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Image URL
              <input value={formState.imageUrl} onChange={(event) => handleChange('imageUrl', event.target.value)} />
            </label>

            {error && <p className="admin-feedback error">{error}</p>}
            {status && <p className="admin-feedback success">{status}</p>}

            <button type="submit" className="primary-btn" disabled={saving}>
              <Plus size={16} />
              {saving ? 'Saving...' : editingPostId ? 'Update post' : 'Create post'}
            </button>
          </form>
        </div>

        <div className="admin-posts-card">
          <div className="admin-section-header">
            <h2>Manage posts</h2>
            <select
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                resetPaging();
              }}
            >
              <option value="all">All categories</option>
              {editableCategories.map((category) => (
                <option key={category.key} value={category.key}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {loadingPosts ? (
            <div className="admin-empty">Loading posts...</div>
          ) : posts.length === 0 ? (
            <div className="admin-empty">No posts found.</div>
          ) : (
            <div className="admin-posts-list">
              {posts.map((post) => (
                <article key={post.id} className="managed-post-card">
                  <div className="managed-post-copy">
                    <div className="managed-post-meta">
                      <span>{post.category}</span>
                      <span>•</span>
                      <span>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Just now'}</span>
                    </div>
                    <h3>{post.title}</h3>
                    <p>{post.content}</p>
                  </div>
                  <div className="managed-post-actions">
                    <button type="button" className="icon-btn" onClick={() => handleEdit(post)}>
                      <Pencil size={16} />
                    </button>
                    <button type="button" className="icon-btn danger" onClick={() => handleDelete(post.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="admin-pagination">
            <button
              type="button"
              className="ghost-btn"
              disabled={cursorTrail.length === 0}
              onClick={() => {
                const updated = [...cursorTrail];
                const previousCursor = updated.pop() ?? null;
                setCursorTrail(updated);
                setPageCursor(previousCursor);
              }}
            >
              Previous
            </button>
            <button
              type="button"
              className="ghost-btn"
              disabled={!hasMore}
              onClick={() => {
                if (!nextCursor) {
                  return;
                }

                setCursorTrail((previous) => [...previous, pageCursor]);
                setPageCursor(nextCursor);
              }}
            >
              Next
            </button>
          </div>
        </div>

        <div className="admin-users-card admin-posts-card" style={{ marginTop: '2rem' }}>
          <div className="admin-section-header">
            <h2>Manage users</h2>
          </div>
          
          {!stats.usersList?.length ? (
            <div className="admin-empty">No users found.</div>
          ) : (
            <div className="admin-posts-list">
              {stats.usersList.map((user) => (
                <article key={user.id} className="managed-post-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="managed-post-copy">
                    <div className="managed-post-meta">
                      <span>{user.role || 'user'}</span>
                      <span>•</span>
                      <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown date'}</span>
                    </div>
                    <h3 style={{ margin: '4px 0', fontSize: '1rem' }}>{user.name || 'Anonymous User'}</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>{user.email || 'No email'}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b' }}>ID: {user.id}</p>
                  </div>
                  <div className="managed-post-actions">
                    <button 
                      type="button" 
                      className="icon-btn danger" 
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={user.email === currentUser?.email}
                      title={user.email === currentUser?.email ? "Cannot delete yourself" : "Delete user document"}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
