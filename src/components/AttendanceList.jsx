import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  UserX, 
  Search, 
  Trash2, 
  ShieldCheck, 
  RefreshCw,
  FileText,
  UserCheck
} from 'lucide-react';
import { api, getMediaUrl, formatDisplayTime } from '../services/api';
import { TableSkeleton } from './SkeletonLoader';

export default function AttendanceList({
  summaryData,
  activeSession,
  onRefresh,
  onOpenFallback,
  language,
  loading = false
}) {
  const isKh = language === 'kh';
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTabFilter, setActiveTabFilter] = useState('ALL'); // 'ALL', 'PRESENT', 'LATE', 'EXCUSED', 'ABSENT'

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const presentList = summaryData?.presentList || [];
  const lateList = summaryData?.lateList || [];
  const excusedList = summaryData?.excusedList || [];
  const absentList = summaryData?.absentList || [];
  const totalCount = presentList.length + lateList.length + excusedList.length + absentList.length;

  const matchesSearch = (item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.full_name?.toLowerCase().includes(term) ||
      item.student_code?.toLowerCase().includes(term) ||
      item.student_id?.toString().toLowerCase().includes(term)
    );
  };

  const filteredPresent = presentList.filter(matchesSearch);
  const filteredLate = lateList.filter(matchesSearch);
  const filteredExcused = excusedList.filter(matchesSearch);
  const filteredAbsent = absentList.filter(matchesSearch);

  const handleDelete = async (recordId, studentName) => {
    if (!recordId) return;
    if (!window.confirm(isKh ? `តើអ្នកចង់លុបកំណត់ត្រាវត្តមានរបស់ "${studentName}"?` : `Delete attendance for "${studentName}"?`)) return;
    try {
      const res = await api.deleteAttendance(recordId);
      if (res.success) onRefresh();
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  return (
    <div className="tab-pane fade-in-fast">
      {/* Panel 1: Session & Stats Bar */}
      <div className="panel">
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2>{isKh ? 'ស្ថិតិវត្តមានសម្រាប់ Session' : 'Session Attendance Roster'}</h2>
            <p className="hint">
              {activeSession?.session_code} · {activeSession?.name} ({activeSession?.class_name}) | 📅 {summaryData?.date || activeSession?.session_date}
            </p>
          </div>
          <button className="btn btn-warning btn-sm" onClick={onOpenFallback}>
            <ShieldCheck size={15} />
            <span>{isKh ? 'ចុះវត្តមានដោយដៃ (Manual / Excused)' : 'Manual Fallback / Excused'}</span>
          </button>
        </div>

        {/* 5-Column Stats Row with Excused */}
        <div className="stat-row" style={{ marginTop: '12px' }}>
          <div className="stat">
            <div className="n">{totalCount}</div>
            <div className="l">{isKh ? 'និស្សិតសរុប' : 'Total Enrolled'}</div>
          </div>
          <div className="stat">
            <div className="n" style={{ color: 'var(--accent)' }}>{presentList.length}</div>
            <div className="l">{isKh ? 'Present (ទាន់ពេល)' : 'Present on Time'}</div>
          </div>
          <div className="stat">
            <div className="n" style={{ color: 'var(--warn)' }}>{lateList.length}</div>
            <div className="l">{isKh ? 'Late (មកយឺត)' : 'Late Check-in'}</div>
          </div>
          <div className="stat">
            <div className="n" style={{ color: '#C084FC' }}>{excusedList.length}</div>
            <div className="l">{isKh ? 'Excused (ច្បាប់)' : 'Excused / Leave'}</div>
          </div>
          <div className="stat">
            <div className="n" style={{ color: 'var(--danger)' }}>{absentList.length}</div>
            <div className="l">{isKh ? 'Absent (អវត្តមាន)' : 'Absent'}</div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="attendance-controls-row" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder={isKh ? 'ស្វែងរកតាមឈ្មោះ ឬ ID...' : 'Search student by name or ID...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '32px', width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <button 
            className="btn ghost btn-sm" 
            onClick={handleRefreshClick}
            disabled={isRefreshing}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin-icon' : ''} />
            <span>{isRefreshing ? (isKh ? 'កំពុងទាញយក...' : 'Refreshing...') : (isKh ? 'ផ្ទុកឡើងវិញ' : 'Refresh')}</span>
          </button>
        </div>

        {/* Segmented Filter Pills (Especially Ergonomic for Phones!) */}
        <div className="segmented-filter-bar" style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
          <button 
            className={`pill-btn ${activeTabFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveTabFilter('ALL')}
          >
            {isKh ? 'ទាំងអស់' : 'All'} ({totalCount})
          </button>
          <button 
            className={`pill-btn ${activeTabFilter === 'PRESENT' ? 'active' : ''}`}
            onClick={() => setActiveTabFilter('PRESENT')}
            style={{ color: activeTabFilter === 'PRESENT' ? '#04231D' : 'var(--accent)' }}
          >
            ✓ {isKh ? 'Present' : 'Present'} ({filteredPresent.length})
          </button>
          <button 
            className={`pill-btn ${activeTabFilter === 'LATE' ? 'active' : ''}`}
            onClick={() => setActiveTabFilter('LATE')}
            style={{ color: activeTabFilter === 'LATE' ? '#2A1B00' : 'var(--warn)' }}
          >
            ⏱ {isKh ? 'Late' : 'Late'} ({filteredLate.length})
          </button>
          <button 
            className={`pill-btn ${activeTabFilter === 'EXCUSED' ? 'active' : ''}`}
            onClick={() => setActiveTabFilter('EXCUSED')}
            style={{ color: activeTabFilter === 'EXCUSED' ? '#2A0B4D' : '#C084FC' }}
          >
            📄 {isKh ? 'Excused (សុំច្បាប់)' : 'Excused'} ({filteredExcused.length})
          </button>
          <button 
            className={`pill-btn ${activeTabFilter === 'ABSENT' ? 'active' : ''}`}
            onClick={() => setActiveTabFilter('ABSENT')}
            style={{ color: activeTabFilter === 'ABSENT' ? '#FFFFFF' : 'var(--danger)' }}
          >
            ✗ {isKh ? 'Absent' : 'Absent'} ({filteredAbsent.length})
          </button>
        </div>
      </div>

      {/* Panel 2: Columns or Filtered Lists */}
      <div className="attendance-roster-grid">
        {/* 1. Present on Time Section */}
        {(activeTabFilter === 'ALL' || activeTabFilter === 'PRESENT') && (
          <div className="panel roster-section">
            <h2 style={{ color: 'var(--accent)' }}>
              <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              {isKh ? `Present (${filteredPresent.length})` : `Present on Time (${filteredPresent.length})`}
            </h2>
            {filteredPresent.length === 0 ? (
              <div className="empty-state-sm">{isKh ? 'មិនមាននិស្សិតក្នុងផ្នែកនេះ' : 'No students in this list'}</div>
            ) : (
              <div className="student-list-wrap">
                {filteredPresent.map((r, idx) => (
                  <div key={r.id || idx} className="student-item">
                    <img 
                      src={getMediaUrl(r.profile_photo || r.snapshot_url) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23263457"/></svg>'} 
                      alt="" 
                      className="thumb" 
                    />
                    <div className="meta">
                      <div className="nm">{r.full_name}</div>
                      <div className="id">{r.student_code || r.student_id} · {r.check_in_method || 'AI_FACE'}</div>
                    </div>
                    <span className="pill present">
                      ⏱ {formatDisplayTime(r.check_in_time, r.created_at)}
                    </span>
                    {r.id && (
                      <button className="btn ghost btn-sm btn-icon" onClick={() => handleDelete(r.id, r.full_name)} title="Delete record">
                        <Trash2 size={13} className="text-danger" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. Late Section */}
        {(activeTabFilter === 'ALL' || activeTabFilter === 'LATE') && (
          <div className="panel roster-section">
            <h2 style={{ color: 'var(--warn)' }}>
              <Clock size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              {isKh ? `មកយឺត / Late (${filteredLate.length})` : `Late Arrivals (${filteredLate.length})`}
            </h2>
            {filteredLate.length === 0 ? (
              <div className="empty-state-sm">{isKh ? 'មិនមាននិស្សិតមកយឺតទេ' : 'No late arrivals'}</div>
            ) : (
              <div className="student-list-wrap">
                {filteredLate.map((r, idx) => (
                  <div key={r.id || idx} className="student-item">
                    <img 
                      src={getMediaUrl(r.profile_photo || r.snapshot_url) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23263457"/></svg>'} 
                      alt="" 
                      className="thumb" 
                    />
                    <div className="meta">
                      <div className="nm">{r.full_name}</div>
                      <div className="id">{r.student_code || r.student_id} · {r.check_in_method || 'AI_FACE'}</div>
                    </div>
                    <span className="pill late">
                      ⏱ {formatDisplayTime(r.check_in_time, r.created_at)} (LATE)
                    </span>
                    {r.id && (
                      <button className="btn ghost btn-sm btn-icon" onClick={() => handleDelete(r.id, r.full_name)} title="Delete record">
                        <Trash2 size={13} className="text-danger" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. Excused Section (NEW) */}
        {(activeTabFilter === 'ALL' || activeTabFilter === 'EXCUSED') && (
          <div className="panel roster-section">
            <h2 style={{ color: '#C084FC' }}>
              <FileText size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              {isKh ? `សុំច្បាប់ / Excused (${filteredExcused.length})` : `Excused / Leave (${filteredExcused.length})`}
            </h2>
            {filteredExcused.length === 0 ? (
              <div className="empty-state-sm">{isKh ? 'គ្មាននិស្សិតសុំច្បាប់ទេ' : 'No excused students'}</div>
            ) : (
              <div className="student-list-wrap">
                {filteredExcused.map((r, idx) => (
                  <div key={r.id || idx} className="student-item">
                    <img 
                      src={getMediaUrl(r.profile_photo || r.snapshot_url) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23263457"/></svg>'} 
                      alt="" 
                      className="thumb" 
                    />
                    <div className="meta">
                      <div className="nm">{r.full_name}</div>
                      <div className="id">{r.student_code || r.student_id} · {r.notes || 'Excused with Permission'}</div>
                    </div>
                    <span className="pill excused">
                      📄 {isKh ? 'សុំច្បាប់ (EXCUSED)' : 'EXCUSED'}
                    </span>
                    {r.id && (
                      <button className="btn ghost btn-sm btn-icon" onClick={() => handleDelete(r.id, r.full_name)} title="Delete record">
                        <Trash2 size={13} className="text-danger" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Absent Section */}
        {(activeTabFilter === 'ALL' || activeTabFilter === 'ABSENT') && (
          <div className="panel roster-section">
            <h2 style={{ color: 'var(--danger)' }}>
              <UserX size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              {isKh ? `អវត្តមាន / Absent (${filteredAbsent.length})` : `Absent Students (${filteredAbsent.length})`}
            </h2>
            {filteredAbsent.length === 0 ? (
              <div className="empty-state-sm success">🎉 {isKh ? 'គ្មាននិស្សិត Absent ទេ' : 'No absent students!'}</div>
            ) : (
              <div className="student-list-wrap">
                {filteredAbsent.map((s, idx) => (
                  <div key={s.student_id || idx} className="student-item">
                    <img 
                      src={getMediaUrl(s.profile_photo) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23263457"/></svg>'} 
                      alt="" 
                      className="thumb" 
                    />
                    <div className="meta">
                      <div className="nm">{s.full_name}</div>
                      <div className="id">{s.student_code || s.student_id} · {s.class_name}</div>
                    </div>
                    <span className="pill absent">{isKh ? 'អវត្តមាន' : 'Absent'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
