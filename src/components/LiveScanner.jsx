import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Camera, 
  CameraOff, 
  ShieldCheck,
  RefreshCw 
} from 'lucide-react';
import { faceService } from '../services/faceService';
import { soundService } from '../services/soundService';
import { api } from '../services/api';

export default function LiveScanner({
  activeSession,
  students,
  aiReady,
  onOpenFallback,
  onOpenAIHelp,
  language,
  detectorType,
  distanceThreshold,
  soundEnabled
}) {
  const isKh = language === 'kh';

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' (Front) | 'environment' (Back)
  
  const [detectedCount, setDetectedCount] = useState(0);
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const [lastCheckInAlert, setLastCheckInAlert] = useState(null);
  const [unknownFaceDetected, setUnknownFaceDetected] = useState(false);
  const [quickManualStudent, setQuickManualStudent] = useState('');

  const cooldownMap = useRef(new Map());

  useEffect(() => {
    startCamera('user');
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (students && students.length > 0) {
      faceService.buildFaceMatcher(students, distanceThreshold || 0.58);
    }
  }, [students, distanceThreshold]);

  const startCamera = async (mode = facingMode) => {
    soundService.unlockAudio();
    setCameraLoading(true);
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: mode ? { ideal: mode } : 'user' 
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setIsCameraActive(true);
          setCameraLoading(false);
          startRecognitionLoop();
        };
      }
    } catch (err) {
      console.error('Camera Access Error:', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          streamRef.current = fallbackStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setIsCameraActive(true);
            setCameraLoading(false);
            startRecognitionLoop();
          };
        }
      } catch (fallbackErr) {
        setCameraError(err.message || 'Cannot access camera.');
        setCameraLoading(false);
        setIsCameraActive(false);
      }
    }
  };

  const switchCamera = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    stopCamera();
    setTimeout(() => {
      startCamera(nextMode);
    }, 150);
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const startRecognitionLoop = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video.videoWidth || !video.videoHeight) return;

      try {
        // Run AI Recognition
        const results = await faceService.recognizeFacesInVideo(
          video, 
          detectorType || 'ssd', 
          distanceThreshold || 0.58
        );

        setDetectedCount(results.length);

        // Draw Canvas Overlays
        faceService.drawRecognitionOverlay(canvas, video, results);

        if (results.length === 0) {
          setUnknownFaceDetected(false);
          return;
        }

        let hasUnmatched = false;

        results.forEach(res => {
          if (res.isRecognized && res.matchedStudent) {
            handleStudentRecognized(res.matchedStudent, res.confidence);
          } else {
            hasUnmatched = true;
          }
        });

        setUnknownFaceDetected(hasUnmatched);
      } catch (err) {
        console.warn('Face detection error:', err);
      }
    }, 250);
  };

  const handleStudentRecognized = async (matchedStudent, confidence) => {
    const currentSession = activeSession || sessions?.[0];
    if (!currentSession) {
      console.warn('No active session available for check-in');
      return;
    }

    const studentIdentifier = matchedStudent.id || matchedStudent.student_id;
    const now = Date.now();

    const lastSeen = cooldownMap.current.get(studentIdentifier) || 0;
    if (now - lastSeen < 6000) return;
    cooldownMap.current.set(studentIdentifier, now);

    let snapshotBase64 = null;
    try {
      if (videoRef.current) {
        const snapCanvas = document.createElement('canvas');
        snapCanvas.width = 480;
        snapCanvas.height = 360;
        const ctx = snapCanvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, 480, 360);
        snapshotBase64 = snapCanvas.toDataURL('image/jpeg', 0.92);
      }
    } catch (e) {
      console.warn('Snapshot error:', e);
    }

    try {
      const response = await api.checkIn({
        student_id: studentIdentifier,
        session_id: currentSession.id,
        confidence_score: confidence || 0.95,
        snapshot_base64: snapshotBase64,
        notes: `AI Face Recognition (${Math.round((confidence || 0.95) * 100)}% match)`
      });

      if (response.success) {
        if (soundEnabled) {
          soundService.playSuccessChime();
          soundService.speakCheckInSuccess(matchedStudent.full_name || response.data?.full_name, language);
        }
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });

        setLastCheckInAlert({
          type: 'success',
          time: response.data.check_in_time,
          message: `${matchedStudent.full_name} (${matchedStudent.student_id}) · ${response.data.check_in_time}`,
          student: response.data
        });

        setRecentCheckIns(prev => [response.data, ...prev.slice(0, 14)]);
      } else if (response.isDuplicate) {
        if (soundEnabled) {
          soundService.playWarningSound();
          soundService.speakAlreadyCheckedIn(matchedStudent.full_name, language);
        }
        setLastCheckInAlert({
          type: 'duplicate',
          message: response.message || `${matchedStudent.full_name} is already checked in today.`,
          student: matchedStudent
        });
      }
    } catch (err) {
      console.error('Check-in error:', err);
    }
  };

  const handleQuickManualCheckIn = async () => {
    if (!quickManualStudent || !activeSession) return;
    try {
      const res = await api.manualOverride({
        student_id: Number(quickManualStudent),
        session_id: activeSession.id,
        status: 'PRESENT',
        reason: 'Unmatched AI Scan Fallback',
        notes: 'Quick manual check-in from scanner',
        teacher_name: 'Teacher'
      });
      if (res.success) {
        setLastCheckInAlert({
          type: 'success',
          time: new Date().toTimeString().slice(0,5),
          message: `${res.data.full_name} (Manual Override) · ${new Date().toTimeString().slice(0,5)}`,
          student: res.data
        });
        setRecentCheckIns(prev => [res.data, ...prev.slice(0, 14)]);
        setQuickManualStudent('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="tab-pane">
      {/* Panel 1: Session Context */}
      <div className="panel">
        <h2>{isKh ? 'Session ចុះវត្តមានបច្ចុប្បន្ន' : 'Active Attendance Session'}</h2>
        <p className="hint">
          {activeSession 
            ? `${activeSession.session_code} · ${activeSession.name} (${activeSession.class_name}) | 📅 ${activeSession.session_date} (⏱ ${activeSession.start_time} - ${activeSession.end_time})`
            : (isKh ? 'មិនទាន់មាន Session ដំណើរការ' : 'No active session selected')}
        </p>
      </div>

      {/* Panel 2: Live Viewfinder */}
      <div className="panel">
        <h2>{isKh ? 'ស្កេនមុខនិស្សិត (Live AI Camera)' : 'Live AI Face Scanner'}</h2>
        <p className="hint">
          {isKh 
            ? 'ឈរចំមុខកាមេរាដើម្បីឱ្យ AI ផ្ទៀងផ្ទាត់ Biometric Vector (128-D) និងកត់ត្រាវត្តមានស្វ័យប្រវត្តិ។' 
            : 'Look directly into camera for automated biometric matching and check-in.'}
        </p>

        <div style={{ textAlign: 'center' }}>
          <div className={`cam-frame ${isCameraActive ? 'scanning' : ''}`}>
            <video ref={videoRef} playsInline muted autoPlay />
            <canvas ref={canvasRef} className="cam-overlay-canvas" />
            
            {/* Viewfinder Brackets */}
            <div className="bracket b-tl"></div>
            <div className="bracket b-tr"></div>
            <div className="bracket b-bl"></div>
            <div className="bracket b-br"></div>
            
            {/* Laser Scanline */}
            <div className="scanline"></div>

            <div className="cam-status">
              {isCameraActive ? (isKh ? 'កាមេរាកំពុងដំណើរការ' : 'LIVE AI SCANNING') : (isKh ? 'កាមេរាបិទ' : 'CAMERA OFF')}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {isCameraActive ? (
              <button className="btn danger" onClick={stopCamera}>
                <CameraOff size={16} />
                <span>{isKh ? 'បិទកាមេរា' : 'Stop Camera'}</span>
              </button>
            ) : (
              <button className="btn" onClick={() => startCamera(facingMode)} disabled={cameraLoading}>
                <Camera size={16} />
                <span>{cameraLoading ? (isKh ? 'កំពុងបើក...' : 'Starting...') : (isKh ? 'បើកកាមេរា' : 'Start Camera')}</span>
              </button>
            )}

            <button 
              className="btn ghost" 
              onClick={switchCamera} 
              disabled={cameraLoading}
              title={isKh ? 'ប្តូរកាមេរា (មុខ / ក្រោយ)' : 'Switch Front/Back Camera'}
            >
              <RefreshCw size={16} className={cameraLoading ? 'spinning' : ''} />
              <span>
                {isKh 
                  ? (facingMode === 'user' ? '📷 កាមេរាក្រោយ (Back)' : '🤳 កាមេរាមុខ (Front)') 
                  : (facingMode === 'user' ? '📷 Back Camera' : '🤳 Front Camera')}
              </span>
            </button>

            <button className="btn ghost" onClick={onOpenFallback}>
              <ShieldCheck size={16} className="text-warning" />
              <span>{isKh ? 'ចុះវត្តមានដោយដៃ (Manual Fallback)' : 'Manual Fallback'}</span>
            </button>
          </div>
        </div>

        {/* Live Feedback Messages */}
        <div style={{ marginTop: '16px' }}>
          {lastCheckInAlert?.type === 'success' && (
            <div className="msg ok">
              ✔ {isKh ? 'បានកត់ត្រាវត្តមាន៖' : 'Attendance Verified:'} <b>{lastCheckInAlert.message}</b>
            </div>
          )}

          {lastCheckInAlert?.type === 'duplicate' && (
            <div className="msg warn">
              ⚠ {isKh ? 'បានចុះវត្តមានរួចហើយ (ទប់ស្កាត់ការចុះជាន់គ្នា)៖' : 'Duplicate Check-in Prevented:'} {lastCheckInAlert.message}
            </div>
          )}

          {unknownFaceDetected && (
            <div className="msg fail">
              <div>
                ✖ {isKh ? 'AI មិនអាចស្គាល់មុខនេះបានច្បាស់ទេ (ពន្លឺងងឹត ឬមិនទាន់ចុះឈ្មោះ)' : 'AI Unmatched Face Detected.'}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select 
                  style={{ maxWidth: '280px' }}
                  value={quickManualStudent}
                  onChange={(e) => setQuickManualStudent(e.target.value)}
                >
                  <option value="">— {isKh ? 'ជ្រើសរើសនិស្សិតចុះដោយដៃ' : 'Select Student'} —</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.student_id})</option>
                  ))}
                </select>
                <button className="btn ghost btn-sm" onClick={handleQuickManualCheckIn} disabled={!quickManualStudent}>
                  {isKh ? 'បញ្ជាក់វត្តមាន' : 'Confirm Check-in'}
                </button>
                <button className="btn ghost btn-sm" onClick={onOpenAIHelp}>
                  {isKh ? 'សំណួរទី ៧ (ដំណោះស្រាយ AI)' : 'AI Diagnostics'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Panel 3: Live Event Log */}
      <div className="panel">
        <h2>{isKh ? 'កំណត់ហេតុវត្តមានផ្ទាល់ (Live Event Log)' : 'Live Attendance Event Log'}</h2>
        <div className="log">
          {recentCheckIns.length === 0 ? (
            <div className="empty">{isKh ? 'មិនទាន់មានវត្តមានថ្មីនៅឡើយ' : 'No attendance events yet.'}</div>
          ) : (
            recentCheckIns.map((rec, i) => (
              <div key={rec.id || i} className="l">
                [{rec.check_in_time || '00:00'}] <span className="name">{rec.full_name || rec.student_code}</span> ({rec.student_code || rec.student_id}) — <span className="pill present">{rec.status || 'PRESENT'}</span> via <span className="method">{rec.check_in_method || 'AI_FACE'}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
