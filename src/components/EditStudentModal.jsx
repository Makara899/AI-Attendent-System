import React, { useState, useEffect, useRef } from 'react';
import { 
  UserCheck, 
  X, 
  Upload, 
  Camera, 
  CameraOff, 
  RefreshCw, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  User,
  GraduationCap,
  Layers,
  Phone,
  Mail,
  ShieldCheck,
  IdCard,
  Copy,
  Check
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

  // Form states
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

  // Live Camera inside Edit Modal
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

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
      stopCamera();
    }
  }, [student]);

  // Clean up camera on unmount or close
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Quick select lists
  const defaultMajors = [
    'Computer Science', 
    'Information Technology', 
    'Software Engineering', 
    'Network & Security', 
    'Data Science'
  ];
  const sessionMajors = sessions.map(s => s.major).filter(Boolean);
  const uniqueMajors = Array.from(new Set([...defaultMajors, ...sessionMajors, major].filter(Boolean)));

  const sessionClasses = Array.from(new Set(sessions.map(s => s.class_name).filter(Boolean)));

  // Copy student ID helper
  const handleCopyId = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(studentId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    }
  };

  // Start Live Camera
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      setCameraLoading(true);
      setFaceDetectionStatus(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
      setCameraLoading(false);
    } catch (err) {
      console.warn('Camera Error in Edit Modal:', err);
      setIsCameraActive(false);
      setCameraLoading(false);
      setFeedback({
        type: 'error',
        message: isKh ? 'មិនអាចបើកកាមេរ៉ាបានទេ សូមពិនិត្យការអនុញ្ញាត (Camera Permission)' : 'Could not access camera. Please check browser permissions.'
      });
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraLoading(false);
  };

  // Capture Snapshot from Camera
  const captureSnapshot = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    setPhotoPreview(base64);
    setNewPhotoBase64(base64);
    stopCamera();

    // Run AI Biometric Extraction on captured snapshot
    await analyzeFaceBiometrics(base64);
  };

  // Handle Photo File Upload
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
      stopCamera();
      await analyzeFaceBiometrics(base64);
    };
    reader.readAsDataURL(file);
  };

  // Analyze Face & Extract 128-D Vector
  const analyzeFaceBiometrics = async (base64) => {
    setIsProcessingFace(true);
    setFaceDetectionStatus(null);
    try {
      const img = new Image();
      img.src = base64;
      img.onload = async () => {
        try {
          const descriptor = await faceService.extractFaceDescriptor(img);
          if (descriptor) {
            setFaceDescriptor(descriptor);
            setFaceDetectionStatus({
              success: true,
              message: isKh ? '✨ រកឃើញទម្រង់មុខ & បានទាញយក AI 128-D Biometric ថ្មីជោគជ័យ' : '✨ Face detected & 128-D AI Biometric updated'
            });
          } else {
            setFaceDetectionStatus({
              success: false,
              message: isKh ? '⚠️ មិនអាចស្គាល់ទម្រង់មុខច្បាស់ (នឹងរក្សាទិន្នន័យ Biometric ចាស់)' : '⚠️ No clear face detected (keeping previous biometric vector)'
            });
          }
        } catch (err) {
          console.warn('Face detection error:', err);
        } finally {
          setIsProcessingFace(false);
        }
      };
    } catch (err) {
      console.warn('Face processing setup error:', err);
      setIsProcessingFace(false);
    }
  };

  // Reset to original photo
  const handleResetPhoto = () => {
    stopCamera();
    setPhotoPreview(getMediaUrl(student.photo_url || student.photo) || '');
    setNewPhotoBase64(null);
    setFaceDescriptor(student.face_descriptor || null);
    setFaceDetectionStatus(null);
  };

  // Submit Changes
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !className.trim()) {
      setFeedback({
        type: 'error',
        message: isKh ? 'សូមបញ្ចូលឈ្មោះពេញ និងថ្នាក់សិក្សា' : 'Please provide student name and class'
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
            : `✅ Student "${fullName}" updated successfully!`
        });

        setTimeout(() => {
          stopCamera();
          if (onSuccess) onSuccess();
        }, 700);
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
        message: err.message || (isKh ? 'មានបញ្ហាក្នុងការតភ្ជាប់' : 'Network connection error')
      });
    } finally {
      setLoading(false);
    }
  };

  const hasBiometrics = Boolean(faceDescriptor);

  return (
    <div 
      className="modal-overlay" 
      onClick={(e) => { 
        if (e.target === e.currentTarget) {
          stopCamera();
          onClose();
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        zIndex: 9999
      }}
    >
      <div 
        className="modal-content scale-up edit-student-modal-container" 
        style={{ 
          maxWidth: '680px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, #111c38 0%, #0b132b 100%)',
          border: '1px solid rgba(99, 102, 241, 0.28)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(99, 102, 241, 0.15)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div 
          className="modal-header" 
          style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(17, 28, 56, 0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div className="modal-title-box" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(16, 185, 129, 0.2) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6366f1',
                boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)'
              }}
            >
              <UserCheck size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#fff', letterSpacing: '0.02em' }}>
                {isKh ? 'កែប្រែទិន្នន័យនិស្សិត' : 'Edit Student Profile'}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                <span 
                  onClick={handleCopyId}
                  title="Click to copy ID"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontFamily: 'var(--mono, monospace)',
                    fontSize: '0.78rem',
                    color: 'var(--accent, #10b981)',
                    background: 'rgba(16, 185, 129, 0.12)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    cursor: 'pointer'
                  }}
                >
                  <IdCard size={12} />
                  <b>{studentId}</b>
                  {copiedId ? <Check size={11} className="text-success" /> : <Copy size={11} style={{ opacity: 0.6 }} />}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim, #94a3b8)' }}>
                  {student.full_name}
                </span>
              </div>
            </div>
          </div>

          <button 
            type="button"
            className="modal-close-btn" 
            onClick={() => {
              stopCamera();
              onClose();
            }} 
            aria-label="Close"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-dim, #94a3b8)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div 
            className="modal-body modal-scrollable" 
            style={{ 
              padding: '18px 20px', 
              overflowY: 'auto', 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {/* Feedback Alerts */}
            {feedback && (
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                  color: feedback.type === 'success' ? '#34d399' : '#f87171',
                  fontSize: '0.88rem',
                  fontWeight: '500'
                }}
              >
                {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Top Interactive Photo & Biometrics Hero Card */}
            <div 
              style={{
                background: 'linear-gradient(135deg, rgba(24, 38, 75, 0.7) 0%, rgba(17, 28, 56, 0.9) 100%)',
                borderRadius: '14px',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                padding: '14px 16px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                alignItems: 'center',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
              }}
            >
              {/* Photo / Camera Area */}
              <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0, borderRadius: '14px', overflow: 'hidden' }}>
                {isCameraActive ? (
                  <video 
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '14px',
                      border: '2px solid var(--accent, #10b981)'
                    }}
                  />
                ) : (
                  <img
                    src={photoPreview || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="84" height="84" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%231e293b"/></svg>'}
                    alt="Profile"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '14px',
                      border: hasBiometrics 
                        ? '2px solid var(--accent, #10b981)' 
                        : '2px solid rgba(99, 102, 241, 0.5)',
                      boxShadow: hasBiometrics 
                        ? '0 0 16px rgba(16, 185, 129, 0.35)' 
                        : '0 0 12px rgba(99, 102, 241, 0.25)'
                    }}
                  />
                )}

                {(isProcessingFace || cameraLoading) && (
                  <div 
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(11, 19, 43, 0.85)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      borderRadius: '14px'
                    }}
                  >
                    <Loader2 size={24} className="spin-icon text-primary" />
                    <span style={{ fontSize: '0.65rem', color: '#fff' }}>AI Scan</span>
                  </div>
                )}
              </div>

              {/* Photo Controls & Biometrics Status */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {hasBiometrics ? (
                    <span 
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        padding: '3px 9px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: '600'
                      }}
                    >
                      <Sparkles size={13} />
                      {isKh ? 'AI 128-D Vector មានរួចរាល់' : '128-D AI Biometrics Active'}
                    </span>
                  ) : (
                    <span 
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        padding: '3px 9px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: '600'
                      }}
                    >
                      <AlertCircle size={13} />
                      {isKh ? 'មិនទាន់មាន AI Biometrics' : 'No Biometrics'}
                    </span>
                  )}

                  {newPhotoBase64 && (
                    <button 
                      type="button" 
                      onClick={handleResetPhoto}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-dim, #94a3b8)',
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: '2px 4px'
                      }}
                    >
                      {isKh ? 'ត្រឡប់រូបចាស់' : 'Reset Photo'}
                    </button>
                  )}
                </div>

                {/* Photo Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {isCameraActive ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={captureSnapshot}
                        style={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          border: 'none',
                          color: '#fff',
                          fontWeight: '600',
                          padding: '6px 14px'
                        }}
                      >
                        <Camera size={14} />
                        <span>{isKh ? 'ថតយករូបភាព' : 'Snap Photo'}</span>
                      </button>
                      <button
                        type="button"
                        className="btn ghost btn-sm"
                        onClick={stopCamera}
                        style={{ padding: '6px 12px' }}
                      >
                        <CameraOff size={14} />
                        <span>{isKh ? 'បិទកាមេរ៉ា' : 'Cancel'}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn ghost btn-sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessingFace}
                        style={{
                          background: 'rgba(99, 102, 241, 0.12)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          color: '#818cf8',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontWeight: '500'
                        }}
                      >
                        <Upload size={14} />
                        <span>{isKh ? 'បញ្ចូលរូបថត' : 'Upload File'}</span>
                      </button>
                      <button
                        type="button"
                        className="btn ghost btn-sm"
                        onClick={startCamera}
                        disabled={isProcessingFace}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontWeight: '500'
                        }}
                      >
                        <Camera size={14} />
                        <span>{isKh ? 'បើកកាមេរ៉ា' : 'Live Camera'}</span>
                      </button>
                    </>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoChange}
                  />
                </div>

                {/* Face detection hint */}
                {faceDetectionStatus && (
                  <div 
                    style={{
                      fontSize: '0.78rem',
                      marginTop: '6px',
                      color: faceDetectionStatus.success ? '#34d399' : '#f87171'
                    }}
                  >
                    {faceDetectionStatus.message}
                  </div>
                )}
              </div>
            </div>

            {/* Input Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Row 1: Student ID (readonly) & Full Name */}
              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '12px'
                }}
              >
                <div>
                  <label 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      fontSize: '0.84rem', 
                      fontWeight: '600', 
                      color: 'var(--text-dim, #94a3b8)',
                      marginBottom: '6px'
                    }}
                  >
                    <IdCard size={14} className="text-primary" />
                    <span>{isKh ? 'អត្តលេខនិស្សិត (Student ID)' : 'Student ID (Permanent)'}</span>
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    disabled
                    style={{
                      width: '100%',
                      background: 'rgba(14, 23, 46, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: 'var(--accent, #10b981)',
                      fontFamily: 'var(--mono, monospace)',
                      fontWeight: '600',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      cursor: 'not-allowed',
                      opacity: 0.85
                    }}
                  />
                </div>

                <div>
                  <label 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      fontSize: '0.84rem', 
                      fontWeight: '600', 
                      color: '#fff',
                      marginBottom: '6px' 
                    }}
                  >
                    <User size={14} className="text-primary" />
                    <span>{isKh ? 'ឈ្មោះពេញ (Full Name)' : 'Full Name'} *</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. John Doe"
                    required
                    style={{
                      width: '100%',
                      background: 'var(--bg-input, #0e172e)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      color: '#fff',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      fontSize: '0.92rem',
                      outline: 'none',
                      transition: 'border 0.2s ease'
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Touch-friendly Gender Selector Chips */}
              <div>
                <label 
                  style={{ 
                    display: 'block', 
                    fontSize: '0.84rem', 
                    fontWeight: '600', 
                    color: 'var(--text-dim, #94a3b8)',
                    marginBottom: '6px' 
                  }}
                >
                  {isKh ? 'ភេទ (Gender)' : 'Gender'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'Male', labelEn: 'Male', labelKh: 'ប្រុស', icon: '👨' },
                    { id: 'Female', labelEn: 'Female', labelKh: 'ស្រី', icon: '👩' },
                    { id: 'Other', labelEn: 'Other', labelKh: 'ផ្សេងៗ', icon: '🧑' }
                  ].map((g) => {
                    const isSelected = gender === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGender(g.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '0.86rem',
                          fontWeight: isSelected ? '600' : '400',
                          border: isSelected 
                            ? '1px solid var(--primary, #6366f1)' 
                            : '1px solid rgba(255, 255, 255, 0.08)',
                          background: isSelected 
                            ? 'rgba(99, 102, 241, 0.2)' 
                            : 'rgba(14, 23, 46, 0.5)',
                          color: isSelected ? '#fff' : 'var(--text-dim, #94a3b8)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>{g.icon}</span>
                        <span>{isKh ? g.labelKh : g.labelEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 3: Academic Information (Major & Class) */}
              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '12px'
                }}
              >
                <div>
                  <label 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      fontSize: '0.84rem', 
                      fontWeight: '600', 
                      color: 'var(--text-dim, #94a3b8)',
                      marginBottom: '6px' 
                    }}
                  >
                    <GraduationCap size={14} className="text-primary" />
                    <span>{isKh ? 'ជំនាញ (Major / Department)' : 'Major / Department'}</span>
                  </label>
                  <select
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-input, #0e172e)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      color: '#fff',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  >
                    {uniqueMajors.map(m => (
                      <option key={m} value={m} style={{ background: '#111c38', color: '#fff' }}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      fontSize: '0.84rem', 
                      fontWeight: '600', 
                      color: '#fff',
                      marginBottom: '6px' 
                    }}
                  >
                    <Layers size={14} className="text-primary" />
                    <span>{isKh ? 'ថ្នាក់សិក្សា (Class Name)' : 'Class Name'} *</span>
                  </label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="e.g. Year4 S1 / Year 3 - CS A"
                    required
                    style={{
                      width: '100%',
                      background: 'var(--bg-input, #0e172e)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      color: '#fff',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      fontSize: '0.92rem',
                      outline: 'none'
                    }}
                  />

                  {/* Quick suggestion chips for classes */}
                  {sessionClasses.length > 0 && (
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '6px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)' }}>
                        {isKh ? 'ថ្នាក់រហ័ស:' : 'Quick:'}
                      </span>
                      {sessionClasses.slice(0, 3).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setClassName(c)}
                          style={{
                            background: className === c ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            color: className === c ? 'var(--primary-light, #818cf8)' : 'var(--text-dim, #94a3b8)',
                            fontSize: '0.72rem',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 4: Contact Details (Phone & Email) */}
              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '12px'
                }}
              >
                <div>
                  <label 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      fontSize: '0.84rem', 
                      fontWeight: '600', 
                      color: 'var(--text-dim, #94a3b8)',
                      marginBottom: '6px' 
                    }}
                  >
                    <Phone size={14} className="text-primary" />
                    <span>{isKh ? 'លេខទូរស័ព្ទ (Phone)' : 'Phone Number'}</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="012 345 678"
                    style={{
                      width: '100%',
                      background: 'var(--bg-input, #0e172e)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      fontSize: '0.84rem', 
                      fontWeight: '600', 
                      color: 'var(--text-dim, #94a3b8)',
                      marginBottom: '6px' 
                    }}
                  >
                    <Mail size={14} className="text-primary" />
                    <span>{isKh ? 'អ៊ីមែល (Email)' : 'Email Address'}</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@western.edu.kh"
                    style={{
                      width: '100%',
                      background: 'var(--bg-input, #0e172e)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Modal Sticky Footer */}
          <div 
            className="modal-footer" 
            style={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              alignItems: 'center',
              gap: '10px', 
              padding: '14px 20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(17, 28, 56, 0.9)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <button 
              type="button" 
              className="btn ghost" 
              onClick={() => {
                stopCamera();
                onClose();
              }} 
              disabled={loading}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '0.88rem'
              }}
            >
              <span>{isKh ? 'បោះបង់' : 'Cancel'}</span>
            </button>
            <button 
              type="submit" 
              className="btn" 
              disabled={loading || isProcessingFace}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#fff',
                border: 'none',
                padding: '9px 22px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '600',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
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
