import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  CameraOff, 
  Upload, 
  Trash2,
  CheckCircle2,
  Loader2,
  Edit3
} from 'lucide-react';
import { faceService } from '../services/faceService';
import { api, getMediaUrl } from '../services/api';
import EditStudentModal from './EditStudentModal';

export default function StudentRegistration({ 
  onStudentAdded, 
  language, 
  activeSession
}) {
  const isKh = language === 'kh';

  // Form states - Fixed directly from Active Session
  const [studentId, setStudentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('Male');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Fixed values from active session
  const currentMajor = activeSession?.major || 'Computer Science';
  const currentClass = activeSession?.class_name || 'Year 3 - CS A';

  // Face capture states
  const [capturedImage, setCapturedImage] = useState(null);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [isProcessingFace, setIsProcessingFace] = useState(false);
  const [faceQualityStatus, setFaceQualityStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState(null);
  const [registeredStudents, setRegisteredStudents] = useState([]);
  const [editingStudent, setEditingStudent] = useState(null);

  // Webcam references
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(true);

  useEffect(() => {
    fetchRegisteredList();
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const fetchRegisteredList = async () => {
    try {
      const res = await api.getStudents();
      if (res.success) {
        setRegisteredStudents(res.data || []);
      }
    } catch (e) {
      console.warn('Failed to load registered list:', e);
    }
  };

  const startCamera = async () => {
    try {
      setCapturedImage(null);

      const getStream = async () => {
        try {
          return await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
            audio: false
          });
        } catch (e1) {
          try {
            return await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'user' },
              audio: false
            });
          } catch (e2) {
            return await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
          }
        }
      };

      const stream = await getStream();
      streamRef.current = stream;
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('autoplay', 'true');
        video.muted = true;
        try {
          await video.play();
        } catch(e) {
          const retryPlay = () => {
            if (videoRef.current) videoRef.current.play().catch(() => {});
            document.removeEventListener('touchstart', retryPlay);
            document.removeEventListener('click', retryPlay);
          };
          document.addEventListener('touchstart', retryPlay, { once: true, passive: true });
          document.addEventListener('click', retryPlay, { once: true, passive: true });
        }
      }
      setCameraActive(true);
    } catch (err) {
      console.warn('Registration Camera Error:', err);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleSnapWebcam = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessingFace(true);
    setFaceQualityStatus(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);

    await processFaceImage(dataUrl);
    setIsProcessingFace(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFace(true);
    setFaceQualityStatus(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      setCapturedImage(dataUrl);
      await processFaceImage(dataUrl);
      setIsProcessingFace(false);
    };
    reader.readAsDataURL(file);
  };

  const processFaceImage = async (imageSrc) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;
      await new Promise((resolve, reject) => { 
        img.onload = resolve; 
        img.onerror = reject;
      });

      const result = await faceService.extractFaceDescriptor(img);

      if (result && result.success && result.descriptor) {
        setFaceDescriptor(result.descriptor);
        setFaceQualityStatus({
          valid: true,
          message: isKh 
            ? '✔ រកឃើញមុខនិស្សិតច្បាស់លាស់ (128-D Biometric Vector ស្គាល់ ១០០%)' 
            : '✔ Clear face detected (128-D biometric descriptor extracted)'
        });
      } else {
        setFaceDescriptor(null);
        setFaceQualityStatus({
          valid: false,
          message: isKh
            ? `❌ ${result?.error || 'AI មិនអាចសម្គាល់មុខបានច្បាស់ទេ'} — សូមថតសារជាថ្មី`
            : `❌ ${result?.error || 'No face detected in photo'} — Please try again with clear lighting.`
        });
      }
    } catch (err) {
      setFaceDescriptor(null);
      setFaceQualityStatus({
        valid: false,
        message: err.message || 'Face analysis failed.'
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!studentId.trim() || !fullName.trim()) {
      setFormFeedback({
        type: 'error',
        message: isKh ? 'សូមបំពេញព័ត៌មានចាំបាច់ (អត្តលេខ, ឈ្មោះ)' : 'Please fill all required fields.'
      });
      return;
    }

    if (!faceDescriptor && !capturedImage) {
      setFormFeedback({
        type: 'error',
        message: isKh ? 'សូមថតរូបមុខនិស្សិត ឬ Upload រូបថតជាមុនសិន' : 'Please capture face photo first.'
      });
      return;
    }

    setIsSubmitting(true);
    setFormFeedback(null);

    try {
      const payload = {
        student_id: studentId.trim(),
        full_name: fullName.trim(),
        gender,
        major: currentMajor,
        class_name: currentClass,
        email: email.trim() || null,
        phone: phone.trim() || null,
        photo_base64: capturedImage,
        face_descriptor: faceDescriptor
      };

      const res = await api.createStudent(payload);

      if (res.success) {
        setFormFeedback({
          type: 'success',
          message: isKh 
            ? `✔ បានចុះឈ្មោះនិស្សិត "${fullName}" ចូលក្នុងថ្នាក់ ${currentClass} ដោយជោគជ័យ!`
            : `✔ Successfully registered "${fullName}" to ${currentClass}!`
        });

        // Reset form
        setStudentId('');
        setFullName('');
        setCapturedImage(null);
        setFaceDescriptor(null);
        setFaceQualityStatus(null);

        fetchRegisteredList();
        if (onStudentAdded) onStudentAdded();
      } else {
        setFormFeedback({
          type: 'error',
          message: res.error || 'Registration failed.'
        });
      }
    } catch (err) {
      setFormFeedback({
        type: 'error',
        message: err.message || 'Network error occurred.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm(isKh ? 'តើអ្នកប្រាកដជាចង់លុបនិស្សិតនេះ?' : 'Delete this student?')) return;
    try {
      await api.deleteStudent(id);
      fetchRegisteredList();
      if (onStudentAdded) onStudentAdded();
    } catch (e) {
      console.error(e);
    }
  };

  // Sort registered students A-Z
  const sortedStudents = [...registeredStudents].sort((a, b) => 
    a.full_name.localeCompare(b.full_name)
  );

  return (
    <div className="tab-pane">
      {/* Panel 1: Registration Form & Viewfinder */}
      <div className="panel">
        <h2>{isKh ? 'ចុះឈ្មោះនិស្សិតថ្មី (Student Registration)' : 'Register New Student'}</h2>
        <p className="hint">
          {isKh 
            ? 'បំពេញព័ត៌មាន ហើយថតរូបមុខមួយសន្លឹកឱ្យច្បាស់។ រូបថត និង 128-D Biometric Vector នឹងត្រូវបានរក្សាទុកក្នុង PostgreSQL Database (Supabase)។' 
            : 'Fill in student details and capture a clear face photo. Biometrics are saved to PostgreSQL DB (Supabase).'}
        </p>

        <div className="row">
          {/* Left Column: Form Fields */}
          <div className="col">
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>{isKh ? 'លេខសម្គាល់និស្សិត (Student ID)' : 'Student ID'}</label>
                <input
                  type="text"
                  placeholder="e.g. STU-001"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label>{isKh ? 'ឈ្មោះពេញ (Full Name)' : 'Full Name'}</label>
                <input
                  type="text"
                  placeholder="e.g. Chan Dara (ចាន់ ដារ៉ា)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="row">
                {/* Fixed Major from Active Session */}
                <div className="col">
                  <div className="field">
                    <label>{isKh ? 'ជំនាញ (Major)' : 'Major'}</label>
                    <input
                      type="text"
                      value={currentMajor}
                      readOnly
                      style={{ background: 'var(--panel-2)', cursor: 'not-allowed', color: 'var(--text)' }}
                    />
                  </div>
                </div>

                <div className="col">
                  <div className="field">
                    <label>{isKh ? 'ភេទ (Gender)' : 'Gender'}</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)}>
                      <option value="Male">{isKh ? 'ប្រុស' : 'Male'}</option>
                      <option value="Female">{isKh ? 'ស្រី' : 'Female'}</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Fixed Class & Batch from Active Session */}
              <div className="field">
                <label>{isKh ? 'ថ្នាក់ & ជំនាន់ (Class & Batch)' : 'Class & Batch'}</label>
                <input
                  type="text"
                  value={currentClass}
                  readOnly
                  style={{ background: 'var(--panel-2)', cursor: 'not-allowed', color: 'var(--accent)', fontWeight: '600' }}
                />
              </div>

              {formFeedback && (
                <div className={`msg ${formFeedback.type === 'success' ? 'ok' : 'fail'}`}>
                  {formFeedback.message}
                </div>
              )}

              <button
                type="submit"
                className="btn"
                disabled={isSubmitting || isProcessingFace}
                style={{ width: '100%', marginTop: '12px' }}
              >
                {isSubmitting && <Loader2 size={16} className="spin-icon" style={{ marginRight: 6 }} />}
                <span>{isSubmitting ? (isKh ? 'កំពុងរក្សាទុក...' : 'Saving...') : (isKh ? 'រក្សាទុកទិន្នន័យនិស្សិត' : 'Register Student')}</span>
              </button>
            </form>
          </div>

          {/* Right Column: Camera Viewfinder & Preview */}
          <div className="col">
            <div className={`cam-frame ${cameraActive ? 'scanning' : ''}`}>
              <span className="bracket b-tl"></span>
              <span className="bracket b-tr"></span>
              <span className="bracket b-bl"></span>
              <span className="bracket b-br"></span>

              {/* Camera Video - Always mounted in DOM */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                webkit-playsinline="true"
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: (cameraActive && !capturedImage) ? 'block' : 'none'
                }}
              />

              {/* Photo Preview when snapped/uploaded */}
              {capturedImage && (
                <img
                  src={capturedImage}
                  alt="Captured face"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              )}

              {/* AI Processing Face Overlay */}
              {isProcessingFace && (
                <div className="cam-loading-overlay">
                  <div className="cam-radar-spinner"></div>
                  <div className="cam-loading-text">
                    <span className="dot"></span>
                    <span>{isKh ? 'AI កំពុងទាញយក Face Descriptors (128-D)...' : 'AI Extracting 128D Face Descriptors...'}</span>
                  </div>
                </div>
              )}

              {/* Camera Off Placeholder when stopped */}
              {!cameraActive && !capturedImage && !isProcessingFace && (
                <div style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#040711',
                  color: 'var(--text-dim)',
                  gap: '8px'
                }}>
                  <CameraOff size={40} style={{ opacity: 0.5 }} />
                  <span style={{ fontSize: '13px', letterSpacing: '0.05em' }}>
                    {isKh ? 'កាមេរាត្រូវបានបិទ (CAMERA OFF)' : 'CAMERA OFF'}
                  </span>
                </div>
              )}

              <canvas ref={canvasRef} style={{ display: 'none' }} />

              <div className="cam-status">
                {cameraActive ? (isKh ? 'កាមេរាកំពុងដំណើរការ' : 'LIVE CAMERA') : (isKh ? 'កាមេរាបិទ' : 'CAMERA OFF')}
              </div>
            </div>

            {/* Quality Status Feedback */}
            {faceQualityStatus && (
              <div className={`msg ${faceQualityStatus.valid ? 'ok' : 'fail'}`} style={{ marginTop: '8px' }}>
                {faceQualityStatus.message}
              </div>
            )}

            {/* Camera Control Buttons: 3 equal width buttons with red Stop Cam button */}
            <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '12px' }}>
              {cameraActive ? (
                <button
                  type="button"
                  className="btn danger"
                  style={{ flex: 1 }}
                  onClick={stopCamera}
                >
                  <CameraOff size={15} />
                  <span>{isKh ? 'បិទកាមេរា' : 'Stop Cam'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn"
                  style={{ flex: 1 }}
                  onClick={startCamera}
                >
                  <Camera size={15} />
                  <span>{isKh ? 'បើកកាមេរា' : 'Start Cam'}</span>
                </button>
              )}

              <button
                type="button"
                className="btn"
                style={{ flex: 1 }}
                onClick={handleSnapWebcam}
                disabled={!cameraActive || isProcessingFace}
              >
                <Camera size={15} />
                <span>
                  {isProcessingFace 
                    ? (isKh ? 'កំពុងស្កេន...' : 'Processing...') 
                    : (isKh ? 'ថតរូបមុខ' : 'Capture Photo')}
                </span>
              </button>

              <label 
                className="btn ghost" 
                style={{ flex: 1, cursor: 'pointer', margin: 0, textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Upload size={15} />
                <span>{isKh ? 'Upload រូបថត' : 'Upload File'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Panel 2: Enrolled Students List */}
      <div className="panel">
        <h2>{isKh ? `និស្សិតដែលបានចុះឈ្មោះក្នុង Database (${sortedStudents.length})` : `Enrolled Students in Database (${sortedStudents.length})`}</h2>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>{isKh ? 'ល.រ' : 'No.'}</th>
                <th>{isKh ? 'រូបថត' : 'Photo'}</th>
                <th>{isKh ? 'អត្តលេខ' : 'Student ID'}</th>
                <th>{isKh ? 'ឈ្មោះពេញ' : 'Full Name'}</th>
                <th>{isKh ? 'ជំនាញ' : 'Major'}</th>
                <th>{isKh ? 'ថ្នាក់' : 'Class'}</th>
                <th>{isKh ? 'ភេទ' : 'Gender'}</th>
                <th>{isKh ? 'AI Biometric' : 'AI Face Biometrics'}</th>
                <th>{isKh ? 'សកម្មភាព' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty">{isKh ? 'មិនទាន់មាននិស្សិតក្នុងប្រព័ន្ធ' : 'No students enrolled yet.'}</td>
                </tr>
              ) : (
                sortedStudents.map((s, idx) => (
                  <tr key={s.id}>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>
                      <b>{idx + 1}</b>
                    </td>
                    <td>
                      <img
                        src={getMediaUrl(s.photo_url || s.photo) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23263457"/></svg>'}
                        alt=""
                        className="thumb"
                        style={{ width: '38px', height: '38px' }}
                      />
                    </td>
                    <td style={{ fontFamily: 'var(--mono)' }}><b>{s.student_id}</b></td>
                    <td><b>{s.full_name}</b></td>
                    <td><span className="pill" style={{ background: 'var(--panel-2)', color: 'var(--text)' }}>{s.major || 'Computer Science'}</span></td>
                    <td>{s.class_name}</td>
                    <td>{s.gender || 'Other'}</td>
                    <td>
                      {s.face_descriptor ? (
                        <span className="pill present">128-D Vector ✓</span>
                      ) : (
                        <span className="pill absent">No Biometric</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          className="btn ghost btn-sm"
                          style={{ color: 'var(--primary, #00f2fe)' }}
                          onClick={() => setEditingStudent(s)}
                          title={isKh ? 'កែប្រែទិន្នន័យ' : 'Edit Student'}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          className="btn ghost btn-sm"
                          style={{ color: 'var(--danger, #ff4d4f)' }}
                          onClick={() => handleDeleteStudent(s.id)}
                          title={isKh ? 'លុប' : 'Delete'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingStudent && (
        <EditStudentModal
          isOpen={Boolean(editingStudent)}
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSuccess={() => {
            setEditingStudent(null);
            fetchRegisteredList();
            if (onStudentAdded) onStudentAdded();
          }}
          language={language}
          sessions={[]}
        />
      )}
    </div>
  );
}
