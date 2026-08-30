import React from 'react';
import { 
  Calendar, 
  Settings 
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
    { id: 'register', num: '1', labelKh: 'ចុះឈ្មោះនិស្សិត', labelEn: 'Register Student' },
    { id: 'scanner', num: '2', labelKh: 'ស្កេនវត្តមាន', labelEn: 'Live AI Scan', live: true },
    { id: 'attendance', num: '3', labelKh: 'Present / Absent', labelEn: 'Present / Absent' },
    { id: 'reports', num: '4', labelKh: 'របាយការណ៍', labelEn: 'Reports & Export' },
    { id: 'sessions', num: '5', labelKh: 'គ្រប់គ្រង Sessions', labelEn: 'Session Manager' },
    { id: 'students', num: '6', labelKh: 'បញ្ជីនិស្សិត', labelEn: 'All Students' },
    { id: 'fallback', num: '7', labelKh: 'ករណីមិនស្គាល់មុខ', labelEn: 'AI Diagnostics & Fallback' },
  ];

  const handleTabClick = (id) => {
    if (id === 'fallback') {
      onOpenAIHelp();
    } else {
      setActiveTab(id);
    }
  };

  return (
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

        {/* Clean Numbered Tabs Navigation */}
        <nav className="tabs">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={isActive ? 'active' : ''}
                onClick={() => handleTabClick(item.id)}
              >
                <span>{item.num}. {isKh ? item.labelKh : item.labelEn}</span>
                {item.live && <span className="tab-live-badge">LIVE</span>}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
