import React, { useState } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  UserCheck, 
  Clock, 
  FileText,
  User,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';

export default function ManualFallbackModal({
  isOpen,
  onClose,
  students,
  activeSession,
  onSuccess,
  language
}) {
  if (!isOpen) return null;

  const isKh = language === 'kh';

  const [selectedStudentId, setSelectedStudentId] = useState(students?.[0]?.id || '');
  const [status, setStatus] = useState('PRESENT');
  const [reason, setReason] = useState('Low / Uneven lighting (ពន្លឺងងឹត ឬចាំងពេក)');
  const [teacherName, setTeacherName] = useState('Professor Sok');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fallbackReasons = [
    { en: 'Low / Uneven lighting condition', kh: 'ពន្លឺងងឹត ឬចាំងខ្លាំងពេក' },
    { en: 'Wearing medical mask or new glasses', kh: 'ពាក់ម៉ាស់ ឬពាក់វ៉ែនតាថ្មី' },
    { en: 'Camera angle / Face tilted too much', kh: 'មុំកាមេរាងាកខ្លាំង ឬមុខមិនចំ' },
    { en: 'New hairstyle / appearance change', kh: 'ការផ្លាស់ប្តូរម៉ូតសក់ ឬរូបរាង' },
    { en: 'Biometric descriptor needs re-enrollment', kh: 'ទិន្នន័យមុខចាស់ ត្រូវស្កេនថ្មី' },
    { en: 'Teacher direct verification in classroom', kh: 'សាស្ត្រាចារ្យផ្ទៀងផ្ទាត់វត្តមានផ្ទាល់' },
    { en: 'Other / Medical Excuse', kh: 'មូលហេតុផ្សេងៗ / សុំច្បាប់' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !activeSession) {
      setFeedback({ type: 'error', message: 'Please select a student and active session' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const res = await api.manualOverride({
        student_id: Number(selectedStudentId),
        session_id: activeSession.id,
        status,
        reason,
        notes,
        teacher_name: teacherName
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: isKh 
            ? `✅ បានកត់ត្រាវត្តមានដោយដៃសម្រាប់ ${res.data.full_name} រួចរាល់!` 
            : `✅ Manual attendance recorded for ${res.data.full_name}!`
        });

        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1200);
      } else {
        setFeedback({ type: 'error', message: res.error || 'Failed to submit override' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content modal-md scale-up">
        <div className="modal-header">
          <div className="modal-title-box">
            <div className="modal-icon-badge warning">
              <ShieldAlert size={22} className="text-warning" />
            </div>
            <div>
              <h3>{isKh ? 'ចុះវត្តមានដោយដៃ (Manual Fallback)' : 'Teacher Manual Fallback Override'}</h3>
              <p className="text-muted small-text">
                {isKh 
                  ? 'ដំណោះស្រាយពេល AI មិនអាចស្គាល់មុខនិស្សិតបានត្រឹមត្រូវ' 
                  : 'Teacher manual verification audit when AI face recognition cannot match accurately'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {feedback && (
              <div className={`alert-banner ${feedback.type} mb-3`}>
                <span>{feedback.message}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label required">{isKh ? 'ជ្រើសរើសនិស្សិត:' : 'Select Student:'}</label>
              <select
                className="form-control"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                required
              >
                {students.map((stu) => (
                  <option key={stu.id} value={stu.id}>
                    {stu.student_id} - {stu.full_name} ({stu.class_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group col">
                <label className="form-label required">{isKh ? 'ស្ថានភាពវត្តមាន:' : 'Attendance Status:'}</label>
                <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="PRESENT">{isKh ? 'វត្តមាន (PRESENT)' : 'PRESENT (On Time)'}</option>
                  <option value="LATE">{isKh ? 'មកយឺត (LATE)' : 'LATE'}</option>
                  <option value="EXCUSED">{isKh ? 'ច្បាប់ (EXCUSED)' : 'EXCUSED'}</option>
                  <option value="ABSENT">{isKh ? 'អវត្តមាន (ABSENT)' : 'ABSENT'}</option>
                </select>
              </div>

              <div className="form-group col">
                <label className="form-label required">{isKh ? 'សាស្ត្រាចារ្យអនុម័ត:' : 'Approved By:'}</label>
                <input
                  type="text"
                  className="form-control"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="Teacher / Proctor Name"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">
                <HelpCircle size={14} className="text-primary" />
                <span>{isKh ? 'មូលហេតុដែល AI មិនស្គាល់ (AI Failure Reason):' : 'Reason AI Failed to Recognize:'}</span>
              </label>
              <select
                className="form-control"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              >
                {fallbackReasons.map((r, i) => (
                  <option key={i} value={`${r.en} (${r.kh})`}>
                    {isKh ? `${r.kh} - [${r.en}]` : `${r.en} (${r.kh})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{isKh ? 'កំណត់ចំណាំបន្ថែម (Optional Notes):' : 'Audit Trail Notes:'}</label>
              <textarea
                className="form-control"
                rows="2"
                placeholder={isKh ? 'ឧទាហរណ៍៖ សិស្សបានបង្ហាញកាតសម្គាល់ខ្លួន...' : 'e.g., Student verified with physical university ID card...'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn ghost" onClick={onClose}>
              <span>{isKh ? 'បោះបង់' : 'Cancel'}</span>
            </button>
            <button type="submit" className="btn" disabled={loading}>
              <ShieldCheck size={16} />
              <span>{loading ? (isKh ? 'កំពុងកត់ត្រា...' : 'Submitting...') : (isKh ? 'កត់ត្រាវត្តមានដោយដៃ' : 'Confirm Manual Check-In')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
