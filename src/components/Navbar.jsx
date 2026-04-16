import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  Bookmark,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Radio,
  Search,
  Sun,
  User,
  X,
} from 'lucide-react';
import { ThemeContext } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useBookmarks } from '../context/BookmarksContext';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { currentUser, logout, isAdmin, userData } = useAuth();
  const { bookmarkCount } = useBookmarks();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const profileMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const navLinks = useMemo(
    () => [
      { name: 'World', path: '/world' },
      { name: 'Technology', path: '/technology' },
      { name: 'Business', path: '/business' },
      { name: 'Science', path: '/science' },
      { name: 'Desk', path: '/desk' },
      { name: 'For You', path: '/for-you' },
    ],
    []
  );

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleOutsideClick = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleShortcut = (event) => {
      const isMetaShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (isMetaShortcut) {
        event.preventDefault();
        const input = document.querySelector('.navbar-search-input');
        if (input) {
          input.focus();
        }
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    const nextQuery = searchQuery.trim();
    navigate(nextQuery ? `/?search=${encodeURIComponent(nextQuery)}` : '/');
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  };

  const displayName = userData?.name || currentUser?.displayName || 'Reader';
  const avatarLabel = displayName.trim().charAt(0).toUpperCase() || 'R';

  return (
    <nav className="navbar glass">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand" aria-label="VibeFeed home">
          <span className="brand-mark">
            <Radio size={20} className="brand-logo-icon" />
          </span>
          <span>
            <span className="brand-highlight">Vibe</span>Feed
          </span>
        </Link>

        <div className="navbar-links desktop-only">
          {navLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {link.name}
            </NavLink>
          ))}
        </div>

        <div className="navbar-actions">
          <form onSubmit={handleSearch} className="search-form desktop-only" role="search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search signals, stories, topics"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="search-input navbar-search-input"
              aria-label="Search stories"
            />
            <span className="search-shortcut">Ctrl/Cmd+K</span>
          </form>

          <div className="action-cluster desktop-only">
            <button
              type="button"
              onClick={toggleTheme}
              className="icon-button nav-action-btn"
              aria-label="Toggle theme"
              data-tooltip={theme === 'light' ? 'Dark mode' : 'Light mode'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {currentUser && (
              <>
                <button
                  type="button"
                  className="icon-button nav-action-btn"
                  data-tooltip="Saved stories"
                  onClick={() => navigate('/saved')}
                  aria-label="Saved stories"
                >
                  <Bookmark size={20} fill={bookmarkCount > 0 ? 'currentColor' : 'none'} />
                  {bookmarkCount > 0 && <span className="bookmark-count">{bookmarkCount > 99 ? '99+' : bookmarkCount}</span>}
                </button>

                <button
                  type="button"
                  className="icon-button nav-action-btn"
                  data-tooltip="Intelligence alerts"
                  onClick={() => navigate('/for-you')}
                  aria-label="Open alerts"
                >
                  <Bell size={20} />
                  <span className="notification-dot" />
                </button>

                <div className="profile-menu-wrap" ref={profileMenuRef}>
                  <button
                    type="button"
                    className="profile-trigger"
                    onClick={() => setIsProfileMenuOpen((previous) => !previous)}
                    aria-expanded={isProfileMenuOpen}
                    aria-haspopup="menu"
                  >
                    <span className="profile-avatar">{avatarLabel}</span>
                    <span className="profile-copy">
                      <strong>{displayName}</strong>
                      <span>{isAdmin ? 'Admin access' : 'Personal feed'}</span>
                    </span>
                    <ChevronDown size={16} className={`profile-chevron ${isProfileMenuOpen ? 'open' : ''}`} />
                  </button>

                  {isProfileMenuOpen && (
                    <div className="profile-menu surface-card" role="menu">
                      <button type="button" className="profile-menu-item" onClick={() => navigate('/profile')}>
                        <User size={18} />
                        <span>Profile</span>
                      </button>
                      {isAdmin && (
                        <button type="button" className="profile-menu-item" onClick={() => navigate('/admin')}>
                          <LayoutDashboard size={18} />
                          <span>Dashboard</span>
                        </button>
                      )}
                      <button type="button" className="profile-menu-item danger" onClick={handleLogout}>
                        <LogOut size={18} />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {!currentUser && (
              <Link to="/login" className="nav-auth-btn text-btn">
                Sign In
              </Link>
            )}
          </div>

          <button
            type="button"
            className="mobile-menu-btn mobile-only icon-button"
            onClick={() => setIsMobileMenuOpen((previous) => !previous)}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav-panel"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="mobile-menu-backdrop" onClick={() => setIsMobileMenuOpen(false)}>
          <div
            className="mobile-menu surface-card"
            id="mobile-nav-panel"
            ref={mobileMenuRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-menu-header">
              <div>
                <p className="mobile-menu-kicker">Navigation</p>
                <h2>Find stories faster</h2>
              </div>
              <button
                type="button"
                className="mobile-menu-close icon-button"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSearch} className="mobile-search-form" role="search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search signals, stories, topics"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="search-input"
                aria-label="Search stories"
              />
              <button type="submit" className="mobile-search-submit">
                Go
              </button>
            </form>
            <p className="mobile-search-hint">Shortcut: Ctrl/Cmd+K</p>

            <div className="mobile-nav-stack">
              {navLinks.map((link) => (
                <NavLink
                  key={link.name}
                  to={link.path}
                  className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span>{link.name}</span>
                  <span className="mobile-nav-needle">Open</span>
                </NavLink>
              ))}
            </div>

            {currentUser ? (
              <div className="mobile-account-block">
                <div className="mobile-account-label">Account</div>
                <button
                  type="button"
                  className="mobile-nav-link with-icon"
                  onClick={() => {
                    navigate('/saved');
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <Bookmark size={18} />
                  <span>Saved stories</span>
                  {bookmarkCount > 0 && <span className="bookmark-count mobile-count">{bookmarkCount}</span>}
                </button>
                <button
                  type="button"
                  className="mobile-nav-link with-icon"
                  onClick={() => {
                    navigate('/profile');
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <User size={18} />
                  <span>Profile</span>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    className="mobile-nav-link with-icon"
                    onClick={() => {
                      navigate('/admin');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <LayoutDashboard size={18} />
                    <span>Dashboard</span>
                  </button>
                )}
                <button type="button" className="mobile-nav-link with-icon danger" onClick={handleLogout}>
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link to="/login" className="mobile-nav-link mobile-auth-link" onClick={() => setIsMobileMenuOpen(false)}>
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
