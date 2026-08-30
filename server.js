import express from 'express';
import cors from 'cors';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { supabase, isSupabaseConfigured, uploadToSupabaseStorage } from './supabaseClient.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure upload & model directories exist locally
const uploadDir = path.join(__dirname, 'public', 'uploads');
const snapshotsDir = path.join(__dirname, 'public', 'snapshots');
const modelsDir = path.join(__dirname, 'public', 'models');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(snapshotsDir)) fs.mkdirSync(snapshotsDir, { recursive: true });
if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(uploadDir));
app.use('/snapshots', express.static(snapshotsDir));
app.use('/models', express.static(modelsDir));

// Multer in-memory/disk storage
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// Local SQLite Database Setup (for fallback)
const dbPath = path.join(__dirname, 'attendance.db');
const db = new DatabaseSync(dbPath);

// Timezone helper for Asia/Phnom_Penh (UTC+7)
function getLocalDateTime(clientDate, clientTime) {
  if (clientDate && clientTime) {
    return { date: clientDate, time: clientTime };
  }
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

  return {
    date: clientDate || dateFormatter.format(now),
    time: clientTime || timeFormatter.format(now)
  };
}

// Initialize Local SQLite Tables (Fallback)
function initLocalDatabase() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        gender TEXT DEFAULT 'Other',
        major TEXT DEFAULT 'Computer Science',
        email TEXT,
        phone TEXT,
        class_name TEXT NOT NULL,
        photo_url TEXT,
        face_descriptor TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_code TEXT,
        name TEXT NOT NULL,
        course_name TEXT NOT NULL,
        major TEXT DEFAULT 'Computer Science',
        lecturer TEXT DEFAULT 'Professor',
        room TEXT DEFAULT 'Room 101',
        class_name TEXT NOT NULL,
        session_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT DEFAULT 'ACTIVE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        session_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        check_in_time TEXT NOT NULL,
        status TEXT DEFAULT 'PRESENT',
        check_in_method TEXT DEFAULT 'AI_FACE',
        confidence_score REAL DEFAULT 1.0,
        snapshot_url TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS system_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        details TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure active session exists if empty
    const sessionCount = db.prepare('SELECT COUNT(*) as count FROM sessions').get();
    if (sessionCount.count === 0) {
      const today = getLocalDateTime().date;
      const insertSession = db.prepare(`
        INSERT INTO sessions (session_code, name, course_name, major, lecturer, room, class_name, session_date, start_time, end_time, status)
        VALUES ('CS-401-M', 'Morning Session - AI & Computer Vision', 'CS-401: Artificial Intelligence', 'Computer Science', 'Dr. Sokha', 'Room 304', 'Year4 S1', ?, '08:00', '11:00', 'ACTIVE')
      `);
      insertSession.run(today);
    }
  } catch (error) {
    console.error('Error initializing local tables:', error);
  }
}

initLocalDatabase();

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// 1. Health Check
app.get('/api/health', (req, res) => {
  const useSupabase = isSupabaseConfigured();
  res.json({
    status: 'ok',
    mode: useSupabase ? 'supabase-cloud' : 'sqlite-local',
    supabaseConnected: useSupabase,
    time: getLocalDateTime()
  });
});

// Admin: Clear all data
app.post('/api/admin/clear-all', async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      await supabase.from('attendance').delete().neq('id', 0);
      await supabase.from('students').delete().neq('id', 0);
      await supabase.from('sessions').delete().neq('id', 0);
      await supabase.from('system_logs').delete().neq('id', 0);

      // Re-seed 1 active session in Supabase
      const today = getLocalDateTime().date;
      await supabase.from('sessions').insert({
        session_code: 'CS-401-M',
        name: 'Morning Session - AI & Computer Vision',
        course_name: 'CS-401: Artificial Intelligence',
        major: 'Computer Science',
        lecturer: 'Dr. Sokha',
        room: 'Room 304',
        class_name: 'Year4 S1',
        session_date: today,
        start_time: '08:00',
        end_time: '11:00',
        status: 'ACTIVE'
      });

      return res.json({ success: true, message: 'All Supabase database tables wiped and default session seeded.' });
    }

    // Local SQLite fallback
    db.exec(`
      DELETE FROM attendance;
      DELETE FROM students;
      DELETE FROM sessions;
      DELETE FROM system_logs;
      DELETE FROM sqlite_sequence WHERE name IN ('attendance', 'students', 'sessions', 'system_logs');
    `);

    const today = getLocalDateTime().date;
    const insertSession = db.prepare(`
      INSERT INTO sessions (session_code, name, course_name, major, lecturer, room, class_name, session_date, start_time, end_time, status)
      VALUES ('CS-401-M', 'Morning Session - AI & Computer Vision', 'CS-401: Artificial Intelligence', 'Computer Science', 'Dr. Sokha', 'Room 304', 'Year4 S1', ?, '08:00', '11:00', 'ACTIVE')
    `);
    insertSession.run(today);

    res.json({ success: true, message: 'All local database tables wiped completely.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Students API
app.get('/api/students', async (req, res) => {
  try {
    const { class_name, major, search } = req.query;

    if (isSupabaseConfigured()) {
      let query = supabase.from('students').select('*');
      if (major && major !== 'ALL') query = query.eq('major', major);
      if (class_name && class_name !== 'ALL') query = query.eq('class_name', class_name);
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,student_id.ilike.%${search}%,email.ilike.%${search}%`);
      }
      query = query.order('full_name', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      return res.json({ success: true, data: data || [] });
    }

    // Local SQLite
    let query = 'SELECT * FROM students WHERE 1=1';
    const params = [];
    if (major && major !== 'ALL') {
      query += ' AND major = ?';
      params.push(major);
    }
    if (class_name && class_name !== 'ALL') {
      query += ' AND class_name = ?';
      params.push(class_name);
    }
    if (search) {
      query += ' AND (full_name LIKE ? OR student_id LIKE ? OR email LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    query += ' ORDER BY full_name ASC';

    const students = db.prepare(query).all(...params);
    res.json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/students/:id', async (req, res) => {
  try {
    const studentId = req.params.id;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('students').select('*').eq('id', studentId).single();
      if (error || !data) return res.status(404).json({ success: false, error: 'Student not found' });
      return res.json({ success: true, data });
    }

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Register student
app.post('/api/students', upload.single('photo'), async (req, res) => {
  try {
    const { student_id, full_name, gender, major, email, phone, class_name, face_descriptor, photo_base64 } = req.body;

    if (!student_id || !full_name || !class_name) {
      return res.status(400).json({ success: false, error: 'Student ID, Full Name, and Class are required' });
    }

    const cleanStudentId = student_id.trim();
    const cleanFullName = full_name.trim();
    const cleanClass = class_name.trim();
    const cleanMajor = major ? major.trim() : 'Computer Science';
    const descriptorStr = typeof face_descriptor === 'object' ? JSON.stringify(face_descriptor) : (face_descriptor || null);

    let photo_url = req.body.photo_url || null;

    // Handle photo file or base64 upload
    if (req.file) {
      const filename = `student_${cleanStudentId}_${Date.now()}${path.extname(req.file.originalname) || '.jpg'}`;
      if (isSupabaseConfigured()) {
        photo_url = await uploadToSupabaseStorage(req.file.buffer, filename, req.file.mimetype || 'image/jpeg');
      } else {
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, req.file.buffer);
        photo_url = `/uploads/${filename}`;
      }
    } else if (photo_base64 && photo_base64.startsWith('data:image')) {
      const filename = `student_${cleanStudentId}_${Date.now()}.jpg`;
      if (isSupabaseConfigured()) {
        photo_url = await uploadToSupabaseStorage(photo_base64, filename, 'image/jpeg');
      } else {
        try {
          const base64Data = photo_base64.replace(/^data:image\/\w+;base64,/, '');
          const filePath = path.join(uploadDir, filename);
          fs.writeFileSync(filePath, base64Data, 'base64');
          photo_url = `/uploads/${filename}`;
        } catch (e) {
          photo_url = photo_base64;
        }
      }
    }

    if (isSupabaseConfigured()) {
      // Check duplicate Student ID
      const { data: existing } = await supabase.from('students').select('id').eq('student_id', cleanStudentId).single();
      if (existing) {
        return res.status(409).json({ success: false, error: `Student ID "${cleanStudentId}" is already registered.` });
      }

      const { data: created, error } = await supabase.from('students').insert({
        student_id: cleanStudentId,
        full_name: cleanFullName,
        gender: gender || 'Other',
        major: cleanMajor,
        email: email || null,
        phone: phone || null,
        class_name: cleanClass,
        photo_url: photo_url || null,
        face_descriptor: descriptorStr
      }).select().single();

      if (error) throw error;

      await supabase.from('system_logs').insert({
        event_type: 'STUDENT_REGISTER',
        details: `Registered student ${cleanFullName} (${cleanStudentId}) with face descriptor in Supabase.`
      });

      return res.status(201).json({
        success: true,
        message: 'Student registered successfully in Supabase Cloud',
        data: created
      });
    }

    // Local SQLite fallback
    const existing = db.prepare('SELECT id FROM students WHERE student_id = ?').get(cleanStudentId);
    if (existing) {
      return res.status(409).json({ success: false, error: `Student ID "${cleanStudentId}" is already registered.` });
    }

    const stmt = db.prepare(`
      INSERT INTO students (student_id, full_name, gender, major, email, phone, class_name, photo_url, face_descriptor)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      cleanStudentId,
      cleanFullName,
      gender || 'Other',
      cleanMajor,
      email || null,
      phone || null,
      cleanClass,
      photo_url,
      descriptorStr
    );

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: { id: Number(result.lastInsertRowid), student_id: cleanStudentId, full_name: cleanFullName }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update student
app.put('/api/students/:id', upload.single('photo'), async (req, res) => {
  try {
    const { full_name, gender, major, email, phone, class_name, face_descriptor, photo_base64 } = req.body;
    const studentId = req.params.id;

    if (isSupabaseConfigured()) {
      const { data: existing, error: findErr } = await supabase.from('students').select('*').eq('id', studentId).single();
      if (findErr || !existing) return res.status(404).json({ success: false, error: 'Student not found' });

      let photo_url = existing.photo_url;
      if (req.file) {
        const filename = `student_${existing.student_id}_${Date.now()}${path.extname(req.file.originalname) || '.jpg'}`;
        photo_url = await uploadToSupabaseStorage(req.file.buffer, filename, req.file.mimetype || 'image/jpeg');
      } else if (photo_base64 && photo_base64.startsWith('data:image')) {
        const filename = `student_${existing.student_id}_${Date.now()}.jpg`;
        photo_url = await uploadToSupabaseStorage(photo_base64, filename, 'image/jpeg');
      }

      const descriptor = face_descriptor !== undefined
        ? (typeof face_descriptor === 'object' ? JSON.stringify(face_descriptor) : face_descriptor)
        : existing.face_descriptor;

      const { error: updateErr } = await supabase.from('students').update({
        full_name: full_name || existing.full_name,
        gender: gender || existing.gender,
        major: major !== undefined ? major : (existing.major || 'Computer Science'),
        email: email !== undefined ? email : existing.email,
        phone: phone !== undefined ? phone : existing.phone,
        class_name: class_name || existing.class_name,
        photo_url: photo_url || existing.photo_url,
        face_descriptor: descriptor
      }).eq('id', studentId);

      if (updateErr) throw updateErr;
      return res.json({ success: true, message: 'Student updated successfully in Supabase' });
    }

    // Local SQLite
    const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    if (!existing) return res.status(404).json({ success: false, error: 'Student not found' });

    let photo_url = existing.photo_url;
    if (req.file) {
      const filename = `student_${existing.student_id}_${Date.now()}${path.extname(req.file.originalname) || '.jpg'}`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, req.file.buffer);
      photo_url = `/uploads/${filename}`;
    } else if (photo_base64 && photo_base64.startsWith('data:image')) {
      try {
        const base64Data = photo_base64.replace(/^data:image\/\w+;base64,/, '');
        const filename = `student_${existing.student_id}_${Date.now()}.jpg`;
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, base64Data, 'base64');
        photo_url = `/uploads/${filename}`;
      } catch (e) {
        photo_url = photo_base64;
      }
    }

    const descriptor = face_descriptor !== undefined
      ? (typeof face_descriptor === 'object' ? JSON.stringify(face_descriptor) : face_descriptor)
      : existing.face_descriptor;

    db.prepare(`
      UPDATE students 
      SET full_name = ?, gender = ?, major = ?, email = ?, phone = ?, class_name = ?, photo_url = ?, face_descriptor = ?
      WHERE id = ?
    `).run(
      full_name || existing.full_name,
      gender || existing.gender,
      major !== undefined ? major : (existing.major || 'Computer Science'),
      email !== undefined ? email : existing.email,
      phone !== undefined ? phone : existing.phone,
      class_name || existing.class_name,
      photo_url,
      descriptor,
      studentId
    );

    res.json({ success: true, message: 'Student updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    const studentId = req.params.id;
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('students').delete().eq('id', studentId);
      if (error) throw error;
      return res.json({ success: true, message: 'Student deleted successfully from Supabase' });
    }

    db.prepare('DELETE FROM students WHERE id = ?').run(studentId);
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Sessions API
app.get('/api/sessions', async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('session_date', { ascending: false })
        .order('start_time', { ascending: false });
      if (error) throw error;
      return res.json({ success: true, data: data || [] });
    }

    const sessions = db.prepare('SELECT * FROM sessions ORDER BY session_date DESC, start_time DESC').all();
    res.json({ success: true, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sessions', async (req, res) => {
  try {
    const { name, course_name, major, lecturer, room, class_name, session_date, start_time, end_time, session_code } = req.body;
    if (!name || !course_name || !class_name || !session_date) {
      return res.status(400).json({ success: false, error: 'Missing required session fields' });
    }

    const finalCode = session_code || `SESS-${Date.now().toString().slice(-4)}`;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('sessions').insert({
        session_code: finalCode,
        name: name.trim(),
        course_name: course_name.trim(),
        major: major ? major.trim() : 'Computer Science',
        lecturer: lecturer ? lecturer.trim() : 'Professor',
        room: room ? room.trim() : 'Room 101',
        class_name: class_name.trim(),
        session_date,
        start_time: start_time || '08:00',
        end_time: end_time || '11:00',
        status: 'ACTIVE'
      }).select().single();

      if (error) throw error;
      return res.status(201).json({ success: true, data });
    }

    const stmt = db.prepare(`
      INSERT INTO sessions (session_code, name, course_name, major, lecturer, room, class_name, session_date, start_time, end_time, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
    `);
    const result = stmt.run(
      finalCode,
      name.trim(),
      course_name.trim(),
      major ? major.trim() : 'Computer Science',
      lecturer ? lecturer.trim() : 'Professor',
      room ? room.trim() : 'Room 101',
      class_name.trim(),
      session_date,
      start_time || '08:00',
      end_time || '11:00'
    );

    res.status(201).json({ success: true, data: { id: Number(result.lastInsertRowid) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/sessions/:id', async (req, res) => {
  try {
    const { name, course_name, major, lecturer, room, class_name, session_date, start_time, end_time, status } = req.body;
    const sessionId = req.params.id;

    if (isSupabaseConfigured()) {
      const { data: existing, error: findErr } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
      if (findErr || !existing) return res.status(404).json({ success: false, error: 'Session not found' });

      const { error: updateErr } = await supabase.from('sessions').update({
        name: name || existing.name,
        course_name: course_name || existing.course_name,
        major: major !== undefined ? major : (existing.major || 'Computer Science'),
        lecturer: lecturer !== undefined ? lecturer : existing.lecturer,
        room: room !== undefined ? room : existing.room,
        class_name: class_name || existing.class_name,
        session_date: session_date || existing.session_date,
        start_time: start_time || existing.start_time,
        end_time: end_time || existing.end_time,
        status: status || existing.status
      }).eq('id', sessionId);

      if (updateErr) throw updateErr;
      return res.json({ success: true, message: 'Session updated successfully in Supabase' });
    }

    const existing = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
    if (!existing) return res.status(404).json({ success: false, error: 'Session not found' });

    db.prepare(`
      UPDATE sessions 
      SET name = ?, course_name = ?, major = ?, lecturer = ?, room = ?, class_name = ?, session_date = ?, start_time = ?, end_time = ?, status = ?
      WHERE id = ?
    `).run(
      name || existing.name,
      course_name || existing.course_name,
      major !== undefined ? major : (existing.major || 'Computer Science'),
      lecturer !== undefined ? lecturer : existing.lecturer,
      room !== undefined ? room : existing.room,
      class_name || existing.class_name,
      session_date || existing.session_date,
      start_time || existing.start_time,
      end_time || existing.end_time,
      status || existing.status,
      sessionId
    );

    res.json({ success: true, message: 'Session updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/sessions/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    if (isSupabaseConfigured()) {
      await supabase.from('attendance').delete().eq('session_id', sessionId);
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) throw error;
      return res.json({ success: true, message: 'Session deleted successfully from Supabase' });
    }

    db.prepare('DELETE FROM attendance WHERE session_id = ?').run(sessionId);
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Attendance API - Real-time Check-in
app.post('/api/attendance/check-in', async (req, res) => {
  try {
    const { student_id, session_id, confidence_score, snapshot_base64, notes } = req.body;

    if (!student_id || !session_id) {
      return res.status(400).json({ success: false, error: 'student_id and session_id are required' });
    }

    const { date: today, time: currentTime } = getLocalDateTime(req.body.date, req.body.check_in_time);

    if (isSupabaseConfigured()) {
      // Find Student
      let student = null;
      if (typeof student_id === 'number' || !isNaN(Number(student_id))) {
        const { data } = await supabase.from('students').select('*').eq('id', Number(student_id)).maybeSingle();
        student = data;
      }
      if (!student) {
        const { data } = await supabase.from('students').select('*').eq('student_id', String(student_id).trim()).maybeSingle();
        student = data;
      }
      if (!student) return res.status(404).json({ success: false, error: 'Student not found in Supabase' });

      // Find Session
      let session = null;
      if (session_id && (typeof session_id === 'number' || !isNaN(Number(session_id)))) {
        const { data } = await supabase.from('sessions').select('*').eq('id', Number(session_id)).maybeSingle();
        session = data;
      }
      if (!session) {
        const { data } = await supabase.from('sessions').select('*').eq('status', 'ACTIVE').order('id', { ascending: false }).limit(1).maybeSingle();
        session = data;
      }
      if (!session) return res.status(404).json({ success: false, error: 'No active session found' });

      // Check Duplicate
      const { data: existing } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', student.id)
        .eq('session_id', session.id)
        .eq('date', today)
        .maybeSingle();

      if (existing) {
        return res.status(409).json({
          success: false,
          isDuplicate: true,
          error: 'Duplicate Attendance',
          message: `${student.full_name} (${student.student_id}) has already checked in at ${existing.check_in_time}.`,
          data: { ...existing, full_name: student.full_name }
        });
      }

      // Calculate status
      let status = 'PRESENT';
      if (session.start_time) {
        const [sHour, sMin] = session.start_time.split(':').map(Number);
        const [cHour, cMin] = currentTime.split(':').map(Number);
        const sessionMinutes = sHour * 60 + sMin;
        const currentMinutes = cHour * 60 + cMin;
        if (currentMinutes > sessionMinutes + 15) {
          status = 'LATE';
        }
      }

      // Upload snapshot to Supabase Storage
      let snapshot_url = null;
      if (snapshot_base64 && snapshot_base64.startsWith('data:image')) {
        const snapFilename = `snap_${student.student_id}_${Date.now()}.jpg`;
        snapshot_url = await uploadToSupabaseStorage(snapshot_base64, snapFilename, 'image/jpeg');
      }

      const { data: inserted, error: insertErr } = await supabase.from('attendance').insert({
        student_id: student.id,
        session_id: session.id,
        date: today,
        check_in_time: currentTime,
        status,
        check_in_method: 'AI_FACE',
        confidence_score: confidence_score || 0.95,
        snapshot_url,
        notes: notes || 'Recognized via AI Camera'
      }).select().single();

      if (insertErr) throw insertErr;

      const createdRecord = {
        ...inserted,
        student_code: student.student_id,
        full_name: student.full_name,
        class_name: student.class_name,
        profile_photo: student.photo_url
      };

      return res.status(201).json({
        success: true,
        message: `Checked in successfully: ${student.full_name}`,
        data: createdRecord
      });
    }

    // Local SQLite Check-in
    let student = null;
    if (typeof student_id === 'number' || !isNaN(Number(student_id))) {
      student = db.prepare('SELECT * FROM students WHERE id = ?').get(Number(student_id));
    }
    if (!student) {
      student = db.prepare('SELECT * FROM students WHERE student_id = ?').get(String(student_id).trim());
    }
    if (!student) return res.status(404).json({ success: false, error: 'Student not found in database' });

    let session = null;
    if (session_id && (typeof session_id === 'number' || !isNaN(Number(session_id)))) {
      session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(Number(session_id));
    }
    if (!session) {
      session = db.prepare('SELECT * FROM sessions WHERE status = "ACTIVE" ORDER BY id DESC LIMIT 1').get() 
        || db.prepare('SELECT * FROM sessions ORDER BY id DESC LIMIT 1').get();
    }
    if (!session) return res.status(404).json({ success: false, error: 'No active session found' });

    const existing = db.prepare(`
      SELECT a.*, s.full_name 
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE a.student_id = ? AND a.session_id = ? AND a.date = ?
    `).get(student.id, session.id, today);

    if (existing) {
      return res.status(409).json({
        success: false,
        isDuplicate: true,
        error: 'Duplicate Attendance',
        message: `${student.full_name} (${student.student_id}) has already checked in at ${existing.check_in_time}.`,
        data: existing
      });
    }

    let status = 'PRESENT';
    if (session.start_time) {
      const [sHour, sMin] = session.start_time.split(':').map(Number);
      const [cHour, cMin] = currentTime.split(':').map(Number);
      const sessionMinutes = sHour * 60 + sMin;
      const currentMinutes = cHour * 60 + cMin;
      if (currentMinutes > sessionMinutes + 15) {
        status = 'LATE';
      }
    }

    let snapshot_url = null;
    if (snapshot_base64 && snapshot_base64.startsWith('data:image')) {
      const base64Data = snapshot_base64.replace(/^data:image\/\w+;base64,/, '');
      const filename = `snap_${student.student_id}_${Date.now()}.jpg`;
      const filePath = path.join(snapshotsDir, filename);
      fs.writeFileSync(filePath, base64Data, 'base64');
      snapshot_url = `/snapshots/${filename}`;
    }

    const stmt = db.prepare(`
      INSERT INTO attendance (student_id, session_id, date, check_in_time, status, check_in_method, confidence_score, snapshot_url, notes)
      VALUES (?, ?, ?, ?, ?, 'AI_FACE', ?, ?, ?)
    `);

    const result = stmt.run(
      student.id,
      session.id,
      today,
      currentTime,
      status,
      confidence_score || 0.95,
      snapshot_url,
      notes || 'Recognized via AI Camera'
    );

    const createdRecord = db.prepare(`
      SELECT a.*, s.student_id as student_code, s.full_name, s.class_name, s.photo_url as profile_photo
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE a.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: `Checked in successfully: ${student.full_name}`,
      data: createdRecord
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Manual Fallback Check-in
app.post('/api/attendance/manual-override', async (req, res) => {
  try {
    const { student_id, session_id, status, reason, notes, teacher_name } = req.body;

    if (!student_id || !session_id) {
      return res.status(400).json({ success: false, error: 'student_id and session_id are required' });
    }

    const { date: today, time: currentTime } = getLocalDateTime(req.body.date, req.body.check_in_time);
    const combinedNotes = `Manual Fallback: [${reason || 'AI Recognition Failure'}]. ${notes || ''} (Approved by: ${teacher_name || 'Teacher'})`;

    if (isSupabaseConfigured()) {
      const { data: student } = await supabase.from('students').select('*').eq('id', student_id).single();
      if (!student) return res.status(404).json({ success: false, error: 'Student not found in Supabase' });

      const { data: existing } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', student_id)
        .eq('session_id', session_id)
        .eq('date', today)
        .maybeSingle();

      let attendanceRecord;
      if (existing) {
        const { data, error } = await supabase.from('attendance').update({
          status: status || 'PRESENT',
          check_in_method: 'MANUAL_OVERRIDE',
          notes: combinedNotes,
          check_in_time: currentTime
        }).eq('id', existing.id).select().single();
        if (error) throw error;
        attendanceRecord = data;
      } else {
        const { data, error } = await supabase.from('attendance').insert({
          student_id,
          session_id,
          date: today,
          check_in_time: currentTime,
          status: status || 'PRESENT',
          check_in_method: 'MANUAL_OVERRIDE',
          confidence_score: 1.0,
          notes: combinedNotes
        }).select().single();
        if (error) throw error;
        attendanceRecord = data;
      }

      await supabase.from('system_logs').insert({
        event_type: 'MANUAL_OVERRIDE',
        details: `Teacher manual attendance override for ${student.full_name} (${student.student_id}). Reason: ${reason}`
      });

      return res.json({
        success: true,
        message: `Manual attendance recorded for ${student.full_name}`,
        data: {
          ...attendanceRecord,
          student_code: student.student_id,
          full_name: student.full_name,
          class_name: student.class_name
        }
      });
    }

    // Local SQLite fallback
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

    const existing = db.prepare(`
      SELECT * FROM attendance WHERE student_id = ? AND session_id = ? AND date = ?
    `).get(student_id, session_id, today);

    let attendanceId;
    if (existing) {
      db.prepare(`
        UPDATE attendance 
        SET status = ?, check_in_method = 'MANUAL_OVERRIDE', notes = ?, check_in_time = ?
        WHERE id = ?
      `).run(status || 'PRESENT', combinedNotes, currentTime, existing.id);
      attendanceId = existing.id;
    } else {
      const stmt = db.prepare(`
        INSERT INTO attendance (student_id, session_id, date, check_in_time, status, check_in_method, confidence_score, notes)
        VALUES (?, ?, ?, ?, ?, 'MANUAL_OVERRIDE', 1.0, ?)
      `);
      const result = stmt.run(student_id, session_id, today, currentTime, status || 'PRESENT', combinedNotes);
      attendanceId = result.lastInsertRowid;
    }

    const updatedRecord = db.prepare(`
      SELECT a.*, s.student_id as student_code, s.full_name, s.class_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE a.id = ?
    `).get(attendanceId);

    res.json({
      success: true,
      message: `Manual attendance recorded for ${student.full_name}`,
      data: updatedRecord
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Attendance Summary & Present/Absent Lists
app.get('/api/attendance/summary', async (req, res) => {
  try {
    const { session_id, date } = req.query;

    if (!session_id) {
      return res.status(400).json({ success: false, error: 'session_id is required' });
    }

    if (isSupabaseConfigured()) {
      const { data: session, error: sessErr } = await supabase.from('sessions').select('*').eq('id', session_id).single();
      if (sessErr || !session) return res.status(404).json({ success: false, error: 'Session not found' });

      const queryDate = date || session.session_date || getLocalDateTime().date;

      // Enrolled students in class
      const { data: totalStudents } = await supabase
        .from('students')
        .select('*')
        .eq('class_name', session.class_name)
        .order('full_name', { ascending: true });

      // Attendance records joined with students
      const { data: attendanceRecords } = await supabase
        .from('attendance')
        .select('*, students(student_id, full_name, gender, class_name, photo_url)')
        .eq('session_id', session_id)
        .eq('date', queryDate)
        .order('check_in_time', { ascending: false });

      const formattedRecords = (attendanceRecords || []).map(r => ({
        ...r,
        student_code: r.students?.student_id,
        full_name: r.students?.full_name,
        gender: r.students?.gender,
        class_name: r.students?.class_name,
        profile_photo: r.students?.photo_url
      }));

      const presentMap = new Map();
      formattedRecords.forEach(rec => presentMap.set(rec.student_id, rec));

      const presentList = [];
      const lateList = [];
      const absentList = [];

      (totalStudents || []).forEach(stu => {
        if (presentMap.has(stu.id)) {
          const record = presentMap.get(stu.id);
          if (record.status === 'LATE') {
            lateList.push(record);
          } else {
            presentList.push(record);
          }
        } else {
          absentList.push({
            id: null,
            student_id: stu.id,
            student_code: stu.student_id,
            full_name: stu.full_name,
            gender: stu.gender,
            class_name: stu.class_name,
            profile_photo: stu.photo_url,
            status: 'ABSENT',
            date: queryDate,
            check_in_time: '-'
          });
        }
      });

      const totalCount = (totalStudents || []).length;
      const presentCount = presentList.length;
      const lateCount = lateList.length;
      const absentCount = absentList.length;
      const attendanceRate = totalCount > 0 ? Math.round(((presentCount + lateCount) / totalCount) * 100) : 0;

      return res.json({
        success: true,
        data: {
          session,
          date: queryDate,
          stats: {
            totalCount,
            presentCount,
            lateCount,
            absentCount,
            attendanceRate
          },
          presentList,
          lateList,
          absentList,
          allRecords: formattedRecords
        }
      });
    }

    // Local SQLite fallback
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session_id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

    const queryDate = date || session.session_date || getLocalDateTime().date;

    const totalStudents = db.prepare(
      'SELECT * FROM students WHERE class_name = ? ORDER BY full_name ASC'
    ).all(session.class_name);

    const attendanceRecords = db.prepare(`
      SELECT a.*, s.student_id as student_code, s.full_name, s.gender, s.class_name, s.photo_url as profile_photo
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE a.session_id = ? AND a.date = ?
      ORDER BY a.check_in_time DESC
    `).all(session_id, queryDate);

    const presentMap = new Map();
    attendanceRecords.forEach(rec => presentMap.set(rec.student_id, rec));

    const presentList = [];
    const lateList = [];
    const absentList = [];

    totalStudents.forEach(stu => {
      if (presentMap.has(stu.id)) {
        const record = presentMap.get(stu.id);
        if (record.status === 'LATE') {
          lateList.push(record);
        } else {
          presentList.push(record);
        }
      } else {
        absentList.push({
          id: null,
          student_id: stu.id,
          student_code: stu.student_id,
          full_name: stu.full_name,
          gender: stu.gender,
          class_name: stu.class_name,
          profile_photo: stu.photo_url,
          status: 'ABSENT',
          date: queryDate,
          check_in_time: '-'
        });
      }
    });

    const totalCount = totalStudents.length;
    const presentCount = presentList.length;
    const lateCount = lateList.length;
    const absentCount = absentList.length;
    const attendanceRate = totalCount > 0 ? Math.round(((presentCount + lateCount) / totalCount) * 100) : 0;

    res.json({
      success: true,
      data: {
        session,
        date: queryDate,
        stats: {
          totalCount,
          presentCount,
          lateCount,
          absentCount,
          attendanceRate
        },
        presentList,
        lateList,
        absentList,
        allRecords: attendanceRecords
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Attendance Reports & Export
app.get('/api/attendance/reports', async (req, res) => {
  try {
    const { start_date, end_date, major, class_name, status, search } = req.query;

    if (isSupabaseConfigured()) {
      let query = supabase
        .from('attendance')
        .select('*, students(student_id, full_name, gender, major, class_name), sessions(name, course_name, major)')
        .order('date', { ascending: false })
        .order('check_in_time', { ascending: false });

      if (start_date) query = query.gte('date', start_date);
      if (end_date) query = query.lte('date', end_date);
      if (status && status !== 'ALL') query = query.eq('status', status);

      const { data, error } = await query;
      if (error) throw error;

      let formatted = (data || []).map(r => ({
        ...r,
        student_code: r.students?.student_id,
        full_name: r.students?.full_name,
        gender: r.students?.gender,
        major: r.students?.major || r.sessions?.major,
        class_name: r.students?.class_name,
        session_name: r.sessions?.name,
        course_name: r.sessions?.course_name
      }));

      if (major && major !== 'ALL') {
        formatted = formatted.filter(r => r.major === major);
      }
      if (class_name && class_name !== 'ALL') {
        formatted = formatted.filter(r => r.class_name === class_name);
      }
      if (search) {
        const term = search.toLowerCase();
        formatted = formatted.filter(r =>
          r.full_name?.toLowerCase().includes(term) ||
          r.student_code?.toLowerCase().includes(term) ||
          r.session_name?.toLowerCase().includes(term)
        );
      }

      return res.json({ success: true, data: formatted });
    }

    // Local SQLite fallback
    let query = `
      SELECT a.*, s.student_id as student_code, s.full_name, s.gender, s.major, s.class_name, 
             sess.name as session_name, sess.course_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN sessions sess ON a.session_id = sess.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += ' AND a.date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND a.date <= ?';
      params.push(end_date);
    }
    if (major && major !== 'ALL') {
      query += ' AND (s.major = ? OR sess.major = ?)';
      params.push(major, major);
    }
    if (class_name && class_name !== 'ALL') {
      query += ' AND s.class_name = ?';
      params.push(class_name);
    }
    if (status && status !== 'ALL') {
      query += ' AND a.status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (s.full_name LIKE ? OR s.student_id LIKE ? OR sess.name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY a.date DESC, s.full_name ASC, a.check_in_time DESC';

    const records = db.prepare(query).all(...params);
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Delete Attendance record
app.delete('/api/attendance/:id', async (req, res) => {
  try {
    const attendanceId = req.params.id;
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('attendance').delete().eq('id', attendanceId);
      if (error) throw error;
      return res.json({ success: true, message: 'Attendance record deleted from Supabase' });
    }

    db.prepare('DELETE FROM attendance WHERE id = ?').run(attendanceId);
    res.json({ success: true, message: 'Attendance record deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend Express API Server running on port ${PORT}`);
  console.log(`📡 Storage & DB Engine: ${isSupabaseConfigured() ? 'Supabase Cloud PostgreSQL & Storage' : 'Local SQLite & Local Disk'}`);
});
