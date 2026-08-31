import React from 'react';
import { 
  Calendar, 
  Settings,
  UserPlus,
  Camera,
  CheckCircle2,
  BarChart3,
  CalendarDays,
  Users,
  Sparkles,
  Loader2
} from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  sessions,
  activeSessionId,
  setActiveSessionId,
  aiReady,
  detectorType = 'ssd',
  onOpenFallback,
  onOpenAIHelp,
  onOpenSettings,
  language,
  setLanguage,
  isGlobalLoading = false
}) {
  const isKh = language === 'kh';

  // 6 Clean core navigation items (AI Help moved to top header beside Settings)
  const navItems = [
    { id: 'scanner', num: '1', labelKh: 'ស្កេន AI', fullKh: 'ស្កេនវត្តមាន', labelEn: 'Scan', fullEn: 'Live AI Scan', live: true, icon: Camera, highlight: true },
    { id: 'attendance', num: '2', labelKh: 'វត្តមាន', fullKh: 'វត្តមានសរុប', labelEn: 'Attendance', fullEn: 'Attendance', icon: CheckCircle2 },
    { id: 'students', num: '3', labelKh: 'និស្សិត', fullKh: 'បញ្ជីនិស្សិត', labelEn: 'Students', fullEn: 'All Students', icon: Users },
    { id: 'reports', num: '4', labelKh: 'របាយការណ៍', fullKh: 'របាយការណ៍', labelEn: 'Reports', fullEn: 'Reports & Export', icon: BarChart3 },
    { id: 'sessions', num: '5', labelKh: 'Sessions', fullKh: 'Sessions', labelEn: 'Sessions', fullEn: 'Session Manager', icon: CalendarDays },
    { id: 'register', num: '6', labelKh: 'ចុះឈ្មោះ', fullKh: 'ចុះឈ្មោះ', labelEn: 'Register', fullEn: 'Register Student', icon: UserPlus },
  ];

  return (
    <>
      {/* Top Global Loading Bar */}
      {isGlobalLoading && (
        <div className="top-global-loading-bar">
          <div className="loading-bar-indicator"></div>
        </div>
      )}

      <header className="top-header">
        <div className="wrap">
          <div className="header-top-row">
            <div className="brand-box">
              <h1 className="header-title-badge">
                <span className="dot"></span>
                <span>SMART ATTENDANCE SYSTEM</span>
              </h1>
            </div>

            <div className="header-controls">
              {/* Active Session Dropdown */}
              <div className="session-picker">
                <Calendar size={14} className="text-primary" />
                <select
                  value={activeSessionId || ''}
                  onChange={(e) => setActiveSessionId(Number(e.target.value))}
                  className="session-select"
                  aria-label="Active Session"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.course_name} ({s.class_name})
                    </option>
                  ))}
                </select>
              </div>

              {/* AI Engine Name Badge */}
              <div className={`engine-badge ${aiReady ? 'ready' : 'loading'}`} title="AI Neural Engine">
                {aiReady ? (
                  <span className="dot"></span>
                ) : (
                  <Loader2 size={12} className="spin-icon text-warn" />
                )}
                <span>{aiReady ? (detectorType === 'tiny' ? 'TINY DETECTOR' : 'SMART ENGINE') : (isKh ? 'ដំណើរការ AI...' : 'LOADING AI...')}</span>
              </div>

              {/* AI Help Button beside Settings */}
              <button
                className="btn ghost btn-sm btn-ai-help"
                onClick={onOpenAIHelp}
                title={isKh ? 'ជំនួយ AI & ការវិនិច្ឆ័យ (AI Help)' : 'AI Help & Diagnostics'}
              >
                <Sparkles size={14} className="text-primary" />
                <span className="header-btn-text">AI Help</span>
              </button>

              {/* Language Switcher */}
              <button
                className="btn ghost btn-sm"
                onClick={() => setLanguage(isKh ? 'en' : 'kh')}
                title="Switch Language"
              >
                {isKh ? '🇰🇭 ខ្មែរ' : '🇺🇸 EN'}
              </button>

              {/* Settings */}
              <button 
                className="btn ghost btn-icon btn-sm"
                onClick={onOpenSettings}
                title={isKh ? 'ការកំណត់ AI & System' : 'Settings'}
              >
                <Settings size={15} />
              </button>
            </div>
          </div>

          {/* Desktop Top Tabs Navigation */}
          <nav className="tabs desktop-tabs">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={isActive ? 'active' : ''}
                  onClick={() => setActiveTab(item.id)}
                >
                  {Icon && <Icon size={14} className="tab-icon" />}
                  <span>{item.num}. {isKh ? item.fullKh : item.fullEn}</span>
                  {item.live && <span className="tab-live-badge">LIVE</span>}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile Bottom App Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <div className="mobile-nav-inner">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            const isHighlight = item.highlight;

            return (
              <button
                key={item.id}
                className={`mobile-nav-btn ${isActive ? 'active' : ''} ${isHighlight ? 'highlight-btn' : ''}`}
                onClick={() => setActiveTab(item.id)}
                aria-label={isKh ? item.fullKh : item.fullEn}
              >
                <div className="mobile-nav-icon-wrap">
                  {Icon && <Icon size={isHighlight ? 20 : 18} />}
                  {item.live && <span className="mobile-live-dot"></span>}
                </div>
                <span className="mobile-nav-label">{isKh ? item.labelKh : item.labelEn}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
