import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function viewDatabase() {
  const dbPath = path.join(__dirname, 'attendance.db');
  const db = new DatabaseSync(dbPath);

  console.log('\n===========================================================');
  console.log('                 👥 1. REGISTERED STUDENTS                 ');
  console.log('===========================================================');
  const students = db.prepare(`
    SELECT id, student_id, full_name, gender, major, class_name, 
           CASE WHEN face_descriptor IS NOT NULL THEN '128-D Vector ✓' ELSE 'None' END as biometrics,
           created_at
    FROM students 
    ORDER BY id ASC
  `).all();
  if (students.length === 0) {
    console.log('   (No students registered yet)');
  } else {
    console.table(students);
  }

  console.log('\n===========================================================');
  console.log('                 📅 2. CLASS SESSIONS                      ');
  console.log('===========================================================');
  const sessions = db.prepare(`
    SELECT id, session_code, name, course_name, major, lecturer, room, class_name, session_date, start_time || ' - ' || end_time as time_slot, status
    FROM sessions 
    ORDER BY id ASC
  `).all();
  if (sessions.length === 0) {
    console.log('   (No sessions created yet)');
  } else {
    console.table(sessions);
  }

  console.log('\n===========================================================');
  console.log('                 📊 3. ATTENDANCE LOGS                     ');
  console.log('===========================================================');
  const attendance = db.prepare(`
    SELECT a.id, s.student_id, s.full_name, sess.name as session_name, a.date, a.check_in_time, a.status, a.check_in_method, a.confidence_score, a.created_at
    FROM attendance a
    LEFT JOIN students s ON a.student_id = s.id
    LEFT JOIN sessions sess ON a.session_id = sess.id
    ORDER BY a.id DESC
  `).all();
  if (attendance.length === 0) {
    console.log('   (No attendance records yet)');
  } else {
    console.table(attendance);
  }
  console.log('\n===========================================================\n');
}

viewDatabase();
