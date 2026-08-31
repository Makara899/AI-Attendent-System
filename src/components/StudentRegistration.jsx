import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  CameraOff, 
  Upload, 
  Trash2,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
  User,
  Hash,
  BookOpen,
  Users
} from 'lucide-react';
import { faceService } from '../services/faceService';
import { api, getMediaUrl } from '../services/api';

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
  const [facingMode, setFacingMode] = useState('user'); // 'user' (Front) | 'environment' (Back)

  // Webcam references
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(true);

  useEffect(() => {
    fetchRegisteredList();
    startCamera('user');
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

  const startCamera = async (mode = facingMode) => {
    try {
      setCapturedImage(null);

      const getStream = async () => {
        try {
          return await navigator.mediaDevices.getUserMedia({
            video: { 
              width: { ideal: 640 }, 
              height: { ideal: 480 }, 
              facingMode: mode ? { ideal: mode } : 'user' 
            },
            audio: false
          });
        } catch (e1) {
          try {
            return await navigator.mediaDevices.getUserMedia({
              video: { facingMode: mode ? mode : 'user' },
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

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

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

  const switchCamera = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    await startCamera(nextMode);
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
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);

    try {
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      const detection = await faceService.detectSingleFace(img);
      if (detection && detection.descriptor) {
        setFaceDescriptor(Array.from(detection.descriptor));
        setFaceQualityStatus({
          valid: true,
          message: isKh ? '✔ AI បានស្រង់ទិន្នន័យផ្ទៃមុខ Biometric Vector (128-D) ត្រឹមត្រូវ!' : '✔ High-quality Face Biometric Vector (128-D) extracted!'
        });
      } else {
        setFaceDescriptor(null);
        setFaceQualityStatus({
          valid: false,
          message: isKh ? '✖ មិនអាចចាប់បានផ្ទៃមុខច្បាស់ទេ។ សូមសាកល្បងថតម្តងទៀត។' : '✖ No clear face detected. Please retake photo.'
        });
      }
    } catch (err) {
      console.error('Face detection error on snap:', err);
      setFaceDescriptor(null);
      setFaceQualityStatus({
        valid: false,
        message: isKh ? 'កំហុសក្នុងការវិភាគមុខ' : 'Error analyzing face biometrics.'
      });
    } finally {
      setIsProcessingFace(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessingFace(true);
    setFaceQualityStatus(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      setCapturedImage(dataUrl);

      try {
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => { img.onload = resolve; });

        const detection = await faceService.detectSingleFace(img);
        if (detection && detection.descriptor) {
          setFaceDescriptor(Array.from(detection.descriptor));
          setFaceQualityStatus({
            valid: true,
            message: isKh ? '✔ AI បានស្រង់ទិន្នន័យផ្ទៃមុខ Biometric Vector (128-D) ត្រឹមត្រូវ!' : '✔ Biometric vector extracted successfully!'
          });
        } else {
          setFaceDescriptor(null);
          setFaceQualityStatus({
            valid: false,
            message: isKh ? '✖ មិនអាចរកឃើញផ្ទៃមុខច្បាស់លាស់ក្នុងរូបភាពនេះទេ។' : '✖ No face detected in uploaded image.'
          });
        }
      } catch (err) {
        console.error('File face detection error:', err);
        setFaceDescriptor(null);
        setFaceQualityStatus({
          valid: false,
          message: isKh ? 'កំហុសក្នុងការវិភាគរូបភាព' : 'Error detecting face from file.'
        });
      } finally {
        setIsProcessingFace(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRetakePhoto = () => {
    setCapturedImage(null);
    setFaceDescriptor(null);
    setFaceQualityStatus(null);
    startCamera(facingMode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormFeedback(null);

    if (!studentId.trim() || !fullName.trim()) {
      setFormFeedback({
        type: 'error',
        message: isKh ? 'សូមបំពេញអត្តលេខ និងឈ្មោះនិស្សិត' : 'Student ID and Full Name are required.'
      });
      return;
    }

    if (!capturedImage) {
      setFormFeedback({
        type: 'error',
        message: isKh ? 'សូមថតរូបផ្ទៃមុខ ឬ Upload រូបថតជាមុនសិន' : 'Please capture or upload a face photo.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('student_id', studentId.trim());
      formData.append('full_name', fullName.trim());
      formData.append('gender', gender);
      formData.append('major', currentMajor);
      formData.append('class_name', currentClass);
      formData.append('email', email.trim());
      formData.append('phone', phone.trim());

      if (faceDescriptor) {
        formData.append('face_descriptor', JSON.stringify(faceDescriptor));
      }

      if (capturedImage && capturedImage.startsWith('data:image')) {
        const fetchRes = await fetch(capturedImage);
        const blob = await fetchRes.blob();
        formData.append('photo', blob, `${studentId.trim()}_face.jpg`);
      }

      const res = await api.createStudent(formData);
      if (res.success) {
        setFormFeedback({
          type: 'success',
          message: isKh ? `✔ បានចុះឈ្មោះនិស្សិត "${fullName}" ដោយជោគជ័យ!` : `✔ Student "${fullName}" registered successfully!`
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
          message: res.error || (isKh ? 'កំហុសក្នុងការចុះឈ្មោះ' : 'Registration failed.')
        });
      }
    } catch (err) {
      setFormFeedback({
        type: 'error',
        message: err.message || (isKh ? 'កំហុស Server' : 'Server error occurred.')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm(isKh ? 'តើអ្នកប្រាកដជាចង់លុបនិស្សិតនេះចេញពីប្រព័ន្ធ?' : 'Delete this student?')) return;
    try {
      const res = await api.deleteStudent(id);
      if (res.success) {
        fetchRegisteredList();
        if (onStudentAdded) onStudentAdded();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const sortedStudents = [...registeredStudents].sort((a, b) => 
    (a.full_name || '').localeCompare(b.full_name || '')
  );

  return (
    <div className="tab-pane fade-in-fast">
      {/* Panel 1: Registration Card */}
      <div className="panel">
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
          <div>
            <h2>{isKh ? 'ចុះឈ្មោះនិស្សិត និង Biometric ផ្ទៃមុខ' : 'Student Enrollment & Face Biometrics'}</h2>
            <p className="hint" style={{ margin: 0 }}>
              {isKh ? 'ថតរូបផ្ទៃមុខដើម្បីឱ្យ AI ទាញយក Face Descriptor 128-D សម្រាប់ស្កេនវត្តមាន' : 'Capture photo to extract 128-D face biometric vector for instant attendance'}
            </p>
          </div>
          <div className="hero-chip" style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', color: 'var(--accent)' }}>
            👥 <strong>{currentClass}</strong> · {currentMajor}
          </div>
        </div>

        <div className="row">
          {/* Column 1: Camera Viewfinder & Snap Actions */}
          <div className="col">
            <div className={`cam-frame ${cameraActive && !capturedImage ? 'scanning' : ''}`} style={{ height: '280px', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
              
              {/* Floating Camera Flip Button */}
              {cameraActive && !capturedImage && (
                <button 
                  className="floating-cam-btn" 
                  onClick={switchCamera}
                  title={isKh ? 'ប្តូរកាមេរា (មុខ / ក្រោយ)' : 'Switch Camera'}
                  type="button"
                >
                  <RefreshCw size={16} />
                </button>
              )}

              {/* Camera Video */}
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

              {/* Live Oval Face Guide */}
              {cameraActive && !capturedImage && !isProcessingFace && (
                <div className="face-guide-oval">
                  <span className="guide-text">{isKh ? 'ដាក់មុខក្នុងរង្វង់នេះ' : 'Align face in oval'}</span>
                </div>
              )}

              {/* AI Processing Face Overlay */}
              {isProcessingFace && (
                <div className="cam-loading-overlay">
                  <div className="cam-radar-spinner"></div>
                  <div className="cam-loading-text">
                    <span className="dot"></span>
                    <span>{isKh ? 'AI កំពុងទាញយក Face Descriptors (128-D)...' : 'Extracting 128-D Biometrics...'}</span>
                  </div>
                </div>
              )}

              {/* Camera Off Placeholder */}
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
                  <CameraOff size={36} style={{ opacity: 0.5 }} />
                  <span style={{ fontSize: '13px' }}>{isKh ? 'កាមេរាបិទ' : 'Camera Off'}</span>
                </div>
              )}

              <canvas ref={canvasRef} style={{ display: 'none' }} />

              <div className="cam-status">
                {capturedImage ? 'PHOTO READY' : (cameraActive ? 'LIVE CAMERA' : 'CAMERA OFF')}
              </div>
            </div>

            {/* Quality Status Feedback */}
            {faceQualityStatus && (
              <div className={`msg ${faceQualityStatus.valid ? 'ok' : 'fail'}`} style={{ marginTop: '10px' }}>
                {faceQualityStatus.message}
              </div>
            )}

            {/* Camera Control Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '12px', alignItems: 'center' }}>
              {capturedImage ? (
                <button
                  type="button"
                  className="btn ghost"
                  style={{ flex: 1 }}
                  onClick={handleRetakePhoto}
                >
                  <RefreshCw size={15} />
                  <span>{isKh ? 'ថតឡើងវិញ (Retake)' : 'Retake Photo'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1.5, background: 'var(--accent-gradient)', color: '#FFFFFF' }}
                  onClick={handleSnapWebcam}
                  disabled={!cameraActive || isProcessingFace}
                >
                  <Camera size={18} />
                  <span>{isProcessingFace ? (isKh ? 'កំពុងស្កេន...' : 'Processing...') : (isKh ? 'ថតរូបមុខ (Snap)' : 'Capture Photo')}</span>
                </button>
              )}

              <label 
                className="btn ghost" 
                style={{ flex: 1, cursor: 'pointer', margin: 0, textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Upload size={15} />
                <span>{isKh ? 'Upload' : 'Upload'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          {/* Column 2: Form Fields */}
          <div className="col">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="field" style={{ margin: 0 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Hash size={14} className="text-primary" />
                  {isKh ? 'លេខសម្គាល់និស្សិត (Student ID)' : 'Student ID'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. STU-001"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                />
              </div>

              <div className="field" style={{ margin: 0 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <User size={14} className="text-primary" />
                  {isKh ? 'ឈ្មោះពេញ (Full Name)' : 'Full Name'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chan Dara (ចាន់ ដារ៉ា)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="row" style={{ gap: '10px' }}>
                <div className="col" style={{ minWidth: 0 }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label>{isKh ? 'ភេទ (Gender)' : 'Gender'}</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)}>
                      <option value="Male">{isKh ? 'ប្រុស (Male)' : 'Male'}</option>
                      <option value="Female">{isKh ? 'ស្រី (Female)' : 'Female'}</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="col" style={{ minWidth: 0 }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label>{isKh ? 'ថ្នាក់ (Class)' : 'Class'}</label>
                    <input
                      type="text"
                      value={currentClass}
                      readOnly
                      style={{ background: 'var(--panel-2)', cursor: 'not-allowed', color: 'var(--accent)', fontWeight: '600' }}
                    />
                  </div>
                </div>
              </div>

              {formFeedback && (
                <div className={`msg ${formFeedback.type === 'success' ? 'ok' : 'fail'}`} style={{ margin: 0 }}>
                  {formFeedback.message}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || isProcessingFace}
                style={{ width: '100%', marginTop: '6px', height: '46px', fontSize: '14.5px', background: 'var(--accent-gradient)', color: '#FFFFFF' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="spin-icon" />
                    <span>{isKh ? 'កំពុងរក្សាទុក...' : 'Saving Student...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>{isKh ? 'ចុះឈ្មោះនិស្សិត (Save Student)' : 'Register Student'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Panel 2: Enrolled Students List */}
      <div className="panel">
        <h2>{isKh ? `និស្សិតដែលបានចុះឈ្មោះក្នុង Database (${sortedStudents.length})` : `Enrolled Students in Database (${sortedStudents.length})`}</h2>
        
        {/* Desktop Table View */}
        <div className="desktop-only-table" style={{ overflowX: 'auto' }}>
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
                      <button className="btn ghost btn-sm" onClick={() => handleDeleteStudent(s.id)}>
                        <Trash2 size={13} style={{ color: 'var(--danger)' }} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Student Cards View */}
        <div className="mobile-only-cards">
          {sortedStudents.length === 0 ? (
            <div className="empty">{isKh ? 'មិនទាន់មាននិស្សិតក្នុងប្រព័ន្ធ' : 'No students enrolled yet.'}</div>
          ) : (
            <div className="mobile-student-list">
              {sortedStudents.map((s, idx) => (
                <div key={s.id} className="mobile-student-card">
                  <div className="mobile-card-header">
                    <img
                      src={getMediaUrl(s.photo_url || s.photo) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23263457"/></svg>'}
                      alt=""
                      className="mobile-student-thumb"
                    />
                    <div className="mobile-card-meta">
                      <div className="mobile-student-name">{s.full_name}</div>
                      <div className="mobile-student-id-row">
                        <span className="mobile-id-badge">{s.student_id}</span>
                        <span className="mobile-gender-tag">{s.gender || 'Male'}</span>
                      </div>
                    </div>
                    <button 
                      className="btn ghost btn-icon btn-sm mobile-delete-btn" 
                      onClick={() => handleDeleteStudent(s.id)}
                      title="Delete"
                    >
                      <Trash2 size={15} className="text-danger" />
                    </button>
                  </div>

                  <div className="mobile-card-body">
                    <div className="mobile-chips-row">
                      <span className="mobile-chip-tag">📚 {s.major || 'Computer Science'}</span>
                      <span className="mobile-chip-tag">👥 {s.class_name}</span>
                    </div>
                    <div className="mobile-biometric-status">
                      {s.face_descriptor ? (
                        <span className="pill present">128-D Vector ✓</span>
                      ) : (
                        <span className="pill absent">No Biometric</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
