import React from 'react';
import { Settings, X, Sliders, Volume2, Cpu, Database, Check, Sparkles } from 'lucide-react';
import { soundService } from '../services/soundService';

export default function SettingsModal({
  isOpen,
  onClose,
  detectorType,
  setDetectorType,
  distanceThreshold,
  setDistanceThreshold,
  soundEnabled,
  setSoundEnabled,
  speechEnabled,
  setSpeechEnabled,
  language
}) {
  if (!isOpen) return null;

  const isKh = language === 'kh';

  const handleSoundToggle = (val) => {
    setSoundEnabled(val);
    soundService.enabled = val;
  };

  const handleSpeechToggle = (val) => {
    setSpeechEnabled(val);
    soundService.speechEnabled = val;
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content modal-md scale-up">
        <div className="modal-header">
          <div className="modal-title-box">
            <div className="modal-icon-badge primary">
              <Settings size={22} className="text-primary" />
            </div>
            <div>
              <h3>{isKh ? 'ការកំណត់ប្រព័ន្ធ AI & សំឡេង' : 'AI Biometric & Audio Preferences'}</h3>
              <p className="text-muted small-text">
                {isKh 
                  ? 'កែតម្រូវកម្រិតភាពសុក្រឹតនៃការសម្គាល់មុខ និងសំឡេងប្រព័ន្ធ' 
                  : 'Configure Euclidean distance tolerance, neural models, and audio'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* 1. Distance Threshold Slider */}
          <div className="form-group">
            <div className="flex-between mb-2">
              <label className="form-label mb-0">
                <Sliders size={15} className="text-primary" />
                <span>{isKh ? 'កម្រិតតឹងរឹង AI (Distance Threshold):' : 'Face Match Distance Threshold:'}</span>
              </label>
              <div className="threshold-indicator-pill">
                <strong>{distanceThreshold.toFixed(2)}</strong>
              </div>
            </div>

            <div className="slider-wrapper">
              <input
                type="range"
                min="0.35"
                max="0.65"
                step="0.01"
                value={distanceThreshold}
                onChange={(e) => setDistanceThreshold(parseFloat(e.target.value))}
                className="custom-range-slider"
              />
            </div>

            <div className="slider-labels">
              <span>{isKh ? 'តឹងរឹង (0.35)' : 'Strict (0.35)'}</span>
              <span className="recommended-mark">{isKh ? 'ស្តង់ដារ (0.52)' : 'Recommended (0.52)'}</span>
              <span>{isKh ? 'ធូររលុង (0.65)' : 'Tolerant (0.65)'}</span>
            </div>
            <p className="small-text text-muted mt-2">
              {isKh 
                ? '💡 តម្លៃតូច = សុក្រឹតខ្ពស់តែទាមទារពន្លឺល្អ។ តម្លៃធំ = ស្គាល់បានងាយស្រួលជាងក្នុងពន្លឺមិនសូវល្អ។' 
                : '💡 Lower values demand stricter facial matches (best in studio lighting). Higher values allow more flexible detection.'}
            </p>
          </div>

          {/* 2. Neural Net Model Selector */}
          <div className="form-group mt-4">
            <label className="form-label">
              <Cpu size={15} className="text-primary" />
              <span>{isKh ? 'ម៉ូដែល Neural Network ស្វែងរកមុខ:' : 'Face Detection Neural Net Model:'}</span>
            </label>
            <div className="radio-group-boxes">
              <label className={`radio-box ${detectorType === 'ssd' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="detector"
                  value="ssd"
                  checked={detectorType === 'ssd'}
                  onChange={() => setDetectorType('ssd')}
                />
                <div className="radio-content">
                  <div className="radio-title-row">
                    <strong>SSD MobileNet v1</strong>
                    <span className="badge badge-primary">Recommended</span>
                  </div>
                  <span className="radio-desc">{isKh ? 'ភាពសុក្រឹតខ្ពស់បំផុត ស្គាល់មុខបានច្បាស់' : 'High precision face landmark detection'}</span>
                </div>
              </label>

              <label className={`radio-box ${detectorType === 'tiny' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="detector"
                  value="tiny"
                  checked={detectorType === 'tiny'}
                  onChange={() => setDetectorType('tiny')}
                />
                <div className="radio-content">
                  <div className="radio-title-row">
                    <strong>Tiny Face Detector</strong>
                    <span className="badge badge-secondary">Fast</span>
                  </div>
                  <span className="radio-desc">{isKh ? 'ដំណើរការលឿន សម្រាប់កុំព្យូទ័រខ្សោយ' : 'Ultra-fast lightweight model for low-end hardware'}</span>
                </div>
              </label>
            </div>
          </div>

          {/* 3. Audio & Voice Speech Feedback */}
          <div className="settings-toggle-list mt-4">
            <div className="toggle-row">
              <div className="toggle-info">
                <strong><Volume2 size={16} className="text-primary inline-icon" /> {isKh ? 'សំឡេងជោគជ័យ (Audio Chime)' : 'Success Audio Chime'}</strong>
                <p className="small-text text-muted">{isKh ? 'បញ្ចេញសំឡេងពីរោះពេលកត់ត្រាវត្តមានជោគជ័យ' : 'Play cheerful chime on verified attendance match'}</p>
              </div>
              <label className="switch-toggle">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => handleSoundToggle(e.target.checked)}
                />
                <span className="switch-slider"></span>
              </label>
            </div>

            <div className="toggle-row">
              <div className="toggle-info">
                <strong>🎙️ {isKh ? 'អានឈ្មោះនិស្សិត (Voice Speech Welcome)' : 'Voice Name Announcement (TTS)'}</strong>
                <p className="small-text text-muted">{isKh ? 'ប្រព័ន្ធអានឈ្មោះស្វាគមន៍និស្សិតដោយស្វ័យប្រវត្តិ' : 'Speak student full name using browser speech synthesis'}</p>
              </div>
              <label className="switch-toggle">
                <input
                  type="checkbox"
                  checked={speechEnabled}
                  onChange={(e) => handleSpeechToggle(e.target.checked)}
                />
                <span className="switch-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            <Check size={16} />
            <span>{isKh ? 'រក្សាទុក & បិទ' : 'Save Preferences'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
