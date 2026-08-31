import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  CheckCircle2, 
  Database, 
  Camera, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function AppLoader({
  progress = 0,
  statusMessage = 'Initializing system...',
  aiReady = false,
  studentsLoaded = false,
  sessionsLoaded = false,
  error = null,
  onComplete,
  language = 'kh'
}) {
  const isKh = language === 'kh';
  const [displayPercent, setDisplayPercent] = useState(10);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Smoothly increment displayed percent towards target progress
  useEffect(() => {
    const target = Math.min(100, Math.max(displayPercent, progress));
    if (displayPercent < target) {
      const step = Math.ceil((target - displayPercent) / 6);
      const timer = setTimeout(() => {
        setDisplayPercent(prev => Math.min(target, prev + step));
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [progress, displayPercent]);

  // When 100% complete and all loaded, auto dismiss after brief visual confirmation
  useEffect(() => {
    if (aiReady && studentsLoaded && sessionsLoaded && displayPercent >= 100) {
      const timeout = setTimeout(() => {
        handleEnter();
      }, 700);
      return () => clearTimeout(timeout);
    }
  }, [aiReady, studentsLoaded, sessionsLoaded, displayPercent]);

  const handleEnter = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 450);
  };

  const steps = [
    {
      id: 'ai',
      labelKh: 'ម៉ូដែលបញ្ញាសិប្បនិម្មិត AI Neural Nets (SSD & 128D)',
      labelEn: 'AI Neural Networks (SSD & 128D)',
      done: aiReady,
      icon: Cpu
    },
    {
      id: 'db',
      labelKh: 'ទិន្នន័យជីវមាត្រ និងនិស្សិត (Biometrics)',
      labelEn: 'Student Biometrics & Embeddings',
      done: studentsLoaded,
      icon: Database
    },
    {
      id: 'sessions',
      labelKh: 'កាលវិភាគថ្នាក់រៀន និង Sessions',
      labelEn: 'Class Schedules & Sessions',
      done: sessionsLoaded,
      icon: Camera
    }
  ];

  const allReady = aiReady && studentsLoaded && sessionsLoaded;

  return (
    <div className={`app-loader-overlay ${isFadingOut ? 'fade-out' : ''}`}>
      {/* Background Animated Cyber Ambient Lights */}
      <div className="loader-ambient-glow glow-1"></div>
      <div className="loader-ambient-glow glow-2"></div>
      <div className="loader-grid-bg"></div>

      <div className="loader-card">
        {/* Holographic Biometric Scanner Ring */}
        <div className="loader-biometric-circle">
          <div className="scanner-radar-ring"></div>
          <div className="scanner-radar-ring outer"></div>
          <div className="scanner-sweep-line"></div>
          
          <div className="scanner-inner-core">
            <Sparkles className="core-icon" size={36} />
          </div>

          <div className="scanner-corner tl"></div>
          <div className="scanner-corner tr"></div>
          <div className="scanner-corner bl"></div>
          <div className="scanner-corner br"></div>
        </div>

        {/* Branding & Subtitle */}
        <div className="loader-header">
          <div className="loader-badge">
            <span className="loader-dot"></span>
            <span>AI FACIAL RECOGNITION SYSTEM</span>
          </div>
          <h1 className="loader-title">
            {isKh ? 'ប្រព័ន្ធគ្រប់គ្រងវត្តមានឆ្លាតវៃ' : 'Smart Attendance System'}
          </h1>
          <p className="loader-subtitle">
            {isKh 
              ? 'កំពុងដំណើរការម៉ូដែល AI និងទាញយកទិន្នន័យប្រព័ន្ធ...' 
              : 'Booting biometric neural network & synchronizing data...'}
          </p>
        </div>

        {/* Progress Bar & Percentage */}
        <div className="loader-progress-section">
          <div className="progress-info-row">
            <span className="progress-status-text">
              {error ? (
                <span className="text-danger flex-align">
                  <AlertCircle size={14} style={{ marginRight: 6 }} />
                  {error}
                </span>
              ) : (
                statusMessage
              )}
            </span>
            <span className="progress-number">{displayPercent}%</span>
          </div>

          <div className="loader-progress-track">
            <div 
              className="loader-progress-bar" 
              style={{ width: `${displayPercent}%` }}
            >
              <div className="progress-glow-tip"></div>
            </div>
          </div>
        </div>

        {/* Boot Step Checklist */}
        <div className="loader-steps-list">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div 
                key={step.id} 
                className={`loader-step-item ${step.done ? 'step-done' : 'step-pending'}`}
              >
                <div className="step-icon-wrap">
                  {step.done ? (
                    <CheckCircle2 size={16} className="step-check-icon text-success" />
                  ) : (
                    <div className="step-spinner-dot"></div>
                  )}
                </div>
                <div className="step-info">
                  <div className="step-label">
                    {isKh ? step.labelKh : step.labelEn}
                  </div>
                </div>
                <div className="step-status-tag">
                  {step.done ? (
                    <span className="tag-ready">{isKh ? 'រួចរាល់' : 'READY'}</span>
                  ) : (
                    <span className="tag-loading">{isKh ? 'ដំណើរការ...' : 'LOADING...'}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Manual Enter / Skip Button if user wants to enter immediately */}
        <div className="loader-actions">
          {allReady ? (
            <button className="btn btn-primary btn-enter" onClick={handleEnter}>
              <ShieldCheck size={18} />
              <span>{isKh ? 'ចូលទៅផ្ទាំងគ្រប់គ្រង' : 'Launch System'}</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button className="btn ghost btn-sm btn-skip" onClick={handleEnter}>
              <span>{isKh ? 'រំលងចូលក្នុងកម្មវិធី' : 'Continue to app'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
