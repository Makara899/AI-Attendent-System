import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { supabase, isSupabaseConfigured, uploadToSupabaseStorage } from './supabaseClient.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateToSupabase() {
  console.log('\n=============================================================');
  console.log('🚀 Starting Data Migration: SQLite (Local) ➡️ Supabase Cloud');
  console.log('=============================================================\n');

  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase is not configured in .env file!');
    console.error('Please open .env and set:');
    console.error('SUPABASE_URL=https://xxxx.supabase.co');
    console.error('SUPABASE_SERVICE_ROLE_KEY=ey...\n');
    process.exit(1);
  }

  const dbPath = path.join(__dirname, 'attendance.db');
  if (!fs.existsSync(dbPath)) {
    console.log('ℹ️ No local attendance.db found. Nothing to migrate.');
    process.exit(0);
  }

  const db = new DatabaseSync(dbPath);

  try {
    // 1. Migrate Students
    console.log('📦 1. Reading students from SQLite...');
    let localStudents = [];
    try {
      localStudents = db.prepare('SELECT * FROM students').all();
    } catch (e) {
      console.log('   (No students table or empty)');
    }

    console.log(`   Found ${localStudents.length} local student records.`);
    let migratedStudentsCount = 0;

    for (const student of localStudents) {
      let photo_url = student.photo_url;

      // Check if photo exists locally in public/uploads and upload to Supabase Storage
      if (photo_url && photo_url.startsWith('/uploads/')) {
        const localPhotoPath = path.join(__dirname, 'public', photo_url);
        if (fs.existsSync(localPhotoPath)) {
          const fileBuffer = fs.readFileSync(localPhotoPath);
          const filename = path.basename(localPhotoPath);
          const cloudPhotoUrl = await uploadToSupabaseStorage(fileBuffer, filename);
          if (cloudPhotoUrl) {
            photo_url = cloudPhotoUrl;
          }
        }
      }

      const { error } = await supabase.from('students').upsert({
        id: student.id,
        student_id: student.student_id,
        full_name: student.full_name,
        gender: student.gender || 'Other',
        major: student.major || 'Computer Science',
        email: student.email || null,
        phone: student.phone || null,
        class_name: student.class_name,
        photo_url,
        face_descriptor: student.face_descriptor,
        created_at: student.created_at || new Date().toISOString()
      }, { onConflict: 'student_id' });

      if (error) {
        console.warn(`   ⚠️ Could not migrate student ${student.student_id}:`, error.message);
      } else {
        migratedStudentsCount++;
      }
    }
    console.log(`   ✅ Successfully migrated ${migratedStudentsCount} students to Supabase.`);

    // 2. Migrate Sessions
    console.log('\n📦 2. Reading sessions from SQLite...');
    let localSessions = [];
    try {
      localSessions = db.prepare('SELECT * FROM sessions').all();
    } catch (e) {
      console.log('   (No sessions table or empty)');
    }

    console.log(`   Found ${localSessions.length} local session records.`);
    let migratedSessionsCount = 0;

    for (const sess of localSessions) {
      const { error } = await supabase.from('sessions').upsert({
        id: sess.id,
        session_code: sess.session_code,
        name: sess.name,
        course_name: sess.course_name,
        major: sess.major || 'Computer Science',
        lecturer: sess.lecturer || 'Professor',
        room: sess.room || 'Room 101',
        class_name: sess.class_name,
        session_date: sess.session_date,
        start_time: sess.start_time,
        end_time: sess.end_time,
        status: sess.status || 'ACTIVE',
        created_at: sess.created_at || new Date().toISOString()
      });

      if (error) {
        console.warn(`   ⚠️ Could not migrate session ${sess.name}:`, error.message);
      } else {
        migratedSessionsCount++;
      }
    }
    console.log(`   ✅ Successfully migrated ${migratedSessionsCount} sessions to Supabase.`);

    // 3. Migrate Attendance
    console.log('\n📦 3. Reading attendance records from SQLite...');
    let localAttendance = [];
    try {
      localAttendance = db.prepare('SELECT * FROM attendance').all();
    } catch (e) {
      console.log('   (No attendance table or empty)');
    }

    console.log(`   Found ${localAttendance.length} local attendance records.`);
    let migratedAttendanceCount = 0;

    for (const att of localAttendance) {
      let snapshot_url = att.snapshot_url;
      if (snapshot_url && snapshot_url.startsWith('/snapshots/')) {
        const localSnapPath = path.join(__dirname, 'public', snapshot_url);
        if (fs.existsSync(localSnapPath)) {
          const fileBuffer = fs.readFileSync(localSnapPath);
          const filename = path.basename(localSnapPath);
          const cloudSnapUrl = await uploadToSupabaseStorage(fileBuffer, filename);
          if (cloudSnapUrl) {
            snapshot_url = cloudSnapUrl;
          }
        }
      }

      const { error } = await supabase.from('attendance').upsert({
        id: att.id,
        student_id: att.student_id,
        session_id: att.session_id,
        date: att.date,
        check_in_time: att.check_in_time,
        status: att.status || 'PRESENT',
        check_in_method: att.check_in_method || 'AI_FACE',
        confidence_score: att.confidence_score || 1.0,
        snapshot_url,
        notes: att.notes || null,
        created_at: att.created_at || new Date().toISOString()
      });

      if (error) {
        console.warn(`   ⚠️ Could not migrate attendance #${att.id}:`, error.message);
      } else {
        migratedAttendanceCount++;
      }
    }
    console.log(`   ✅ Successfully migrated ${migratedAttendanceCount} attendance logs to Supabase.`);

    console.log('\n=============================================================');
    console.log('🎉 Migration Completed Successfully!');
    console.log('All student face biometrics, sessions, and attendance data');
    console.log('are now permanently backed up in Supabase PostgreSQL.');
    console.log('=============================================================\n');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  }
}

migrateToSupabase();
