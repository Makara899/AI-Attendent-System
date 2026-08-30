// API Service for communicating with backend SQLite server
const API_BASE = '/api';

export const api = {
  // Health
  checkHealth: async () => {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  // Students
  getStudents: async (className = '', search = '', major = '') => {
    const params = new URLSearchParams();
    if (className) params.append('class_name', className);
    if (major) params.append('major', major);
    if (search) params.append('search', search);
    const res = await fetch(`${API_BASE}/students?${params.toString()}`);
    return res.json();
  },

  getStudentById: async (id) => {
    const res = await fetch(`${API_BASE}/students/${id}`);
    return res.json();
  },

  createStudent: async (data) => {
    if (data instanceof FormData) {
      const res = await fetch(`${API_BASE}/students`, {
        method: 'POST',
        body: data,
      });
      return res.json();
    }
    const res = await fetch(`${API_BASE}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  updateStudent: async (id, data) => {
    if (data instanceof FormData) {
      const res = await fetch(`${API_BASE}/students/${id}`, {
        method: 'PUT',
        body: data,
      });
      return res.json();
    }
    const res = await fetch(`${API_BASE}/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  deleteStudent: async (id) => {
    const res = await fetch(`${API_BASE}/students/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // Sessions
  getSessions: async () => {
    const res = await fetch(`${API_BASE}/sessions`);
    return res.json();
  },

  createSession: async (sessionData) => {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });
    return res.json();
  },

  updateSession: async (id, sessionData) => {
    const res = await fetch(`${API_BASE}/sessions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });
    return res.json();
  },

  deleteSession: async (id) => {
    const res = await fetch(`${API_BASE}/sessions/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // Attendance
  checkIn: async ({ student_id, session_id, confidence_score, snapshot_base64, notes }) => {
    const res = await fetch(`${API_BASE}/attendance/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id,
        session_id,
        confidence_score,
        snapshot_base64,
        notes
      }),
    });
    return res.json();
  },

  manualOverride: async ({ student_id, session_id, status, reason, notes, teacher_name }) => {
    const res = await fetch(`${API_BASE}/attendance/manual-override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id,
        session_id,
        status,
        reason,
        notes,
        teacher_name
      }),
    });
    return res.json();
  },

  getAttendanceSummary: async (sessionId, date) => {
    const params = new URLSearchParams();
    if (sessionId) params.append('session_id', sessionId);
    if (date) params.append('date', date);
    const res = await fetch(`${API_BASE}/attendance/summary?${params.toString()}`);
    return res.json();
  },

  getAttendanceReports: async ({ start_date, end_date, major, class_name, status, search }) => {
    const params = new URLSearchParams();
    if (start_date) params.append('start_date', start_date);
    if (end_date) params.append('end_date', end_date);
    if (major) params.append('major', major);
    if (class_name) params.append('class_name', class_name);
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    const res = await fetch(`${API_BASE}/attendance/reports?${params.toString()}`);
    return res.json();
  },

  deleteAttendance: async (id) => {
    const res = await fetch(`${API_BASE}/attendance/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  }
};
