
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LiveScanner from './components/LiveScanner';
import AttendanceDashboard from './components/AttendanceDashboard';
import AttendanceList from './components/AttendanceList';
import StudentRegistration from './components/StudentRegistration';
import StudentList from './components/StudentList';
import AttendanceReports from './components/AttendanceReports';
import SessionManager from './components/SessionManager';
import ManualFallbackModal from './components/ManualFallbackModal';
import AIExplanationModal from './components/AIExplanationModal';
import SettingsModal from './components/SettingsModal';

import { faceService } from './services/faceService';
import { api } from './services/api';
import './App.css';

export default function App() {
  // Navigation & Language
  const [activeTab, setActiveTab] = useState('scanner');
  const [language, setLanguage] = useState('kh'); // 'kh' | 'en'

  // Application Data States
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [students, setStudents] = useState([]);
  const [summaryData, setSummaryData] = useState(null);

  // AI Face Engine Status
  const [aiReady, setAiReady] = useState(false);
  const [aiLoadingMessage, setAiLoadingMessage] = useState('Loading AI weights...');
  const [detectorType, setDetectorType] = useState('ssd'); // 'ssd' | 'tiny'
  const [distanceThreshold, setDistanceThreshold] = useState(0.58);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(true);

  // Modals
  const [isFallbackOpen, setIsFallbackOpen] = useState(false);
  const [isAIHelpOpen, setIsAIHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 1. Initial Load: Neural Net Models, Sessions, Students
  useEffect(() => {
    loadAIModels();
    fetchSessions();
    fetchStudents();
  }, []);

  // 2. Fetch Attendance Summary when activeSession changes
  useEffect(() => {
    if (activeSessionId) {
      fetchSummary(activeSessionId);
    }
  }, [activeSessionId]);

  // Periodic polling for dashboard & attendance summary (every 4 seconds)
  useEffect(() => {
    if (!activeSessionId) return;
    const interval = setInterval(() => {
      fetchSummary(activeSessionId);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeSessionId]);

  const loadAIModels = async () => {
    try {
      setAiReady(false);
      await faceService.loadModels((msg) => setAiLoadingMessage(msg));
      setAiReady(true);
    } catch (err) {
      console.error('Failed to initialize AI models:', err);
      setAiLoadingMessage('AI initialization failed. Check models directory.');
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await api.getSessions();
      if (res.success && res.data.length > 0) {
        setSessions(res.data);
        if (!activeSessionId) {
          setActiveSessionId(res.data[0].id);
        }
      }
    } catch (e) {
      console.error('Error loading sessions:', e);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.getStudents();
      if (res.success) {
        setStudents(res.data);
        faceService.buildFaceMatcher(res.data, distanceThreshold);
      }
    } catch (e) {
      console.error('Error loading students:', e);
    }
  };

  const fetchSummary = async (sessionId) => {
    try {
      const res = await api.getAttendanceSummary(sessionId);
      if (res.success) {
        setSummaryData(res.data);
      }
    } catch (e) {
      console.error('Error loading attendance summary:', e);
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || null;

  return (
    <div className="app-layout">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sessions={sessions}
        activeSessionId={activeSessionId}
        setActiveSessionId={setActiveSessionId}
        aiReady={aiReady}
        detectorType={detectorType}
        onOpenFallback={() => setIsFallbackOpen(true)}
        onOpenAIHelp={() => setIsAIHelpOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        language={language}
        setLanguage={setLanguage}
      />

      {/* Main Content Area */}
      <main className="app-main-content">
        {activeTab === 'scanner' && (
          <LiveScanner
            activeSession={activeSession}
            students={students}
            aiReady={aiReady}
            onOpenFallback={() => setIsFallbackOpen(true)}
            onOpenAIHelp={() => setIsAIHelpOpen(true)}
            language={language}
            detectorType={detectorType}
            distanceThreshold={distanceThreshold}
            soundEnabled={soundEnabled}
          />
        )}

        {activeTab === 'dashboard' && (
          <AttendanceDashboard
            summaryData={summaryData}
            activeSession={activeSession}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenFallback={() => setIsFallbackOpen(true)}
            language={language}
          />
        )}

        {activeTab === 'attendance' && (
          <AttendanceList
            summaryData={summaryData}
            activeSession={activeSession}
            onRefresh={() => fetchSummary(activeSessionId)}
            onOpenFallback={() => setIsFallbackOpen(true)}
            language={language}
          />
        )}

        {activeTab === 'register' && (
          <StudentRegistration
            activeSession={activeSession}
            sessions={sessions}
            onStudentAdded={() => {
              fetchStudents();
              if (activeSessionId) fetchSummary(activeSessionId);
            }}
            language={language}
            aiReady={aiReady}
          />
        )}

        {activeTab === 'students' && (
          <StudentList
            students={students}
            activeSession={activeSession}
            sessions={sessions}
            onRefresh={fetchStudents}
            onNavigateTab={(tab) => setActiveTab(tab)}
            language={language}
          />
        )}

        {activeTab === 'reports' && (
          <AttendanceReports 
            activeSession={activeSession}
            sessions={sessions}
            language={language} 
          />
        )}

        {activeTab === 'sessions' && (
          <SessionManager
            sessions={sessions}
            activeSessionId={activeSessionId}
            setActiveSessionId={setActiveSessionId}
            onSessionCreated={fetchSessions}
            language={language}
          />
        )}
      </main>

      {/* Modals */}
      <ManualFallbackModal
        isOpen={isFallbackOpen}
        onClose={() => setIsFallbackOpen(false)}
        students={students}
        activeSession={activeSession}
        onSuccess={() => {
          if (activeSessionId) fetchSummary(activeSessionId);
        }}
        language={language}
      />

      <AIExplanationModal
        isOpen={isAIHelpOpen}
        onClose={() => setIsAIHelpOpen(false)}
        language={language}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        detectorType={detectorType}
        setDetectorType={setDetectorType}
        distanceThreshold={distanceThreshold}
        setDistanceThreshold={setDistanceThreshold}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        speechEnabled={speechEnabled}
        setSpeechEnabled={setSpeechEnabled}
        language={language}
      />
    </div>
  );
}
