import * as XLSX from 'xlsx';

export const exportService = {
  // Export to Excel (.xlsx)
  exportToExcel: (records, sessionName = 'Attendance_Report', stats = null) => {
    try {
      const dataRows = records.map((r, index) => ({
        'No.': index + 1,
        'Student ID': r.student_code || r.student_id,
        'Full Name': r.full_name,
        'Major': r.major || 'Computer Science',
        'Gender': r.gender || 'N/A',
        'Class': r.class_name,
        'Date': r.date,
        'Check-In Time': r.check_in_time || '-',
        'Status': r.status,
        'Check-In Method': r.check_in_method === 'AI_FACE' ? 'AI Camera' : (r.check_in_method === 'MANUAL_OVERRIDE' ? 'Manual Override' : 'System'),
        'Confidence': r.confidence_score ? `${Math.round(r.confidence_score * 100)}%` : '100%',
        'Notes': r.notes || ''
      }));

      const wb = XLSX.utils.book_new();

      // Attendance sheet
      const wsAttendance = XLSX.utils.json_to_sheet(dataRows);
      XLSX.utils.book_append_sheet(wb, wsAttendance, 'Attendance');

      // If stats provided, add summary sheet
      if (stats) {
        const summaryRows = [
          { 'Metric': 'Total Students', 'Value': stats.totalCount },
          { 'Metric': 'Present Count', 'Value': stats.presentCount },
          { 'Metric': 'Late Count', 'Value': stats.lateCount },
          { 'Metric': 'Absent Count', 'Value': stats.absentCount },
          { 'Metric': 'Attendance Rate', 'Value': `${stats.attendanceRate}%` },
          { 'Metric': 'Generated At', 'Value': new Date().toLocaleString() }
        ];
        const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary Overview');
      }

      const fileName = `${sessionName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      return true;
    } catch (err) {
      console.error('Excel Export Error:', err);
      return false;
    }
  },

  // Export to CSV
  exportToCSV: (records, fileName = 'attendance_report.csv') => {
    try {
      const headers = ['No,Student ID,Full Name,Major,Gender,Class,Date,Check-In Time,Status,Method,Confidence,Notes'];
      const rows = records.map((r, i) => [
        i + 1,
        `"${r.student_code || r.student_id}"`,
        `"${r.full_name}"`,
        `"${r.major || 'Computer Science'}"`,
        `"${r.gender || 'N/A'}"`,
        `"${r.class_name}"`,
        `"${r.date}"`,
        `"${r.check_in_time || '-'}"`,
        `"${r.status}"`,
        `"${r.check_in_method || 'AI_FACE'}"`,
        `"${r.confidence_score ? Math.round(r.confidence_score * 100) + '%' : '-'}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ].join(','));

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    } catch (err) {
      console.error('CSV Export Error:', err);
      return false;
    }
  }
};
