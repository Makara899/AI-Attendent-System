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
  Sparkles
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
  setLanguage
}) {
  const isKh = language === 'kh';

  const navItems = [
    { id: 'register', num: '1', labelKh: 'ចុះឈ្មោះ', fullKh: 'ចុះឈ្មោះនិស្សិត', labelEn: 'Register', fullEn: 'Register Student', icon: UserPlus },
    { id: 'scanner', num: '2', labelKh: 'ស្កេន AI', fullKh: 'ស្កេនវត្តមាន', labelEn: 'Live Scan', fullEn: 'Live AI Scan', live: true, icon: Camera },
    { id: 'attendance', num: '3', labelKh: 'វត្តមាន', fullKh: 'Present / Absent', labelEn: 'Attendance', fullEn: 'Present / Absent', icon: CheckCircle2 },
    { id: 'reports', num: '4', labelKh: 'របាយការណ៍', fullKh: 'របាយការណ៍', labelEn: 'Reports', fullEn: 'Reports & Export', icon: BarChart3 },
    { id: 'sessions', num: '5', labelKh: 'Sessions', fullKh: 'គ្រប់គ្រង Sessions', labelEn: 'Sessions', fullEn: 'Session Manager', icon: CalendarDays },
    { id: 'students', num: '6', labelKh: 'និស្សិត', fullKh: 'បញ្ជីនិស្សិត', labelEn: 'Students', fullEn: 'All Students', icon: Users },
    { id: 'fallback', num: '7', labelKh: 'AI Help', fullKh: 'ករណីមិនស្គាល់មុខ', labelEn: 'AI Help', fullEn: 'AI Diagnostics', icon: Sparkles },
  ];

  const handleTabClick = (id) => {
    if (id === 'fallback') {
      onOpenAIHelp();
    } else {
      setActiveTab(id);
    }
  };

  return (
    <>
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
                <span className="dot"></span>
                <span>{aiReady ? (detectorType === 'tiny' ? 'TINY DETECTOR' : 'SMART ENGINE') : 'LOADING AI...'}</span>
              </div>

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
                  onClick={() => handleTabClick(item.id)}
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
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`mobile-nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => handleTabClick(item.id)}
              aria-label={isKh ? item.fullKh : item.fullEn}
            >
              <div className="mobile-nav-icon-wrap">
                {Icon && <Icon size={19} />}
                {item.live && <span className="mobile-live-dot"></span>}
              </div>
              <span className="mobile-nav-label">{isKh ? item.labelKh : item.labelEn}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
