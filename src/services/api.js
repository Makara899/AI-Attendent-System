// API Service for communicating with backend SQLite server
const isLocal = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1'
);

const API_BASE = isLocal 
  ? '/api' 
  : (import.meta.env.VITE_API_URL || 'https://ai-attendent-system.onrender.com/api');

export const getMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;
  const serverHost = isLocal ? '' : 'https://ai-attendent-system.onrender.com';
  return `${serverHost}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const formatDisplayTime = (timeStr, createdAt) => {
  // 1. Prioritize explicit check_in_time if present
  if (timeStr && timeStr !== '-' && timeStr !== '--:--') {
    const trimmed = String(timeStr).trim();
    // If already in 12h AM/PM format (e.g., "8:10 PM")
    if (trimmed.toLowerCase().includes('am') || trimmed.toLowerCase().includes('pm')) {
      return trimmed;
    }
    // If in 24h format (e.g., "20:10" or "08:10:00")
    const parts = trimmed.split(':');
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      const m = parts[1].substring(0, 2);
      if (!isNaN(h)) {
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        return `${h}:${m} ${ampm}`;
      }
    }
    return trimmed;
  }

  // 2. Fallback to createdAt timestamp only if timeStr is missing
  if (createdAt) {
    try {
      const dateObj = new Date(createdAt);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Phnom_Penh',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
    } catch (e) {
      console.warn('Time format error:', e);
    }
  }

  return '--:--';
};

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
  checkIn: async ({ student_id, session_id, confidence_score, snapshot_base64, notes, check_in_time, date }) => {
    const now = new Date();
    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Phnom_Penh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Phnom_Penh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const localTime = check_in_time || timeFormatter.format(now);
    const localDate = date || dateFormatter.format(now);

    const res = await fetch(`${API_BASE}/attendance/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id,
        session_id,
        confidence_score,
        snapshot_base64,
        notes,
        check_in_time: localTime,
        date: localDate
      }),
    });
    return res.json();
  },

  manualOverride: async ({ student_id, session_id, status, reason, notes, teacher_name, check_in_time, date }) => {
    const now = new Date();
    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Phnom_Penh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Phnom_Penh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const localTime = check_in_time || timeFormatter.format(now);
    const localDate = date || dateFormatter.format(now);

    const res = await fetch(`${API_BASE}/attendance/manual-override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id,
        session_id,
        status,
        reason,
        notes,
        teacher_name,
        check_in_time: localTime,
        date: localDate
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
