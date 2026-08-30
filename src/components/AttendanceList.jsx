import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  UserX, 
  Search, 
  Trash2, 
  ShieldCheck, 
  RefreshCw 
} from 'lucide-react';
import { api, getMediaUrl, formatDisplayTime } from '../services/api';

export default function AttendanceList({
  summaryData,
  activeSession,
  onRefresh,
  onOpenFallback,
  language
}) {
  const isKh = language === 'kh';
  const [searchTerm, setSearchTerm] = useState('');

  const presentList = summaryData?.presentList || [];
  const lateList = summaryData?.lateList || [];
  const absentList = summaryData?.absentList || [];
  const totalCount = presentList.length + lateList.length + absentList.length;

  const filteredPresent = [...presentList, ...lateList].filter(s => 
    !searchTerm || s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.student_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAbsent = absentList.filter(s => 
    !searchTerm || s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.student_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="tab-pane">
      {/* Panel 1: Session & Stats */}
      <div className="panel">
        <h2>{isKh ? 'ស្ថិតិវត្តមានសម្រាប់ Session' : 'Session Attendance Status'}</h2>
        <p className="hint">
          {activeSession?.session_code} · {activeSession?.name} ({activeSession?.class_name}) | 📅 {summaryData?.date || activeSession?.session_date}
        </p>

        <div className="stat-row">
          <div className="stat">
            <div className="n">{totalCount}</div>
            <div className="l">{isKh ? 'និស្សិតសរុប' : 'Total Students'}</div>
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
            <div className="n" style={{ color: 'var(--danger)' }}>{absentList.length}</div>
            <div className="l">{isKh ? 'Absent (អវត្តមាន)' : 'Absent'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '12px' }}>
          <input
            type="text"
            placeholder={isKh ? 'ស្វែងរកតាមឈ្មោះ ឬ ID...' : 'Search student by name or ID...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '360px' }}
          />
          <button className="btn ghost btn-sm" onClick={onRefresh}>
            <RefreshCw size={14} />
            <span>{isKh ? 'ផ្ទុកឡើងវិញ' : 'Refresh'}</span>
          </button>
          <button className="btn ghost btn-sm" onClick={onOpenFallback}>
            <ShieldCheck size={14} className="text-warning" />
            <span>{isKh ? 'ចុះវត្តមានដោយដៃ' : 'Manual Fallback'}</span>
          </button>
        </div>
      </div>

      {/* Panel 2: Two Columns for Present vs Absent */}
      <div className="row">
        {/* Column 1: Present / Late */}
        <div className="col">
          <div className="panel" style={{ height: '100%' }}>
            <h2>✅ {isKh ? `Present (${filteredPresent.length})` : `Present (${filteredPresent.length})`}</h2>
            <p className="hint">{isKh ? 'និស្សិតដែលបានស្កេនមុខ ឬកត់ត្រាវត្តមានរួចរាល់' : 'Students who checked in for this session'}</p>

            {filteredPresent.length === 0 ? (
              <div className="empty">{isKh ? 'មិនទាន់មាននរណាម្នាក់ Present ទេ' : 'No students checked in yet.'}</div>
            ) : (
              <div>
                {filteredPresent.map((r, idx) => (
                  <div key={r.id || idx} className="student-item">
                    <img 
                      src={getMediaUrl(r.profile_photo || r.snapshot_url) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23263457"/><text x="12" y="16" font-size="10" fill="%2394a3b8" text-anchor="middle">👤</text></svg>'} 
                      alt="" 
                      className="thumb" 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23263457"/><text x="12" y="16" font-size="10" fill="%2394a3b8" text-anchor="middle">👤</text></svg>';
                      }}
                    />
                    <div className="meta">
                      <div className="nm">{r.full_name}</div>
                      <div className="id">{r.student_code || r.student_id} · {r.check_in_method || 'AI_FACE'}</div>
                    </div>
                    <span className={`pill ${r.status === 'LATE' ? 'late' : 'present'}`}>
                      {formatDisplayTime(r.check_in_time, r.created_at)} {r.status === 'LATE' ? '(LATE)' : ''}
                    </span>
                    {r.id && (
                      <button className="btn ghost btn-sm" onClick={() => handleDelete(r.id, r.full_name)}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Absent */}
        <div className="col">
          <div className="panel" style={{ height: '100%' }}>
            <h2>❌ {isKh ? `Absent (${filteredAbsent.length})` : `Absent (${filteredAbsent.length})`}</h2>
            <p className="hint">{isKh ? 'និស្សិតដែលមិនទាន់បានស្កេនមុខក្នុង Session នេះ' : 'Students who have not checked in'}</p>

            {filteredAbsent.length === 0 ? (
              <div className="empty">🎉 {isKh ? 'គ្មាននិស្សិត Absent ទេ' : 'No absent students!'}</div>
            ) : (
              <div>
                {filteredAbsent.map((s, idx) => (
                  <div key={s.student_id || idx} className="student-item">
                    <img 
                      src={getMediaUrl(s.profile_photo) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23263457"/><text x="12" y="16" font-size="10" fill="%2394a3b8" text-anchor="middle">👤</text></svg>'} 
                      alt="" 
                      className="thumb" 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23263457"/><text x="12" y="16" font-size="10" fill="%2394a3b8" text-anchor="middle">👤</text></svg>';
                      }}
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
        </div>
      </div>
    </div>
  );
}
