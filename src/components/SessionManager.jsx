import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { api } from '../services/api';

export default function SessionManager({
  sessions,
  activeSessionId,
  setActiveSessionId,
  onSessionCreated,
  language
}) {
  const isKh = language === 'kh';

  const todayStr = new Date().toISOString().split('T')[0];
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [major, setMajor] = useState('Computer Science');
  const [lecturer, setLecturer] = useState('');
  const [room, setRoom] = useState('');
  const [className, setClassName] = useState('');
  const [sessionDate, setSessionDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('11:00');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const startEdit = (s) => {
    setEditingId(s.id);
    setName(s.name || '');
    setCourseName(s.course_name || '');
    setMajor(s.major || 'Computer Science');
    setLecturer(s.lecturer || '');
    setRoom(s.room || '');
    setClassName(s.class_name || '');
    setSessionDate(s.session_date || todayStr);
    setStartTime(s.start_time || '08:00');
    setEndTime(s.end_time || '11:00');
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setCourseName('');
    setMajor('Computer Science');
    setLecturer('');
    setRoom('');
    setClassName('');
    setSessionDate(todayStr);
    setStartTime('08:00');
    setEndTime('11:00');
    setFeedback(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !courseName.trim() || !className.trim()) {
      setFeedback({ type: 'error', message: isKh ? 'សូមបំពេញឈ្មោះ Session, មុខវិជ្ជា និងថ្នាក់/ជំនាន់' : 'Please fill session name, course, and class/batch.' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        course_name: courseName.trim(),
        major: major.trim() || 'Computer Science',
        lecturer: lecturer.trim() || (isKh ? 'សាស្ត្រាចារ្យ' : 'Lecturer'),
        room: room.trim() || 'Room 101',
        class_name: className.trim(),
        session_date: sessionDate,
        start_time: startTime,
        end_time: endTime
      };

      if (editingId) {
        const res = await api.updateSession(editingId, payload);
        if (res.success) {
          setFeedback({ type: 'success', message: isKh ? '✔ បានកែប្រែ Session ដោយជោគជ័យ!' : '✔ Session updated successfully!' });
          cancelEdit();
          if (onSessionCreated) onSessionCreated();
        } else {
          setFeedback({ type: 'error', message: res.error || 'Failed to update session.' });
        }
      } else {
        const res = await api.createSession(payload);
        if (res.success) {
          setFeedback({ type: 'success', message: isKh ? '✔ បានបង្កើត Session ថ្មីដោយជោគជ័យ!' : '✔ Session created successfully!' });
          cancelEdit();
          if (onSessionCreated) onSessionCreated();
        } else {
          setFeedback({ type: 'error', message: res.error || 'Failed to create session.' });
        }
      }
    } catch (e) {
      setFeedback({ type: 'error', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, sessionName) => {
    if (!window.confirm(isKh ? `តើអ្នកប្រាកដជាចង់លុប Session "${sessionName}" ពីប្រព័ន្ធមែនទេ?` : `Delete session "${sessionName}"?`)) {
      return;
    }
    try {
      const res = await api.deleteSession(id);
      if (res.success) {
        setFeedback({ type: 'success', message: isKh ? `✔ បានលុប Session "${sessionName}" ដោយជោគជ័យ!` : `✔ Session "${sessionName}" deleted successfully!` });
        if (editingId === id) cancelEdit();
        if (onSessionCreated) onSessionCreated();
      } else {
        setFeedback({ type: 'error', message: res.error || 'Failed to delete session.' });
      }
    } catch (e) {
      setFeedback({ type: 'error', message: e.message });
      console.error('Delete session error:', e);
    }
  };

  return (
    <div className="tab-pane">
      {/* Panel 1: Create or Edit Session */}
      <div className="panel">
        <h2>
          {editingId 
            ? (isKh ? '✏️ កែសម្រួល Session (Edit Session)' : '✏️ Edit Class Session')
            : (isKh ? '➕ បង្កើត Session ថ្មី (Create New Session)' : '➕ Create New Class Session')}
        </h2>
        <p className="hint">
          {isKh 
            ? 'បញ្ចូលឈ្មោះ Session, មុខវិជ្ជា, ជំនាញ (Major), សាស្ត្រាចារ្យ, បន្ទប់, ថ្នាក់ និងជំនាន់ ដើម្បីកត់ត្រាវត្តមាន។' 
            : 'Enter session name, course, major, lecturer, room, class, and batch for attendance tracking.'}
        </p>

        {feedback && (
          <div className={`msg ${feedback.type === 'success' ? 'ok' : 'fail'}`}>
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col">
              <div className="field">
                <label>{isKh ? 'ឈ្មោះ Session (Session Name)' : 'Session Name'}</label>
                <input
                  type="text"
                  placeholder="e.g. Morning Lecture / មេរៀនព្រឹក"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="col">
              <div className="field">
                <label>{isKh ? 'ឈ្មោះមុខវិជ្ជា (Course Name)' : 'Course Name'}</label>
                <input
                  type="text"
                  placeholder="e.g. CS-101: Artificial Intelligence"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="col">
              <div className="field">
                <label>{isKh ? 'ជំនាញ (Major)' : 'Major'}</label>
                <select value={major} onChange={(e) => setMajor(e.target.value)}>
                  <option value="Computer Science">Computer Science (CS)</option>
                  <option value="Software Engineering">Software Engineering</option>
                  <option value="Data Science & AI">Data Science & AI</option>
                  <option value="Information Technology">Information Technology (IT)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col">
              <div className="field">
                <label>{isKh ? 'សាស្ត្រាចារ្យ (Lecturer)' : 'Lecturer'}</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Sokha / លោកគ្រូ សុខា"
                  value={lecturer}
                  onChange={(e) => setLecturer(e.target.value)}
                />
              </div>
            </div>

            <div className="col">
              <div className="field">
                <label>{isKh ? 'បន្ទប់ (Room)' : 'Room'}</label>
                <input
                  type="text"
                  placeholder="e.g. Room 304 / Lab 2"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                />
              </div>
            </div>

            <div className="col">
              <div className="field">
                <label>{isKh ? 'ថ្នាក់ & ជំនាន់ (Class & Batch)' : 'Class & Batch'}</label>
                <input
                  type="text"
                  placeholder="e.g. Year 4 S1 / Batch 8"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col">
              <div className="field">
                <label>{isKh ? 'កាលបរិច្ឆេទ (Date)' : 'Date'}</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="col">
              <div className="field">
                <label>{isKh ? 'ម៉ោងចូល - ចេញ (Time)' : 'Time (Start - End)'}</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button type="submit" className="btn" disabled={loading}>
              {editingId ? <Check size={15} /> : <Plus size={15} />}
              <span>
                {loading 
                  ? (isKh ? 'កំពុងរក្សាទុក...' : 'Saving...') 
                  : (editingId 
                      ? (isKh ? 'រក្សាទុកការកែប្រែ (Update Session)' : 'Save Changes') 
                      : (isKh ? 'បង្កើត Session (Create Session)' : 'Create Session'))}
              </span>
            </button>

            {editingId && (
              <button type="button" className="btn ghost" onClick={cancelEdit}>
                <X size={15} />
                <span>{isKh ? 'បោះបង់ (Cancel)' : 'Cancel'}</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Panel 2: Existing Sessions List */}
      <div className="panel">
        <h2>{isKh ? `បញ្ជី Session ទាំងអស់ក្នុងប្រព័ន្ធ (${sessions.length})` : `All Scheduled Sessions (${sessions.length})`}</h2>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>{isKh ? 'ល.រ' : 'No.'}</th>
                <th>{isKh ? 'ឈ្មោះ Session' : 'Session Name'}</th>
                <th>{isKh ? 'មុខវិជ្ជា' : 'Course'}</th>
                <th>{isKh ? 'ជំនាញ' : 'Major'}</th>
                <th>{isKh ? 'សាស្ត្រាចារ្យ' : 'Lecturer'}</th>
                <th>{isKh ? 'បន្ទប់' : 'Room'}</th>
                <th>{isKh ? 'ថ្នាក់ / ជំនាន់' : 'Class / Batch'}</th>
                <th>{isKh ? 'កាលបរិច្ឆេទ & ម៉ោង' : 'Date & Time'}</th>
                <th>{isKh ? 'ស្ថានភាព' : 'Status'}</th>
                <th>{isKh ? 'សកម្មភាព' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan="10" className="empty">{isKh ? 'មិនទាន់មាន Session ទេ' : 'No sessions created yet.'}</td>
                </tr>
              ) : (
                sessions.map((s, idx) => {
                  const isActive = s.id === activeSessionId;
                  return (
                    <tr key={s.id}>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>
                        <b>{idx + 1}</b>
                      </td>
                      <td><b>{s.name}</b></td>
                      <td>{s.course_name}</td>
                      <td><span className="pill" style={{ background: 'var(--panel-2)', color: 'var(--text)' }}>{s.major || 'Computer Science'}</span></td>
                      <td>{s.lecturer || 'Professor'}</td>
                      <td><span className="pill" style={{ background: 'var(--panel-2)', color: 'var(--text)' }}>{s.room || 'Room 101'}</span></td>
                      <td><b>{s.class_name}</b></td>
                      <td>📅 {s.session_date} <span style={{ fontFamily: 'var(--mono)' }}>({s.start_time} - {s.end_time})</span></td>
                      <td>
                        {isActive ? (
                          <span className="pill present">ACTIVE </span>
                        ) : (
                          <span className="pill" style={{ background: 'var(--panel-2)', color: 'var(--text-dim)' }}>STANDBY</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {isActive ? (
                            <span style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: '600', marginRight: '4px' }}>✓ {isKh ? 'សកម្ម' : 'Active'}</span>
                          ) : (
                            <button className="btn ghost btn-sm" onClick={() => setActiveSessionId(s.id)}>
                              {isKh ? 'ជ្រើសរើស' : 'Select'}
                            </button>
                          )}
                          <button className="btn ghost btn-sm" onClick={() => startEdit(s)} title={isKh ? 'កែសម្រួល' : 'Edit'}>
                            <Edit2 size={13} />
                          </button>
                          <button className="btn ghost btn-sm" onClick={() => handleDelete(s.id, s.name)} title={isKh ? 'លុប' : 'Delete'}>
                            <Trash2 size={13} style={{ color: 'var(--danger)' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
