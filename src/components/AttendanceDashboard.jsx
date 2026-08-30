import React from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  UserX, 
  TrendingUp, 
  Calendar, 
  ShieldCheck, 
  Camera, 
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Percent
} from 'lucide-react';
import { getMediaUrl, formatDisplayTime } from '../services/api';

export default function AttendanceDashboard({
  summaryData,
  activeSession,
  onNavigateTab,
  onOpenFallback,
  language
}) {
  const isKh = language === 'kh';
  const stats = summaryData?.stats || {
    totalCount: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    attendanceRate: 0
  };

  const presentList = summaryData?.presentList || [];
  const lateList = summaryData?.lateList || [];
  const absentList = summaryData?.absentList || [];

  return (
    <div className="dashboard-container">
      {/* Session Hero Banner with Mesh Background */}
      <div className="session-hero-card">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="live-pulse"></span>
            <span>{isKh ? 'Session កំពុងដំណើរការ' : 'Active Class Session'}</span>
          </div>
          <h2 className="hero-title">{activeSession?.name || 'No Active Session'}</h2>
          <div className="hero-meta-row">
            <span className="hero-chip">📖 <strong>{activeSession?.course_name || 'N/A'}</strong></span>
            <span className="hero-chip">👥 <strong>{activeSession?.class_name || 'N/A'}</strong></span>
            <span className="hero-chip">📅 {summaryData?.date || activeSession?.session_date} (⏱ {activeSession?.start_time} - {activeSession?.end_time})</span>
          </div>
        </div>

        <div className="hero-actions">
          <button className="btn btn-primary" onClick={() => onNavigateTab('scanner')}>
            <Camera size={18} />
            <span>{isKh ? 'បើកកាមេរាចុះវត្តមាន' : 'Launch AI Camera'}</span>
          </button>
          <button className="btn btn-warning" onClick={onOpenFallback}>
            <ShieldCheck size={18} />
            <span>{isKh ? 'ចុះវត្តមានដោយដៃ' : 'Manual Fallback'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="kpi-grid">
        {/* 1. Total Enrolled */}
        <div className="kpi-card total">
          <div className="kpi-icon-box">
            <Users size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">{isKh ? 'និស្សិតសរុបក្នុងថ្នាក់' : 'Enrolled Students'}</span>
            <h3 className="kpi-value">{stats.totalCount}</h3>
            <span className="kpi-subtext">{activeSession?.class_name || 'Target Class'}</span>
          </div>
        </div>

        {/* 2. Present Count */}
        <div className="kpi-card present">
          <div className="kpi-icon-box">
            <UserCheck size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">{isKh ? 'មានវត្តមាន (Present)' : 'Present on Time'}</span>
            <h3 className="kpi-value text-success">{stats.presentCount}</h3>
            <span className="kpi-subtext">
              {stats.totalCount > 0 ? Math.round((stats.presentCount / stats.totalCount) * 100) : 0}% of cohort
            </span>
          </div>
        </div>

        {/* 3. Late Count */}
        <div className="kpi-card late">
          <div className="kpi-icon-box">
            <Clock size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">{isKh ? 'មកយឺត (Late Arrival)' : 'Late Arrival'}</span>
            <h3 className="kpi-value text-warning">{stats.lateCount}</h3>
            <span className="kpi-subtext">&gt; 15 mins grace period</span>
          </div>
        </div>

        {/* 4. Absent Count */}
        <div className="kpi-card absent">
          <div className="kpi-icon-box">
            <UserX size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">{isKh ? 'អវត្តមាន / មិនទាន់ស្កេន' : 'Absent / Pending'}</span>
            <h3 className="kpi-value text-danger">{stats.absentCount}</h3>
            <span className="kpi-subtext">Awaiting check-in</span>
          </div>
        </div>

        {/* 5. Attendance Rate with Circular SVG Progress Ring */}
        <div className="kpi-card rate">
          <div className="circular-progress-wrap">
            <svg viewBox="0 0 36 36" className="circular-chart">
              <path className="circle-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path className="circle"
                strokeDasharray={`${Math.min(Math.max(stats.attendanceRate, 0), 100)}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <text x="18" y="20.8" className="percentage">{stats.attendanceRate}%</text>
            </svg>
            <div className="kpi-info" style={{ flex: 1 }}>
              <span className="kpi-label">{isKh ? 'អត្រាវត្តមានសរុប' : 'Attendance Rate'}</span>
              <h3 className="kpi-value text-primary">{stats.attendanceRate}%</h3>
              <span className="kpi-subtext">{stats.presentCount} of {stats.totalCount} present</span>
            </div>
          </div>
        </div>
      </div>

      {/* Split Cards: Recent Present vs Missing Absent */}
      <div className="dashboard-split-grid">
        {/* Present & Late Students Card */}
        <div className="card split-card">
          <div className="card-header flex-between">
            <div className="header-title">
              <CheckCircle2 size={19} className="text-success" />
              <h3>{isKh ? 'និស្សិតដែលមានវត្តមាន' : 'Checked-In Students'} ({presentList.length + lateList.length})</h3>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigateTab('attendance')}>
              <span>{isKh ? 'មើលទាំងអស់' : 'View All'}</span> <ArrowRight size={14} />
            </button>
          </div>

          <div className="card-body scrollable-list">
            {[...presentList, ...lateList].length === 0 ? (
              <div className="empty-state-sm">
                <p>{isKh ? 'មិនទាន់មាននិស្សិតចុះវត្តមាននៅឡើយ' : 'No students checked in yet'}</p>
              </div>
            ) : (
              [...presentList, ...lateList].slice(0, 6).map((item) => (
                <div key={item.id} className="mini-student-row">
                  <div className="mini-avatar">
                    {item.snapshot_url || item.profile_photo ? (
                      <img 
                        src={getMediaUrl(item.snapshot_url || item.profile_photo)} 
                        alt="Snap" 
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <span>{item.full_name?.charAt(0)}</span>
                    )}
                  </div>
                  <div className="mini-info">
                    <span className="mini-name">{item.full_name}</span>
                    <span className="mini-sub">{item.student_code} • ⏱ {formatDisplayTime(item.check_in_time, item.created_at)}</span>
                  </div>
                  <div className="mini-badge">
                    <span className={`status-pill-sm ${item.status === 'LATE' ? 'late' : 'present'}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Absent Students Card */}
        <div className="card split-card">
          <div className="card-header flex-between">
            <div className="header-title">
              <AlertTriangle size={19} className="text-danger" />
              <h3>{isKh ? 'និស្សិតអវត្តមាន (មិនទាន់កត់ត្រា)' : 'Unrecorded / Absent Students'} ({absentList.length})</h3>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigateTab('attendance')}>
              <span>{isKh ? 'មើលទាំងអស់' : 'View All'}</span> <ArrowRight size={14} />
            </button>
          </div>

          <div className="card-body scrollable-list">
            {absentList.length === 0 ? (
              <div className="empty-state-sm success">
                <Sparkles size={24} className="text-success mb-1" />
                <p>{isKh ? 'អបអរសាទរ! និស្សិតគ្រប់រូបមានវត្តមាន' : '100% Full Attendance recorded!'}</p>
              </div>
            ) : (
              absentList.slice(0, 6).map((stu) => (
                <div key={stu.student_id} className="mini-student-row">
                  <div className="mini-avatar absent">
                    <span>{stu.full_name?.charAt(0)}</span>
                  </div>
                  <div className="mini-info">
                    <span className="mini-name">{stu.full_name}</span>
                    <span className="mini-sub">{stu.student_code} • {stu.gender}</span>
                  </div>
                  <div className="mini-actions">
                    <button 
                      className="btn btn-outline btn-xs"
                      onClick={onOpenFallback}
                      title={isKh ? 'ចុះវត្តមានដោយដៃ' : 'Manual Check-in'}
                    >
                      {isKh ? 'ចុះដោយដៃ' : 'Mark'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
