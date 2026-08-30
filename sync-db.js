import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncFromCloud() {
  console.log('🔄 Connecting to Cloud Database (Render)...');
  const dbPath = path.join(__dirname, 'attendance.db');
  const db = new DatabaseSync(dbPath);

  try {
    const studentsRes = await (await fetch('https://ai-attendent-system.onrender.com/api/students')).json();
    const sessionsRes = await (await fetch('https://ai-attendent-system.onrender.com/api/sessions')).json();
    const reportsRes = await (await fetch('https://ai-attendent-system.onrender.com/api/attendance/reports')).json();

    if (studentsRes.data) {
      for (const s of studentsRes.data) {
        db.prepare(`
          INSERT OR REPLACE INTO students (id, student_id, full_name, gender, major, email, phone, class_name, photo_url, face_descriptor, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          s.id, s.student_id, s.full_name, s.gender || 'Other', s.major || 'Computer Science', s.email || null, s.phone || null, s.class_name, s.photo_url || null, s.face_descriptor || null, s.created_at || new Date().toISOString()
        );
      }
    }

    if (sessionsRes.data) {
      for (const sess of sessionsRes.data) {
        db.prepare(`
          INSERT OR REPLACE INTO sessions (id, session_code, name, course_name, major, lecturer, room, class_name, session_date, start_time, end_time, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          sess.id, sess.session_code, sess.name, sess.course_name, sess.major, sess.lecturer, sess.room, sess.class_name, sess.session_date, sess.start_time, sess.end_time, sess.status, sess.created_at || new Date().toISOString()
        );
      }
    }

    if (reportsRes.data) {
      for (const r of reportsRes.data) {
        db.prepare(`
          INSERT OR REPLACE INTO attendance (id, student_id, session_id, date, check_in_time, status, check_in_method, confidence_score, snapshot_url, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          r.id, r.student_id, r.session_id, r.date, r.check_in_time, r.status, r.check_in_method, r.confidence_score || 1.0, r.snapshot_url || null, r.notes || null, r.created_at || new Date().toISOString()
        );
      }
    }

    console.log(`✅ Synced successfully: ${studentsRes.data?.length || 0} students, ${sessionsRes.data?.length || 0} sessions, ${reportsRes.data?.length || 0} attendance records.`);
  } catch (err) {
    console.error('❌ Cloud sync error:', err.message);
  }
}

syncFromCloud();
