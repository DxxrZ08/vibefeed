import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import './Onboarding.css';

const INTERESTS = [
  { id: 'technology', label: 'Technology', icon: '💻' },
  { id: 'business', label: 'Business', icon: '💼' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { id: 'science', label: 'Science', icon: '🔬' },
  { id: 'health', label: 'Health', icon: '🏥' },
  { id: 'politics', label: 'Politics', icon: '🏛️' },
];

const REGIONS = [
  { id: 'us', label: 'United States', flag: '🇺🇸' },
  { id: 'uk', label: 'United Kingdom', flag: '🇬🇧' },
  { id: 'in', label: 'India', flag: '🇮🇳' },
  { id: 'au', label: 'Australia', flag: '🇦🇺' },
  { id: 'ca', label: 'Canada', flag: '🇨🇦' },
  { id: 'de', label: 'Germany', flag: '🇩🇪' },
  { id: 'fr', label: 'France', flag: '🇫🇷' },
];

const NOTIFICATION_OPTIONS = [
  { id: 'breaking', label: 'Breaking News', description: 'Get notified about major breaking stories' },
  { id: 'daily', label: 'Daily Digest', description: 'Receive a summary of top stories each day' },
  { id: 'weekly', label: 'Weekly Summary', description: 'Get a weekly recap of the most important news' },
];

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [interests, setInterests] = useState([]);
  const [regions, setRegions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { currentUser, updateLocalUserData } = useAuth();
  const navigate = useNavigate();
  const FIRESTORE_TIMEOUT_MS = 5000;

  const toggleSelection = (item, selectedItems, setSelectedItems) => {
    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter(i => i !== item));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSkip = async () => {
    await savePreferences(true);
  };

  const handleFinish = async () => {
    await savePreferences(false);
  };

  const savePreferences = async (skipped) => {
    const nextPreferences = {
      interests: skipped ? [] : interests,
      regions: skipped ? [] : regions,
      notifications: skipped ? [] : notifications,
      onboardingCompleted: true,
      onboardingSkipped: skipped,
    };

    try {
      setLoading(true);
      setError('');

      const userRef = doc(db, 'users', currentUser.uid);
      await Promise.race([
        setDoc(
          userRef,
          {
            ...nextPreferences,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firestore save timed out. Continuing with local profile.')), FIRESTORE_TIMEOUT_MS)
        ),
      ]);

      updateLocalUserData(nextPreferences);
      navigate('/');
    } catch (err) {
      console.error('Error saving preferences:', err);
      updateLocalUserData(nextPreferences);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="step-indicator">
      <div className="step-dots">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`step-dot ${s === step ? 'active' : ''} ${s < step ? 'completed' : ''}`}
          >
            {s < step ? '✓' : s}
          </div>
        ))}
      </div>
      <div className="step-progress">
        <div className="step-progress-fill" style={{ width: `${(step / 3) * 100}%` }} />
      </div>
      <p className="step-text">Step {step} of 3</p>
    </div>
  );

  const renderInterestsStep = () => (
    <div className="step-content">
      <h2 className="step-title">Select Your Interests</h2>
      <p className="step-description">
        Choose the topics you're most interested in. Our ML algorithms will analyze and personalize your news feed based on your selections.
      </p>
      <div className="ml-onboarding-info">
        <span className="ml-info-badge">🤖 AI-Powered</span>
        <span>We'll extract keywords, analyze sentiment, and rank articles by relevance</span>
      </div>
      <div className="options-grid">
        {INTERESTS.map((interest) => (
          <button
            key={interest.id}
            type="button"
            className={`option-card ${interests.includes(interest.id) ? 'selected' : ''}`}
            onClick={() => toggleSelection(interest.id, interests, setInterests)}
          >
            <span className="option-icon">{interest.icon}</span>
            <span className="option-label">{interest.label}</span>
            {interests.includes(interest.id) && (
              <span className="option-check">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  const renderRegionsStep = () => (
    <div className="step-content">
      <h2 className="step-title">Select Your Preferred Regions</h2>
      <p className="step-description">
        Choose the regions you want to see news from. You can select multiple regions.
      </p>
      <div className="options-grid regions-grid">
        {REGIONS.map((region) => (
          <button
            key={region.id}
            type="button"
            className={`option-card ${regions.includes(region.id) ? 'selected' : ''}`}
            onClick={() => toggleSelection(region.id, regions, setRegions)}
          >
            <span className="option-flag">{region.flag}</span>
            <span className="option-label">{region.label}</span>
            {regions.includes(region.id) && (
              <span className="option-check">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  const renderNotificationsStep = () => (
    <div className="step-content">
      <h2 className="step-title">Notification Preferences</h2>
      <p className="step-description">
        How would you like to stay updated with the news?
      </p>
      <div className="notification-options">
        {NOTIFICATION_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`notification-card ${notifications.includes(option.id) ? 'selected' : ''}`}
            onClick={() => toggleSelection(option.id, notifications, setNotifications)}
          >
            <div className="notification-header">
              <span className="notification-checkbox">
                {notifications.includes(option.id) && '✓'}
              </span>
              <span className="notification-label">{option.label}</span>
            </div>
            <p className="notification-description">{option.description}</p>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        {renderStepIndicator()}

        {error && <div className="onboarding-error">{error}</div>}

        <div className="step-wrapper">
          {step === 1 && renderInterestsStep()}
          {step === 2 && renderRegionsStep()}
          {step === 3 && renderNotificationsStep()}
        </div>

        <div className="onboarding-actions">
          <button
            type="button"
            className="btn-skip"
            onClick={handleSkip}
            disabled={loading}
          >
            Skip for now
          </button>
          <div className="btn-group">
            {step > 1 && (
              <button
                type="button"
                className="btn-back"
                onClick={handleBack}
                disabled={loading}
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                className="btn-next"
                onClick={handleNext}
                disabled={loading}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                className="btn-finish"
                onClick={handleFinish}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Complete Setup'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
