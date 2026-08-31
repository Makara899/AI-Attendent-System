import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Search, 
  Download,
  Loader2
} from 'lucide-react';
import { api, formatDisplayTime } from '../services/api';
import { exportService } from '../services/exportService';
import { TableSkeleton } from './SkeletonLoader';

export default function AttendanceReports({ activeSession, sessions = [], language }) {
  const isKh = language === 'kh';

  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedMajor, setSelectedMajor] = useState(activeSession?.major || 'ALL');
  const [selectedClass, setSelectedClass] = useState(activeSession?.class_name || 'ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // Auto-sync filters when user chooses a different active session
  useEffect(() => {
    if (activeSession) {
      if (activeSession.major) setSelectedMajor(activeSession.major);
      if (activeSession.class_name) setSelectedClass(activeSession.class_name);
    }
  }, [activeSession?.id, activeSession?.class_name, activeSession?.major]);

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate, selectedMajor, selectedClass, selectedStatus]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.getAttendanceReports({
        start_date: startDate,
        end_date: endDate,
        major: selectedMajor,
        class_name: selectedClass,
        status: selectedStatus,
        search
      });
      if (res.success) {
        // Sort A to Z by full_name
        const sorted = (res.data || []).sort((a, b) => 
          (a.full_name || '').localeCompare(b.full_name || '')
        );
        setRecords(sorted);
      }
    } catch (e) {
      console.error('Fetch reports error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReports();
  };

  const handleExportCSV = () => {
    if (!records.length) {
      alert(isKh ? 'គ្មានទិន្នន័យត្រូវទាញយកទេ' : 'No records to export');
      return;
    }
    exportService.exportToCSV(records, `attendance-report-${startDate}-to-${endDate}.csv`);
  };

  const handleExportExcel = () => {
    if (!records.length) return;
    exportService.exportToExcel(records, `attendance-report-${startDate}-to-${endDate}`, {
      totalCount: records.length,
      presentCount: records.filter(r => r.status === 'PRESENT').length,
      lateCount: records.filter(r => r.status === 'LATE').length,
      absentCount: 0,
      attendanceRate: 100
    });
  };

  const uniqueMajors = ['ALL', ...new Set([
    ...(sessions || []).map(s => s.major || 'Computer Science'),
    ...(records || []).map(r => r.major || 'Computer Science'),
    activeSession?.major
  ].filter(Boolean))];

  const uniqueClasses = ['ALL', ...new Set([
    ...(sessions || []).map(s => s.class_name),
    ...(records || []).map(r => r.class_name),
    activeSession?.class_name
  ].filter(Boolean))];

  return (
    <div className="tab-pane">
      {/* Panel 1: Filter Controls */}
      <div className="panel">
        <h2>{isKh ? 'ស្វែងរក & របាយការណ៍វត្តមាន (Attendance Reports)' : 'Search & Attendance Reports'}</h2>
        <p className="hint">
          {isKh 
            ? 'កំណត់ចន្លោះកាលបរិច្ឆេទ ជំនាញ ថ្នាក់ និងឈ្មោះ ដើម្បីទាញយករបាយការណ៍វត្តមានជា Excel / CSV ឬ Print PDF។' 
            : 'Filter by date range, major, class batch, and student name to export official reports.'}
        </p>

        <form onSubmit={handleSearchSubmit}>
          <div className="row">
            <div className="col">
              <div className="field">
                <label>{isKh ? 'ស្វែងរកតាមឈ្មោះ / អត្តលេខ' : 'Search by Name / ID'}</label>
                <input
                  type="text"
                  placeholder={isKh ? '🔍 វាយឈ្មោះ ឬ Student ID...' : '🔍 Type name or student ID...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Filter by Major - Auto synced */}
            <div className="col">
              <div className="field">
                <label>{isKh ? 'ជំនាញ (Major)' : 'Major'}</label>
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
            </div>

            {/* Filter by Class - Auto synced */}
            <div className="col">
              <div className="field">
                <label>{isKh ? 'ថ្នាក់ & ជំនាន់ (Class & Batch)' : 'Class & Batch'}</label>
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

          <div className="row">
            <div className="col">
              <div className="field">
                <label>{isKh ? 'ចាប់ពីថ្ងៃ (Start Date)' : 'From Date'}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>
            <div className="col">
              <div className="field">
                <label>{isKh ? 'ដល់ថ្ងៃ (End Date)' : 'To Date'}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="col">
              <div className="field">
                <label>{isKh ? 'ស្ថានភាពវត្តមាន (Status)' : 'Status'}</label>
                <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                  <option value="ALL">{isKh ? 'ទាំងអស់ (All)' : 'All'}</option>
                  <option value="PRESENT">{isKh ? 'វត្តមាន (Present)' : 'Present'}</option>
                  <option value="LATE">{isKh ? 'មកយឺត (Late)' : 'Late'}</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
            <button type="submit" className="btn ghost" disabled={loading}>
              {loading ? <Loader2 size={15} className="spin-icon" /> : <Search size={15} />}
              <span>{loading ? (isKh ? 'កំពុងស្វែងរក...' : 'Searching...') : (isKh ? 'ស្វែងរក' : 'Filter Reports')}</span>
            </button>
            <button type="button" className="btn" onClick={handleExportCSV} disabled={records.length === 0 || loading}>
              <Download size={15} />
              <span>{isKh ? 'ទាញយក CSV' : 'Export CSV'}</span>
            </button>
            <button type="button" className="btn ghost" onClick={handleExportExcel} disabled={records.length === 0 || loading}>
              <FileSpreadsheet size={15} />
              <span>Excel (.xlsx)</span>
            </button>
            <button type="button" className="btn ghost" onClick={() => window.print()} disabled={records.length === 0 || loading}>
              <Printer size={15} />
              <span>{isKh ? 'បោះពុម្ព (Print)' : 'Print'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Panel 2: Table Results with No. and A-Z sorting */}
      <div className="panel">
        <h2>{isKh ? `លទ្ធផលរបាយការណ៍វត្តមាន (${records.length})` : `Attendance Report Roster (${records.length})`}</h2>
        
        {loading ? (
          <TableSkeleton rows={7} cols={8} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>{isKh ? 'ល.រ' : 'No.'}</th>
                  <th>{isKh ? 'អត្តលេខ' : 'Student ID'}</th>
                  <th>{isKh ? 'ឈ្មោះនិស្សិត (A-Z)' : 'Full Name (A-Z)'}</th>
                  <th>{isKh ? 'ជំនាញ' : 'Major'}</th>
                  <th>{isKh ? 'ថ្នាក់' : 'Class'}</th>
                  <th>Session</th>
                  <th>{isKh ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                  <th>{isKh ? 'ម៉ោង' : 'Time'}</th>
                  <th>{isKh ? 'ស្ថានភាព' : 'Status'}</th>
                  <th>{isKh ? 'វិធីសាស្ត្រ' : 'Method'}</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="empty">
                      {isKh ? 'គ្មានទិន្នន័យត្រូវនឹងលក្ខខណ្ឌស្វែងរក' : 'No records found for the selected filter.'}
                    </td>
                  </tr>
                ) : (
                records.map((r, idx) => (
                  <tr key={r.id || idx}>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>
                      <b>{idx + 1}</b>
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '12px' }}><b>{r.student_code || r.student_id}</b></td>
                    <td><b>{r.full_name}</b></td>
                    <td><span className="pill" style={{ background: 'var(--panel-2)', color: 'var(--text)' }}>{r.major || 'Computer Science'}</span></td>
                    <td>{r.class_name}</td>
                    <td>{r.session_name || r.course_name || 'Class Session'}</td>
                    <td>{r.date}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>{formatDisplayTime(r.check_in_time, r.created_at)}</td>
                    <td>
                      <span className={`pill ${r.status === 'LATE' ? 'late' : 'present'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <span className="pill status-200" style={{ fontSize: '10.5px' }}>
                        {r.check_in_method || 'AI_FACE'}
                      </span>
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
