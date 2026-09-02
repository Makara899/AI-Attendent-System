import React, { useState, useEffect, useRef } from 'react';
import { 
  UserCheck, 
  X, 
  Upload, 
  Camera, 
  CameraOff, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  User,
  GraduationCap,
  Layers,
  Phone,
  Mail,
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

  // Live Camera state
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

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const defaultMajors = [
    'Computer Science', 
    'Information Technology', 
    'Software Engineering', 
    'Network & Security', 
    'Data Science'
  ];
  const sessionMajors = sessions.map(s => s.major).filter(Boolean);
  const uniqueMajors = Array.from(new Set([...defaultMajors, ...sessionMajors, major].filter(Boolean)));

  const handleCopyId = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(studentId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      setCameraLoading(true);
      setFaceDetectionStatus(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 480 }, height: { ideal: 480 }, facingMode: 'user' },
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
      console.warn('Camera Error:', err);
      setIsCameraActive(false);
      setCameraLoading(false);
      setFeedback({
        type: 'error',
        message: isKh ? 'មិនអាចបើកកាមេរ៉ាបានទេ' : 'Could not access camera'
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraLoading(false);
  };

  const captureSnapshot = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    setPhotoPreview(base64);
    setNewPhotoBase64(base64);
    stopCamera();
    await analyzeFaceBiometrics(base64);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({
        type: 'error',
        message: isKh ? 'សូមជ្រើសរើសឯកសាររូបភាពត្រឹមត្រូវ' : 'Please select a valid image'
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
              message: isKh ? '✨ រកឃើញមុខ & បានទាញយក AI 128-D Biometric ថ្មី' : '✨ 128-D AI Biometric updated'
            });
          } else {
            setFaceDetectionStatus({
              success: false,
              message: isKh ? '⚠️ មិនអាចស្គាល់មុខច្បាស់ (រក្សាទិន្នន័យចាស់)' : '⚠️ No clear face (kept existing)'
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

  const handleResetPhoto = () => {
    stopCamera();
    setPhotoPreview(getMediaUrl(student.photo_url || student.photo) || '');
    setNewPhotoBase64(null);
    setFaceDescriptor(student.face_descriptor || null);
    setFaceDetectionStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !className.trim()) {
      setFeedback({
        type: 'error',
        message: isKh ? 'សូមបញ្ចូលឈ្មោះពេញ និងថ្នាក់' : 'Please provide name and class'
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
          message: isKh ? `✅ បានកែប្រែទិន្នន័យរួចរាល់!` : `✅ Student updated successfully!`
        });

        setTimeout(() => {
          stopCamera();
          if (onSuccess) onSuccess();
        }, 600);
      } else {
        setFeedback({
          type: 'error',
          message: res.error || (isKh ? 'មិនអាចកែប្រែបានទេ' : 'Failed to update student')
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || (isKh ? 'មានបញ្ហាក្នុងការតភ្ជាប់' : 'Connection error')
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
        className="modal-content scale-up edit-student-no-scroll" 
        style={{ 
          maxWidth: '740px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, #111c38 0%, #0b132b 100%)',
          border: '1px solid rgba(99, 102, 241, 0.28)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(99, 102, 241, 0.15)',
          borderRadius: '16px',
          overflow: 'visible'
        }}
      >
        {/* Header */}
        <div 
          style={{ 
            padding: '12px 18px', 
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(16, 185, 129, 0.2) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6366f1'
              }}
            >
              <UserCheck size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#fff' }}>
                {isKh ? 'កែប្រែទិន្នន័យនិស្សិត' : 'Edit Student Profile'}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span 
                  onClick={handleCopyId}
                  title="Click to copy ID"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontFamily: 'var(--mono, monospace)',
                    fontSize: '0.74rem',
                    color: 'var(--accent, #10b981)',
                    background: 'rgba(16, 185, 129, 0.12)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <IdCard size={11} />
                  <b>{studentId}</b>
                  {copiedId ? <Check size={10} className="text-success" /> : <Copy size={10} style={{ opacity: 0.6 }} />}
                </span>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-dim, #94a3b8)' }}>
                  • {student.full_name}
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
              width: '30px',
              height: '30px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-dim, #94a3b8)',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Compact 2-Column Form Body (Zero Scroll) */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* Feedback Alert */}
            {feedback && (
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                  color: feedback.type === 'success' ? '#34d399' : '#f87171',
                  fontSize: '0.8rem'
                }}
              >
                {feedback.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* 2-Column Grid */}
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: '175px 1fr',
                gap: '16px',
                alignItems: 'start'
              }}
              className="edit-student-grid"
            >
              {/* LEFT COLUMN: Photo, Biometrics, and Gender Selector */}
              <div 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'rgba(24, 38, 75, 0.4)',
                  padding: '12px 10px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                {/* Photo Preview / Webcam */}
                <div style={{ position: 'relative', width: '96px', height: '96px', borderRadius: '12px', overflow: 'hidden' }}>
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
                        borderRadius: '12px',
                        border: '2px solid var(--accent, #10b981)'
                      }}
                    />
                  ) : (
                    <img
                      src={photoPreview || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%231e293b"/></svg>'}
                      alt="Profile"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '12px',
                        border: hasBiometrics ? '2px solid #10b981' : '2px solid #6366f1',
                        boxShadow: hasBiometrics ? '0 0 12px rgba(16, 185, 129, 0.3)' : '0 0 10px rgba(99, 102, 241, 0.2)'
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
                        borderRadius: '12px'
                      }}
                    >
                      <Loader2 size={20} className="spin-icon text-primary" />
                    </div>
                  )}
                </div>

                {/* Biometric Status Badge */}
                <div style={{ width: '100%', textAlign: 'center' }}>
                  {hasBiometrics ? (
                    <span 
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        padding: '2px 7px',
                        borderRadius: '12px',
                        fontSize: '0.68rem',
                        fontWeight: '600'
                      }}
                    >
                      <Sparkles size={10} />
                      128-D Vector ✓
                    </span>
                  ) : (
                    <span 
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        padding: '2px 7px',
                        borderRadius: '12px',
                        fontSize: '0.68rem',
                        fontWeight: '600'
                      }}
                    >
                      No Biometrics
                    </span>
                  )}
                </div>

                {/* Photo Action Buttons */}
                <div style={{ display: 'flex', gap: '5px', width: '100%' }}>
                  {isCameraActive ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={captureSnapshot}
                        style={{
                          flex: 1,
                          background: '#10b981',
                          padding: '4px 6px',
                          fontSize: '0.72rem',
                          justifyContent: 'center'
                        }}
                      >
                        <Camera size={12} />
                        <span>Snap</span>
                      </button>
                      <button
                        type="button"
                        className="btn ghost btn-sm"
                        onClick={stopCamera}
                        style={{ padding: '4px 6px', fontSize: '0.72rem' }}
                      >
                        <CameraOff size={12} />
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
                          flex: 1,
                          background: 'rgba(99, 102, 241, 0.12)',
                          padding: '4px 6px',
                          fontSize: '0.72rem',
                          borderRadius: '6px',
                          justifyContent: 'center'
                        }}
                      >
                        <Upload size={12} />
                        <span>Upload</span>
                      </button>
                      <button
                        type="button"
                        className="btn ghost btn-sm"
                        onClick={startCamera}
                        disabled={isProcessingFace}
                        style={{
                          padding: '4px 8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          fontSize: '0.72rem',
                          borderRadius: '6px'
                        }}
                        title="Live Camera"
                      >
                        <Camera size={12} />
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

                {newPhotoBase64 && (
                  <button 
                    type="button" 
                    onClick={handleResetPhoto}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-dim, #94a3b8)',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    {isKh ? 'ត្រឡប់រូបដើម' : 'Reset Photo'}
                  </button>
                )}

                {/* Gender Select Chips */}
                <div style={{ width: '100%', marginTop: '2px' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-dim, #94a3b8)', marginBottom: '4px', textAlign: 'center' }}>
                    {isKh ? 'ភេទ (Gender)' : 'Gender'}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                    {[
                      { id: 'Male', label: 'Male', kh: 'ប្រុស', icon: '👨' },
                      { id: 'Female', label: 'Female', kh: 'ស្រី', icon: '👩' },
                      { id: 'Other', label: 'Other', kh: 'ផ្សេង', icon: '🧑' }
                    ].map((g) => {
                      const isSelected = gender === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setGender(g.id)}
                          style={{
                            padding: '4px 2px',
                            borderRadius: '6px',
                            fontSize: '0.68rem',
                            fontWeight: isSelected ? '700' : '400',
                            border: isSelected ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: isSelected ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                            color: isSelected ? '#fff' : 'var(--text-dim, #94a3b8)',
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          {g.icon} {isKh ? g.kh : g.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Fields organized in 3 clean rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* Row 1: Student ID & Full Name */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--text-dim, #94a3b8)', marginBottom: '4px' }}>
                      <IdCard size={12} className="text-primary" />
                      <span>{isKh ? 'អត្តលេខ' : 'Student ID'}</span>
                    </label>
                    <input
                      type="text"
                      value={studentId}
                      disabled
                      style={{
                        width: '100%',
                        background: 'rgba(14, 23, 46, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: 'var(--accent, #10b981)',
                        fontFamily: 'var(--mono, monospace)',
                        fontWeight: '700',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        fontSize: '0.84rem',
                        cursor: 'not-allowed'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#fff', marginBottom: '4px' }}>
                      <User size={12} className="text-primary" />
                      <span>{isKh ? 'ឈ្មោះពេញ' : 'Full Name'} *</span>
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
                        border: '1px solid rgba(99, 102, 241, 0.35)',
                        color: '#fff',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        fontSize: '0.86rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Row 2: Major & Class */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--text-dim, #94a3b8)', marginBottom: '4px' }}>
                      <GraduationCap size={12} className="text-primary" />
                      <span>{isKh ? 'ជំនាញ' : 'Major'}</span>
                    </label>
                    <select
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'var(--bg-input, #0e172e)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        color: '#fff',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                    >
                      {uniqueMajors.map(m => (
                        <option key={m} value={m} style={{ background: '#111c38', color: '#fff' }}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#fff', marginBottom: '4px' }}>
                      <Layers size={12} className="text-primary" />
                      <span>{isKh ? 'ថ្នាក់' : 'Class'} *</span>
                    </label>
                    <input
                      type="text"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      placeholder="e.g. Year4 S1"
                      required
                      style={{
                        width: '100%',
                        background: 'var(--bg-input, #0e172e)',
                        border: '1px solid rgba(99, 102, 241, 0.35)',
                        color: '#fff',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        fontSize: '0.86rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Row 3: Phone & Email */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--text-dim, #94a3b8)', marginBottom: '4px' }}>
                      <Phone size={12} className="text-primary" />
                      <span>{isKh ? 'លេខទូរស័ព្ទ' : 'Phone'}</span>
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
                        padding: '7px 10px',
                        borderRadius: '6px',
                        fontSize: '0.84rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--text-dim, #94a3b8)', marginBottom: '4px' }}>
                      <Mail size={12} className="text-primary" />
                      <span>{isKh ? 'អ៊ីមែល' : 'Email'}</span>
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
                        padding: '7px 10px',
                        borderRadius: '6px',
                        fontSize: '0.84rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Status Hint */}
                {faceDetectionStatus && (
                  <div 
                    style={{
                      fontSize: '0.74rem',
                      color: faceDetectionStatus.success ? '#34d399' : '#f87171'
                    }}
                  >
                    {faceDetectionStatus.message}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Clean Footer (Always in View) */}
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              alignItems: 'center',
              gap: '8px', 
              padding: '10px 18px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(17, 28, 56, 0.95)'
            }}
          >
            <button 
              type="button" 
              className="btn ghost btn-sm" 
              onClick={() => {
                stopCamera();
                onClose();
              }} 
              disabled={loading}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                fontSize: '0.82rem'
              }}
            >
              <span>{isKh ? 'បោះបង់' : 'Cancel'}</span>
            </button>
            <button 
              type="submit" 
              className="btn btn-sm" 
              disabled={loading || isProcessingFace}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#fff',
                border: 'none',
                padding: '7px 18px',
                borderRadius: '6px',
                fontSize: '0.84rem',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="spin-icon" />
                  <span>{isKh ? 'កំពុងរក្សាទុក...' : 'Updating...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
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
