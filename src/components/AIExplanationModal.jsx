import React from 'react';
import { 
  HelpCircle, 
  X, 
  ShieldCheck, 
  Sliders, 
  Sun, 
  Camera, 
  Sparkles, 
  AlertTriangle,
  Layers,
  Database,
  Cpu,
  Check
} from 'lucide-react';

export default function AIExplanationModal({ isOpen, onClose, language }) {
  if (!isOpen) return null;

  const isKh = language === 'kh';

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content modal-lg scale-up">
        <div className="modal-header">
          <div className="modal-title-box">
            <div className="modal-icon-badge primary">
              <Sparkles size={22} className="text-primary" />
            </div>
            <div>
              <h3>
                {isKh 
                  ? 'សំណួរទី ៧៖ ដំណោះស្រាយពេល AI មិនអាចស្គាល់មុខនិស្សិតបានត្រឹមត្រូវ' 
                  : 'AI Diagnostic Guide: Handling Unmatched / Low-Confidence Face Scans'}
              </h3>
              <p className="text-muted small-text">
                {isKh 
                  ? 'ស្ថាបត្យកម្ម ៤ ស្រទាប់ដើម្បីធានាថាវត្តមានដំណើរការ ១០០% គ្មានការរអាក់រអួល' 
                  : '4-Tier Architectural Resilience Strategy for 100% Attendance Reliability'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body modal-scrollable">
          {/* Layer 1 */}
          <div className="guide-layer-card">
            <div className="layer-header">
              <div className="layer-number">1</div>
              <div className="layer-title">
                <ShieldCheck size={20} className="text-success" />
                <h4>
                  {isKh ? '១. ប្រព័ន្ធចុះវត្តមានជំនួសដោយដៃ (Immediate Teacher Fallback Override)' : '1. Immediate Manual Teacher Override'}
                </h4>
              </div>
            </div>
            <p className="layer-desc">
              {isKh 
                ? 'នៅពេល AI មិនស្គាល់មុខ ឬមានកម្រិតភាពជឿជាក់ទាប (Low Confidence Score) សាស្ត្រាចារ្យអាចប្រើប្រព័ន្ធ Manual Fallback ដើម្បីកត់ត្រាវត្តមានភ្លាមៗ ដោយជ្រើសរើសឈ្មោះ និងមូលហេតុ (ឧទាហរណ៍៖ ពន្លឺងងឹត, ពាក់ម៉ាស់, ពាក់វ៉ែនតា)។ ប្រព័ន្ធនឹងរក្សាទុកក្នុង SQLite ដោយកត់សម្គាល់ method ជា MANUAL_OVERRIDE និងកត់ត្រា audit log ដោយស្វ័យប្រវត្តិ។' 
                : 'When AI fails to match or confidence is below threshold, teachers can use the one-click Manual Fallback modal to record attendance directly with a specific logged reason (e.g. lighting, face mask, glasses). The system tags this as MANUAL_OVERRIDE in SQLite and logs the teacher verification audit trail.'}
            </p>
          </div>

          {/* Layer 2 */}
          <div className="guide-layer-card">
            <div className="layer-header">
              <div className="layer-number">2</div>
              <div className="layer-title">
                <Sliders size={20} className="text-warning" />
                <h4>
                  {isKh ? '២. ការកែសម្រួលកម្រិតភាពប្រែប្រួល AI (Distance Threshold Tuning)' : '2. Dynamic Distance Threshold Tuning'}
                </h4>
              </div>
            </div>
            <p className="layer-desc">
              {isKh 
                ? 'ប្រព័ន្ធប្រើប្រាស់ក្បួនគណនា Euclidean Distance លើ 128-D Biometric Vector។ ប្រសិនបើបរិយាកាសមានពន្លឺខ្សោយ អ្នកគ្រប់គ្រងអាចកែសម្រួល Distance Threshold ពី 0.45 ទៅ 0.55 ក្នុងផ្ទាំង Settings ដើម្បីអនុញ្ញាតឱ្យ AI ស្គាល់មុខបានងាយស្រួលជាងមុន ឬជ្រើសរើសរវាង SSD MobileNet v1 (ភាពសុក្រឹតខ្ពស់) និង TinyFaceDetector (ល្បឿនលឿន)។' 
                : 'Face recognition relies on Euclidean Distance between 128-D vectors. In challenging lighting conditions, administrators can tweak the Distance Threshold (from 0.45 to 0.55) in Settings to match faces with higher tolerance, or toggle between SSD MobileNet v1 and TinyFace detectors.'}
            </p>
          </div>

          {/* Layer 3 */}
          <div className="guide-layer-card">
            <div className="layer-header">
              <div className="layer-number">3</div>
              <div className="layer-title">
                <Camera size={20} className="text-primary" />
                <h4>
                  {isKh ? '៣. ការចុះឈ្មោះមុខឡើងវិញ & ច្រើនមុំ (Multi-Angle Face Enrollment)' : '3. Multi-Angle & Lighting Re-Enrollment'}
                </h4>
              </div>
            </div>
            <p className="layer-desc">
              {isKh 
                ? 'ប្រសិនបើនិស្សិតផ្លាស់ប្តូរម៉ូតសក់ ដុះពុកចង្កា ឬពាក់វ៉ែនតាថ្មី ប្រព័ន្ធអនុញ្ញាតឱ្យចូលទៅកាន់ទំព័រ "Register Face" ដើម្បីថតរូបភាពមុខថ្មី និងទាញយក Biometric Vector ថ្មីមកជំនួស ឬបន្ថែមក្នុង SQLite `students.face_descriptor`។' 
                : 'If a student significantly changes appearance (hair style, facial hair, new prescription glasses), the system allows quick profile re-enrollment to update the stored 128-dimensional embedding in SQLite.'}
            </p>
          </div>

          {/* Layer 4 */}
          <div className="guide-layer-card">
            <div className="layer-header">
              <div className="layer-number">4</div>
              <div className="layer-title">
                <Database size={20} className="text-info" />
                <h4>
                  {isKh ? '៤. ការពារការចុះស្ទួន & សុចរិតភាពទិន្នន័យ (Anti-Duplicate & SQLite Integrity)' : '4. Anti-Duplicate Protection & SQLite Integrity'}
                </h4>
              </div>
            </div>
            <p className="layer-desc">
              {isKh 
                ? 'ប្រព័ន្ធមានលក្ខខណ្ឌការពារស្ទួនទាំងនៅ Client (Cooldown Map 30s) និងនៅ SQLite Backend (Unique check លើ student_id + session_id + date) ព្រមទាំងផ្តល់សំឡេង Warning បញ្ជាក់ច្បាស់លាស់នៅពេលនិស្សិតបានចុះវត្តមានរួចហើយ។' 
                : 'Dual-layer anti-duplicate check prevents accidental duplicate submissions via a 30-second client cooldown and strict SQLite session/date unique checks, accompanied by audible sound warnings.'}
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            <Check size={16} />
            <span>{isKh ? 'យល់ព្រម' : 'Got It'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
