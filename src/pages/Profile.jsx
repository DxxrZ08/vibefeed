import React, { useEffect, useMemo, useState } from 'react';
import { Globe2, Save, Sparkles, User2 } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useBookmarks } from '../context/BookmarksContext';
import { NEWS_CATEGORIES, NEWS_REGIONS } from '../utils/api';
import './Profile.css';

const PROFILE_SAVE_TIMEOUT_MS = 5000;

const Profile = () => {
  const { currentUser, userData, refreshUserData } = useAuth();
  const { bookmarks, bookmarkCount, isOnline } = useBookmarks();
  const [name, setName] = useState('');
  const [primaryRegion, setPrimaryRegion] = useState('us');
  const [interests, setInterests] = useState([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const editableCategories = useMemo(
    () => NEWS_CATEGORIES.filter((category) => category.key !== 'all'),
    []
  );

  const readingFingerprint = useMemo(() => {
    const sourceCounts = bookmarks.reduce((acc, article) => {
      const key = article.source || 'Unknown Source';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const keywordCounts = bookmarks.reduce((acc, article) => {
      (article.keywords || []).forEach((keyword) => {
        acc[keyword] = (acc[keyword] || 0) + 1;
      });
      return acc;
    }, {});

    return {
      topSource: Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Still learning',
      topKeywords: Object.entries(keywordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([keyword]) => keyword),
    };
  }, [bookmarks]);

  useEffect(() => {
    if (!currentUser) return;

    setName(userData?.name || currentUser.displayName || '');
    setPrimaryRegion(userData?.regions?.[0] || 'us');
    setInterests(userData?.interests || []);
  }, [currentUser, userData]);

  const toggleInterest = (interestKey) => {
    setInterests((previous) =>
      previous.includes(interestKey)
        ? previous.filter((interest) => interest !== interestKey)
        : [...previous, interestKey]
    );
  };

  const handleSave = async () => {
    if (!currentUser) return;

    try {
      setSaving(true);
      setStatus('');

      const displayName = name.trim() || currentUser.displayName || 'Reader';
      const profilePayload = {
        name: displayName,
        regions: [primaryRegion],
        interests,
        onboardingCompleted: true,
      };

      await updateProfile(auth.currentUser, { displayName });

      const userRef = doc(db, 'users', currentUser.uid);
      await Promise.race([
        setDoc(userRef, profilePayload, { merge: true }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile save timed out.')), PROFILE_SAVE_TIMEOUT_MS)
        ),
      ]);

      await Promise.race([
        refreshUserData(),
        new Promise((resolve) => setTimeout(() => resolve(null), PROFILE_SAVE_TIMEOUT_MS)),
      ]);
      setStatus('Profile updated successfully.');
    } catch (error) {
      console.error('Error saving profile:', error);
      setStatus('Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="profile-page">
      <section className="profile-hero">
        <div className="profile-avatar">
          <User2 size={32} />
        </div>
        <div className="profile-hero-copy">
          <p className="profile-kicker">Account</p>
          <h1>{name || currentUser.displayName || 'Reader'}</h1>
          <p>{currentUser.email}</p>
        </div>
        <div className="profile-summary-card">
          <span>Saved stories</span>
          <strong>{bookmarkCount}</strong>
        </div>
      </section>

      <section className="profile-grid">
        <div className="profile-card">
          <h2>Personal details</h2>
          <label className="profile-label">
            Display name
            <input value={name} onChange={(event) => setName(event.target.value)} className="profile-input" />
          </label>

          <label className="profile-label">
            Primary region
            <select
              value={primaryRegion}
              onChange={(event) => setPrimaryRegion(event.target.value)}
              className="profile-input"
            >
              {NEWS_REGIONS.map((region) => (
                <option key={region.value} value={region.value}>
                  {region.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="profile-card">
          <h2>Interest engine</h2>
          <p className="profile-helper">Pick the categories that should drive your personalized feed.</p>
          <div className="interest-grid">
            {editableCategories.map((category) => (
              <button
                key={category.key}
                type="button"
                onClick={() => toggleInterest(category.key)}
                className={`interest-chip ${interests.includes(category.key) ? 'active' : ''}`}
              >
                <Sparkles size={14} />
                {category.label}
              </button>
            ))}
          </div>
        </div>

        <div className="profile-card">
          <h2>Reading fingerprint</h2>
          <p className="profile-helper">A simple live profile built from your saved stories and preferences.</p>
          <div className="interest-grid">
            <span className="interest-chip active">
              <Globe2 size={14} />
              {NEWS_REGIONS.find((region) => region.value === primaryRegion)?.label || 'United States'}
            </span>
            <span className="interest-chip active">
              <Sparkles size={14} />
              {readingFingerprint.topSource}
            </span>
            <span className={`interest-chip ${isOnline ? 'active' : ''}`}>
              <User2 size={14} />
              {isOnline ? 'Sync online' : 'Offline mode'}
            </span>
          </div>
          <div className="interest-grid profile-keywords">
            {(readingFingerprint.topKeywords.length ? readingFingerprint.topKeywords : interests).slice(0, 4).map((item) => (
              <span key={item} className="interest-chip active">
                <Sparkles size={14} />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="profile-actions">
        {status && <p className="profile-status">{status}</p>}
        <button type="button" onClick={handleSave} disabled={saving} className="profile-save-btn">
          <Save size={16} />
          {saving ? 'Saving...' : 'Save profile'}
        </button>
      </div>
    </div>
  );
};

export default Profile;
