async function viewCloudDatabase() {
  console.log('\n🌐 Connecting to Live Render Cloud Database (https://ai-attendent-system.onrender.com)...\n');

  try {
    const [studentsRes, sessionsRes, reportsRes] = await Promise.all([
      fetch('https://ai-attendent-system.onrender.com/api/students').then(r => r.json()),
      fetch('https://ai-attendent-system.onrender.com/api/sessions').then(r => r.json()),
      fetch('https://ai-attendent-system.onrender.com/api/attendance/reports').then(r => r.json())
    ]);

    console.log('===========================================================');
    console.log('            👥 LIVE RENDER STUDENTS (CLOUD)                ');
    console.log('===========================================================');
    const students = (studentsRes.data || []).map(s => ({
      id: s.id,
      student_id: s.student_id,
      full_name: s.full_name,
      gender: s.gender || 'Other',
      major: s.major || 'Computer Science',
      class_name: s.class_name,
      biometrics: s.face_descriptor ? '128-D Vector ✓' : 'None',
      created_at: s.created_at
    }));
    if (students.length === 0) {
      console.log('   (No students registered on Render cloud yet)');
    } else {
      console.table(students);
    }

    console.log('\n===========================================================');
    console.log('            📅 LIVE RENDER SESSIONS (CLOUD)                ');
    console.log('===========================================================');
    const sessions = (sessionsRes.data || []).map(sess => ({
      id: sess.id,
      session_code: sess.session_code,
      name: sess.name,
      course_name: sess.course_name,
      major: sess.major,
      lecturer: sess.lecturer,
      room: sess.room,
      class_name: sess.class_name,
      session_date: sess.session_date,
      time_slot: `${sess.start_time} - ${sess.end_time}`,
      status: sess.status
    }));
    if (sessions.length === 0) {
      console.log('   (No sessions on Render cloud yet)');
    } else {
      console.table(sessions);
    }

    console.log('\n===========================================================');
    console.log('            📊 LIVE RENDER ATTENDANCE LOGS (CLOUD)         ');
    console.log('===========================================================');
    const attendance = (reportsRes.data || []).map(r => ({
      id: r.id,
      student_id: r.student_code || r.student_id,
      full_name: r.full_name,
      session_name: r.session_name || 'Class Session',
      date: r.date,
      check_in_time: r.check_in_time,
      status: r.status,
      check_in_method: r.check_in_method,
      confidence: r.confidence_score ? `${Math.round(r.confidence_score * 100)}%` : '-',
      created_at: r.created_at
    }));
    if (attendance.length === 0) {
      console.log('   (No attendance logs on Render cloud yet)');
    } else {
      console.table(attendance);
    }
    console.log('\n===========================================================\n');
  } catch (err) {
    console.error('❌ Failed to fetch from Render cloud:', err.message);
  }
}

viewCloudDatabase();
