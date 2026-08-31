import React, { useState, useEffect } from 'react';
import { Search, Trash2, UserPlus, RefreshCw } from 'lucide-react';
import { api, getMediaUrl } from '../services/api';
import { TableSkeleton } from './SkeletonLoader';

export default function StudentList({
  students,
  activeSession,
  sessions = [],
  onRefresh,
  onNavigateTab,
  language,
  loading = false
}) {
  const isKh = language === 'kh';
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMajor, setSelectedMajor] = useState(activeSession?.major || 'ALL');
  const [selectedClass, setSelectedClass] = useState(activeSession?.class_name || 'ALL');

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setTimeout(() => setIsRefreshing(false), 400);
  };

  // Auto-sync filters when user chooses a different active session
  useEffect(() => {
    if (activeSession) {
      if (activeSession.major) setSelectedMajor(activeSession.major);
      if (activeSession.class_name) setSelectedClass(activeSession.class_name);
    }
  }, [activeSession?.id, activeSession?.class_name, activeSession?.major]);

  let filtered = [...(students || [])];

  // Filter by Major
  if (selectedMajor !== 'ALL') {
    filtered = filtered.filter(s => (s.major || 'Computer Science') === selectedMajor);
  }

  // Filter by Class
  if (selectedClass !== 'ALL') {
    filtered = filtered.filter(s => s.class_name === selectedClass);
  }

  // Search by Name or ID
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(
      s => s.full_name.toLowerCase().includes(term) || s.student_id.toLowerCase().includes(term)
    );
  }

  // Sort A-Z by Full Name
  filtered.sort((a, b) => a.full_name.localeCompare(b.full_name));

  const handleDelete = async (id, name) => {
    if (!window.confirm(isKh ? `តើអ្នកចង់លុបនិស្សិត "${name}" ពីប្រព័ន្ធមែនទេ?` : `Delete student "${name}"?`)) {
      return;
    }
    try {
      const res = await api.deleteStudent(id);
      if (res.success) {
        onRefresh();
      }
    } catch (e) {
      console.error('Delete student error:', e);
    }
  };

  const uniqueMajors = ['ALL', ...new Set([
    ...(sessions || []).map(s => s.major || 'Computer Science'),
    ...(students || []).map(s => s.major || 'Computer Science'),
    activeSession?.major
  ].filter(Boolean))];

  const uniqueClasses = ['ALL', ...new Set([
    ...(sessions || []).map(s => s.class_name),
    ...(students || []).map(s => s.class_name),
    activeSession?.class_name
  ].filter(Boolean))];

  return (
    <div className="tab-pane">
      {/* Panel 1: Search & Multi-Filter Header */}
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2>{isKh ? `បញ្ជីនិស្សិតទាំងអស់ក្នុងប្រព័ន្ធ (${students?.length || 0})` : `Enrolled Students Directory (${students?.length || 0})`}</h2>
            <p className="hint" style={{ margin: 0 }}>
              {isKh ? 'ទិន្នន័យនិស្សិត ជំនាញ ថ្នាក់ រូបថត និង AI Face Biometrics តម្រៀបតាមលំដាប់អក្ខរក្រមពី A ដល់ Z' : 'Student profiles, majors, classes, and biometrics sorted from A to Z.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn ghost btn-sm" 
              onClick={handleRefreshClick}
              disabled={isRefreshing || loading}
            >
              <RefreshCw size={14} className={isRefreshing ? 'spin-icon' : ''} />
              <span>{isRefreshing ? (isKh ? 'កំពុងទាញយក...' : 'Refreshing...') : (isKh ? 'ផ្ទុកឡើងវិញ' : 'Refresh')}</span>
            </button>
            <button className="btn btn-sm" onClick={() => onNavigateTab('register')}>
              <UserPlus size={14} />
              <span>{isKh ? 'ចុះឈ្មោះនិស្សិតថ្មី' : 'Enroll New Student'}</span>
            </button>
          </div>
        </div>

        <div className="row" style={{ marginTop: '16px' }}>
          <div className="col">
            <input
              type="text"
              placeholder={isKh ? '🔍 ស្វែងរកតាមឈ្មោះ ឬអត្តលេខ...' : '🔍 Search by name or student ID...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter by Major - Auto synced with active session */}
          <div className="col">
            <select
              value={selectedMajor}
              onChange={(e) => setSelectedMajor(e.target.value)}
            >
              {uniqueMajors.map(m => (
                <option key={m} value={m}>
                  {m === 'ALL' ? (isKh ? 'គ្រប់ជំនាញទាំងអស់ (All Majors)' : 'All Majors') : m}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Class - Auto synced with active session */}
          <div className="col">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              {uniqueClasses.map(c => (
                <option key={c} value={c}>
                  {c === 'ALL' ? (isKh ? 'គ្រប់ថ្នាក់ទាំងអស់ (All Classes)' : 'All Classes') : c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Panel 2: Clean Students Table with No. and A-Z sorting */}
      <div className="panel">
        <h2>{isKh ? `លទ្ធផលនិស្សិត (${filtered.length})` : `Students (${filtered.length})`}</h2>
        
        {loading || isRefreshing ? (
          <TableSkeleton rows={6} cols={6} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>{isKh ? 'ល.រ' : 'No.'}</th>
                  <th>{isKh ? 'រូបថត' : 'Photo'}</th>
                  <th>{isKh ? 'អត្តលេខ' : 'Student ID'}</th>
                  <th>{isKh ? 'ឈ្មោះពេញ (A-Z)' : 'Full Name (A-Z)'}</th>
                  <th>{isKh ? 'ជំនាញ' : 'Major'}</th>
                  <th>{isKh ? 'ថ្នាក់' : 'Class'}</th>
                  <th>{isKh ? 'ភេទ' : 'Gender'}</th>
                  <th>{isKh ? 'ទិន្នន័យ AI Biometric' : 'AI Face Biometrics'}</th>
                  <th>{isKh ? 'សកម្មភាព' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="empty">
                      {isKh ? 'គ្មានទិន្នន័យនិស្សិតត្រូវនឹងលក្ខខណ្ឌស្វែងរក' : 'No students match your filter.'}
                    </td>
                  </tr>
                ) : (
                filtered.map((s, idx) => (
                  <tr key={s.id}>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>
                      <b>{idx + 1}</b>
                    </td>
                    <td>
                      <img
                        src={getMediaUrl(s.photo_url || s.photo) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23263457"/></svg>'}
                        alt=""
                        className="thumb"
                        style={{ width: '38px', height: '38px' }}
                      />
                    </td>
                    <td style={{ fontFamily: 'var(--mono)' }}><b>{s.student_id}</b></td>
                    <td><b>{s.full_name}</b></td>
                    <td><span className="pill" style={{ background: 'var(--panel-2)', color: 'var(--text)' }}>{s.major || 'Computer Science'}</span></td>
                    <td>{s.class_name}</td>
                    <td>{s.gender || 'Other'}</td>
                    <td>
                      {s.face_descriptor ? (
                        <span className="pill present">128-D Vector ✓</span>
                      ) : (
                        <span className="pill absent">No Biometric</span>
                      )}
                    </td>
                    <td>
                      <button className="btn ghost btn-sm" onClick={() => handleDelete(s.id, s.full_name)}>
                        <Trash2 size={13} style={{ color: 'var(--danger)' }} />
                        <span>{isKh ? 'លុប' : 'Delete'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
