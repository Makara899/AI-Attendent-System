import express from 'express';
import cors from 'cors';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure upload & model directories exist
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

// Multer storage for student profile photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `student_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({ storage });

// SQLite Database Setup using Node 24 Native node:sqlite
const dbPath = path.join(__dirname, 'attendance.db');
const db = new DatabaseSync(dbPath);
console.log('✅ Connected to SQLite database:', dbPath);

// Initialize Tables & Seed
function initDatabase() {
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

    // Migrate new columns if missing
    try { db.exec("ALTER TABLE students ADD COLUMN major TEXT DEFAULT 'Computer Science'"); } catch(e) {}
    try { db.exec("ALTER TABLE sessions ADD COLUMN major TEXT DEFAULT 'Computer Science'"); } catch(e) {}
    try { db.exec("ALTER TABLE sessions ADD COLUMN lecturer TEXT DEFAULT 'Professor'"); } catch(e) {}
    try { db.exec("ALTER TABLE sessions ADD COLUMN room TEXT DEFAULT 'Room 101'"); } catch(e) {}

    // Ensure active session exists if empty
    const sessionCount = db.prepare('SELECT COUNT(*) as count FROM sessions').get();
    if (sessionCount.count === 0) {
      const today = new Date().toISOString().split('T')[0];
      const insertSession = db.prepare(`
        INSERT INTO sessions (session_code, name, course_name, major, lecturer, room, class_name, session_date, start_time, end_time, status)
        VALUES ('CS-401-M', 'Morning Session - AI & Computer Vision', 'CS-401: Artificial Intelligence', 'Computer Science', 'Dr. Sokha', 'Room 304', 'Year4 S1', ?, '08:00', '11:00', 'ACTIVE')
      `);
      insertSession.run(today);
      console.log('🌱 Seeded 1 default active session.');
    }

  } catch (error) {
    console.error('Error initializing tables:', error);
  }
}

initDatabase();

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: 'sqlite-native', time: new Date().toISOString() });
});

// Admin: Clear all data
app.post('/api/admin/clear-all', (req, res) => {
  try {
    db.exec(`
      DELETE FROM attendance;
      DELETE FROM students;
      DELETE FROM sessions;
      DELETE FROM system_logs;
      DELETE FROM sqlite_sequence WHERE name IN ('attendance', 'students', 'sessions', 'system_logs');
    `);

    // Clean uploads
    if (fs.existsSync(uploadDir)) {
      fs.readdirSync(uploadDir).forEach(f => {
        try { fs.unlinkSync(path.join(uploadDir, f)); } catch(e) {}
      });
    }
    if (fs.existsSync(snapshotsDir)) {
      fs.readdirSync(snapshotsDir).forEach(f => {
        try { fs.unlinkSync(path.join(snapshotsDir, f)); } catch(e) {}
      });
    }

    // Seed 1 active session
    const today = new Date().toISOString().split('T')[0];
    const insertSession = db.prepare(`
      INSERT INTO sessions (session_code, name, course_name, major, lecturer, room, class_name, session_date, start_time, end_time, status)
      VALUES ('CS-401-M', 'Morning Session - AI & Computer Vision', 'CS-401: Artificial Intelligence', 'Computer Science', 'Dr. Sokha', 'Room 304', 'Year4 S1', ?, '08:00', '11:00', 'ACTIVE')
    `);
    insertSession.run(today);

    res.json({ success: true, message: 'All database tables and photo files wiped completely.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Students API (Sorted A-Z by Full Name)
app.get('/api/students', (req, res) => {
  try {
    const { class_name, major, search } = req.query;
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

app.get('/api/students/:id', (req, res) => {
  try {
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Register student
app.post('/api/students', upload.single('photo'), (req, res) => {
  try {
    const { student_id, full_name, gender, major, email, phone, class_name, face_descriptor, photo_base64 } = req.body;

    if (!student_id || !full_name || !class_name) {
      return res.status(400).json({ success: false, error: 'Student ID, Full Name, and Class are required' });
    }

    let photo_url = req.file ? `/uploads/${req.file.filename}` : req.body.photo_url || null;
    if (!photo_url && photo_base64 && photo_base64.startsWith('data:image')) {
      try {
        const base64Data = photo_base64.replace(/^data:image\/\w+;base64,/, '');
        const filename = `student_${student_id.trim()}_${Date.now()}.jpg`;
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, base64Data, 'base64');
        photo_url = `/uploads/${filename}`;
      } catch (e) {
        console.warn('Base64 photo save error:', e);
      }
    }

    const descriptorStr = typeof face_descriptor === 'object' ? JSON.stringify(face_descriptor) : (face_descriptor || null);

    // Check duplicate Student ID
    const existing = db.prepare('SELECT id FROM students WHERE student_id = ?').get(student_id.trim());
    if (existing) {
      return res.status(409).json({ success: false, error: `Student ID "${student_id}" is already registered.` });
    }

    const stmt = db.prepare(`
      INSERT INTO students (student_id, full_name, gender, major, email, phone, class_name, photo_url, face_descriptor)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      student_id.trim(),
      full_name.trim(),
      gender || 'Other',
      major ? major.trim() : 'Computer Science',
      email || null,
      phone || null,
      class_name.trim(),
      photo_url,
      descriptorStr
    );

    db.prepare('INSERT INTO system_logs (event_type, details) VALUES (?, ?)').run(
      'STUDENT_REGISTER',
      `Registered student ${full_name} (${student_id}) with face descriptor.`
    );

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: { id: Number(result.lastInsertRowid), student_id, full_name }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update student
app.put('/api/students/:id', upload.single('photo'), (req, res) => {
  try {
    const { full_name, gender, major, email, phone, class_name, face_descriptor, photo_base64 } = req.body;
    const studentId = req.params.id;

    const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    if (!existing) return res.status(404).json({ success: false, error: 'Student not found' });

    let photo_url = req.file ? `/uploads/${req.file.filename}` : existing.photo_url;
    if (photo_base64 && photo_base64.startsWith('data:image')) {
      try {
        const base64Data = photo_base64.replace(/^data:image\/\w+;base64,/, '');
        const filename = `student_${existing.student_id}_${Date.now()}.jpg`;
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, base64Data, 'base64');
        photo_url = `/uploads/${filename}`;
      } catch (e) {
        console.warn('Base64 photo update error:', e);
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

app.delete('/api/students/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Sessions API
app.get('/api/sessions', (req, res) => {
  try {
    const sessions = db.prepare('SELECT * FROM sessions ORDER BY session_date DESC, start_time DESC').all();
    res.json({ success: true, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sessions', (req, res) => {
  try {
    const { name, course_name, major, lecturer, room, class_name, session_date, start_time, end_time, session_code } = req.body;
    if (!name || !course_name || !class_name || !session_date) {
      return res.status(400).json({ success: false, error: 'Missing required session fields (name, course_name, class_name, session_date)' });
    }

    const finalCode = session_code || `SESS-${Date.now().toString().slice(-4)}`;

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

app.put('/api/sessions/:id', (req, res) => {
  try {
    const { name, course_name, major, lecturer, room, class_name, session_date, start_time, end_time, status } = req.body;
    const sessionId = req.params.id;

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

app.delete('/api/sessions/:id', (req, res) => {
  try {
    const sessionId = req.params.id;
    db.prepare('DELETE FROM attendance WHERE session_id = ?').run(sessionId);
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Attendance API - Real-time Check-in with Duplicate Prevention
app.post('/api/attendance/check-in', (req, res) => {
  try {
    const { student_id, session_id, confidence_score, snapshot_base64, notes } = req.body;

    if (!student_id || !session_id) {
      return res.status(400).json({ success: false, error: 'student_id and session_id are required' });
    }

    // Verify student exists (support database integer ID or string student code like STU-001)
    let student = null;
    if (typeof student_id === 'number' || !isNaN(Number(student_id))) {
      student = db.prepare('SELECT * FROM students WHERE id = ?').get(Number(student_id));
    }
    if (!student) {
      student = db.prepare('SELECT * FROM students WHERE student_id = ?').get(String(student_id).trim());
    }
    if (!student) return res.status(404).json({ success: false, error: 'Student not found in database' });

    // Verify session exists or fallback to most recent active session
    let session = null;
    if (session_id && (typeof session_id === 'number' || !isNaN(Number(session_id)))) {
      session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(Number(session_id));
    }
    if (!session) {
      session = db.prepare('SELECT * FROM sessions WHERE status = "ACTIVE" ORDER BY id DESC LIMIT 1').get() 
        || db.prepare('SELECT * FROM sessions ORDER BY id DESC LIMIT 1').get();
    }
    if (!session) return res.status(404).json({ success: false, error: 'No active session found' });

    const finalStudentDbId = student.id;
    const finalSessionId = session.id;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

    // DUPLICATE CHECK: Prevent duplicate check-in for the same session today
    const existing = db.prepare(`
      SELECT a.*, s.full_name 
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE a.student_id = ? AND a.session_id = ? AND a.date = ?
    `).get(finalStudentDbId, finalSessionId, today);

    if (existing) {
      return res.status(409).json({
        success: false,
        isDuplicate: true,
        error: 'Duplicate Attendance',
        message: `${student.full_name} (${student.student_id}) has already checked in at ${existing.check_in_time}.`,
        data: existing
      });
    }

    // Determine status (PRESENT or LATE based on session start_time + 15 mins grace period)
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

    // Save snapshot image if provided
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
      finalStudentDbId,
      finalSessionId,
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

// 5. Manual Fallback Check-in (Requirement #7: AI fails to recognize)
app.post('/api/attendance/manual-override', (req, res) => {
  try {
    const { student_id, session_id, status, reason, notes, teacher_name } = req.body;

    if (!student_id || !session_id) {
      return res.status(400).json({ success: false, error: 'student_id and session_id are required' });
    }

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);

    const existing = db.prepare(`
      SELECT * FROM attendance WHERE student_id = ? AND session_id = ? AND date = ?
    `).get(student_id, session_id, today);

    const combinedNotes = `Manual Fallback: [${reason || 'AI Recognition Failure'}]. ${notes || ''} (Approved by: ${teacher_name || 'Teacher'})`;

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

    db.prepare('INSERT INTO system_logs (event_type, details) VALUES (?, ?)').run(
      'MANUAL_OVERRIDE',
      `Teacher manual attendance override for ${student.full_name} (${student.student_id}). Reason: ${reason}`
    );

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
app.get('/api/attendance/summary', (req, res) => {
  try {
    const { session_id, date } = req.query;

    if (!session_id) {
      return res.status(400).json({ success: false, error: 'session_id is required' });
    }

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session_id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

    const queryDate = date || session.session_date || new Date().toISOString().split('T')[0];

    // Enrolled students in class
    const totalStudents = db.prepare(
      'SELECT * FROM students WHERE class_name = ? ORDER BY full_name ASC'
    ).all(session.class_name);

    // Attendance records
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

// 7. Attendance History & Report Export Query
app.get('/api/attendance/reports', (req, res) => {
  try {
    const { start_date, end_date, major, class_name, status, search } = req.query;

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
app.delete('/api/attendance/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM attendance WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Attendance record deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend Express API Server running on port ${PORT}`);
});
