import React, { useState, useEffect, useRef } from 'react';
import { 
  UserCheck, 
  X, 
  Upload, 
  Trash2, 
  Camera, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { api, getMediaUrl } from '../services/api';
import { faceService } from '../services/faceService';

export default function EditStudentModal({
  isOpen,
  student,
  onClose,
  onSuccess,
  language,
  sessions = []
}) {
  if (!isOpen || !student) return null;

  const isKh = language === 'kh';

  // Form states initialized with student data
  const [fullName, setFullName] = useState(student.full_name || '');
  const [studentId, setStudentId] = useState(student.student_id || '');
  const [gender, setGender] = useState(student.gender || 'Male');
  const [major, setMajor] = useState(student.major || 'Computer Science');
  const [className, setClassName] = useState(student.class_name || '');
  const [email, setEmail] = useState(student.email || '');
  const [phone, setPhone] = useState(student.phone || '');

  // Photo & Biometrics states
  const [photoPreview, setPhotoPreview] = useState(getMediaUrl(student.photo_url || student.photo) || '');
  const [newPhotoBase64, setNewPhotoBase64] = useState(null);
  const [faceDescriptor, setFaceDescriptor] = useState(student.face_descriptor || null);
  const [isProcessingFace, setIsProcessingFace] = useState(false);
  const [faceDetectionStatus, setFaceDetectionStatus] = useState(null);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fileInputRef = useRef(null);

  // Sync state if student prop changes
  useEffect(() => {
    if (student) {
      setFullName(student.full_name || '');
      setStudentId(student.student_id || '');
      setGender(student.gender || 'Male');
      setMajor(student.major || 'Computer Science');
      setClassName(student.class_name || '');
      setEmail(student.email || '');
      setPhone(student.phone || '');
      setPhotoPreview(getMediaUrl(student.photo_url || student.photo) || '');
      setNewPhotoBase64(null);
      setFaceDescriptor(student.face_descriptor || null);
      setFaceDetectionStatus(null);
      setFeedback(null);
    }
  }, [student]);

  // Major and Class options derived from sessions
  const majorOptions = ['Computer Science', 'Information Technology', 'Software Engineering', 'Network & Security', 'Data Science', 'Business Administration'];
  const sessionMajors = sessions.map(s => s.major).filter(Boolean);
  const uniqueMajors = Array.from(new Set([...majorOptions, ...sessionMajors, major]));

  // Handle new photo upload
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({
        type: 'error',
        message: isKh ? 'សូមជ្រើសរើសឯកសាររូបភាពត្រឹមត្រូវ (JPG, PNG)' : 'Please select a valid image file (JPG, PNG)'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      setPhotoPreview(base64);
      setNewPhotoBase64(base64);
      setFaceDetectionStatus(null);

      // Extract new 128D Face Descriptor if face models are available
      try {
        setIsProcessingFace(true);
        const img = new Image();
        img.src = base64;
        img.onload = async () => {
          try {
            const descriptor = await faceService.extractFaceDescriptor(img);
            if (descriptor) {
              setFaceDescriptor(descriptor);
              setFaceDetectionStatus({
                success: true,
                message: isKh ? 'រកឃើញទម្រង់មុខ & បានទាញយក AI 128-D Biometric ថ្មីជោគជ័យ' : 'Face detected & 128-D AI Biometric extracted'
              });
            } else {
              setFaceDetectionStatus({
                success: false,
                message: isKh ? 'មិនអាចស្គាល់ទម្រង់មុខច្បាស់ក្នុងរូបភាពនេះ (នឹងរក្សាទិន្នន័យ Biometric ចាស់)' : 'No clear face detected (keeping existing biometric)'
              });
            }
          } catch (err) {
            console.warn('Face detection error on photo upload:', err);
          } finally {
            setIsProcessingFace(false);
          }
        };
      } catch (err) {
        console.warn('Face detection setup error:', err);
        setIsProcessingFace(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !className.trim()) {
      setFeedback({
        type: 'error',
        message: isKh ? 'សូមបញ្ចូលឈ្មោះពេញ និងថ្នាក់សិក្សា' : 'Please provide full name and class'
      });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const payload = {
        full_name: fullName.trim(),
        gender,
        major,
        class_name: className.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
      };

      if (newPhotoBase64) {
        payload.photo_base64 = newPhotoBase64;
      }

      if (faceDescriptor) {
        payload.face_descriptor = faceDescriptor;
      }

      const res = await api.updateStudent(student.id, payload);

      if (res.success) {
        setFeedback({
          type: 'success',
          message: isKh 
            ? `✅ បានកែប្រែទិន្នន័យនិស្សិត "${fullName}" ដោយជោគជ័យ!` 
            : `✅ Student profile "${fullName}" updated successfully!`
        });

        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 800);
      } else {
        setFeedback({
          type: 'error',
          message: res.error || (isKh ? 'មិនអាចកែប្រែទិន្នន័យបានទេ' : 'Failed to update student profile')
        });
      }
    } catch (err) {
      console.error('Update student error:', err);
      setFeedback({
        type: 'error',
        message: err.message || (isKh ? 'មានបញ្ហាក្នុងការតភ្ជាប់' : 'Network error')
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content modal-md scale-up" style={{ maxWidth: '600px' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-box">
            <div className="modal-icon-badge primary">
              <UserCheck size={22} className="text-primary" />
            </div>
            <div>
              <h3>{isKh ? 'កែប្រែទិន្នន័យនិស្សិត' : 'Update Student Profile'}</h3>
              <p className="text-muted small-text">
                {isKh 
                  ? `អត្តលេខនិស្សិត៖ ${student.student_id} | ${student.full_name}` 
                  : `Student ID: ${student.student_id} | ${student.full_name}`}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body modal-scrollable" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '16px 20px' }}>
            {feedback && (
              <div className={`alert-banner ${feedback.type} mb-3`} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${feedback.type === 'success' ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)'}`,
                color: feedback.type === 'success' ? '#34d399' : '#f87171'
              }}>
                {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span style={{ fontSize: '0.9rem' }}>{feedback.message}</span>
              </div>
            )}

            {/* Photo & Biometrics Section */}
            <div style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              padding: '12px',
              background: 'var(--panel-2, rgba(255, 255, 255, 0.03))',
              borderRadius: '10px',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
              marginBottom: '16px'
            }}>
              <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
                <img
                  src={photoPreview || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23263457"/></svg>'}
                  alt="Student Preview"
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '10px',
                    objectFit: 'cover',
                    border: '2px solid var(--accent, #3b82f6)'
                  }}
                />
                {isProcessingFace && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Loader2 size={20} className="spin-icon text-primary" />
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                  <button
                    type="button"
                    className="btn ghost btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingFace}
                    style={{ fontSize: '0.82rem', padding: '4px 10px' }}
                  >
                    <Upload size={13} />
                    <span>{isKh ? 'ប្តូររូបថតថ្មី' : 'Change Photo'}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoChange}
                  />
                  {faceDescriptor ? (
                    <span className="pill present" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                      <Sparkles size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      128-D Vector ✓
                    </span>
                  ) : (
                    <span className="pill absent" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                      No Biometrics
                    </span>
                  )}
                </div>
                {faceDetectionStatus && (
                  <div style={{
                    fontSize: '0.78rem',
                    color: faceDetectionStatus.success ? '#34d399' : '#f87171'
                  }}>
                    {faceDetectionStatus.message}
                  </div>
                )}
              </div>
            </div>

            {/* Input Fields */}
            <div className="form-row" style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div className="form-group col" style={{ flex: 1 }}>
                <label className="form-label required" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>
                  {isKh ? 'អត្តលេខនិស្សិត (Student ID):' : 'Student ID:'}
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={studentId}
                  disabled
                  style={{ opacity: 0.75, cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group col" style={{ flex: 1.5 }}>
                <label className="form-label required" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>
                  {isKh ? 'ឈ្មោះពេញ (Full Name):' : 'Full Name:'}
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                />
              </div>
            </div>

            <div className="form-row" style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div className="form-group col" style={{ flex: 1 }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>
                  {isKh ? 'ជំនាញ (Major):' : 'Major / Department:'}
                </label>
                <select
                  className="form-control"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                >
                  {uniqueMajors.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="form-group col" style={{ flex: 1 }}>
                <label className="form-label required" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>
                  {isKh ? 'ថ្នាក់ (Class):' : 'Class Name:'}
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. Year4 S1 / Year 3 - CS A"
                  required
                />
              </div>
            </div>

            <div className="form-row" style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div className="form-group col" style={{ flex: 1 }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>
                  {isKh ? 'ភេទ (Gender):' : 'Gender:'}
                </label>
                <select
                  className="form-control"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="Male">{isKh ? 'ប្រុស (Male)' : 'Male'}</option>
                  <option value="Female">{isKh ? 'ស្រី (Female)' : 'Female'}</option>
                  <option value="Other">{isKh ? 'ផ្សេងៗ (Other)' : 'Other'}</option>
                </select>
              </div>

              <div className="form-group col" style={{ flex: 1 }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>
                  {isKh ? 'លេខទូរស័ព្ទ (Phone):' : 'Phone Number:'}
                </label>
                <input
                  type="tel"
                  className="form-control"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="012 345 678"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '8px' }}>
              <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>
                {isKh ? 'អ៊ីមែល (Email):' : 'Email Address:'}
              </label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@western.edu.kh"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '14px 20px' }}>
            <button type="button" className="btn ghost" onClick={onClose} disabled={loading}>
              <span>{isKh ? 'បោះបង់' : 'Cancel'}</span>
            </button>
            <button type="submit" className="btn" disabled={loading || isProcessingFace}>
              {loading ? (
                <>
                  <Loader2 size={16} className="spin-icon" />
                  <span>{isKh ? 'កំពុងរក្សាទុក...' : 'Updating...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{isKh ? 'រក្សាទុកការកែប្រែ' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
