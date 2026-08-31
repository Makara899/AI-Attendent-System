
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
import AppLoader from './components/AppLoader';

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

  // AI Face Engine Status & Boot sequence
  const [aiReady, setAiReady] = useState(false);
  const [aiLoadingMessage, setAiLoadingMessage] = useState('Connecting to system core...');
  const [detectorType, setDetectorType] = useState('ssd'); // 'ssd' | 'tiny'
  const [distanceThreshold, setDistanceThreshold] = useState(0.58);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(true);

  // System Loading States
  const [isBooting, setIsBooting] = useState(true);
  const [bootProgress, setBootProgress] = useState(15);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [bootError, setBootError] = useState(null);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);

  // Modals
  const [isFallbackOpen, setIsFallbackOpen] = useState(false);
  const [isAIHelpOpen, setIsAIHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 1. Initial Load: Neural Net Models, Sessions, Students
  useEffect(() => {
    bootApplication();
  }, []);

  const bootApplication = async () => {
    setIsBooting(true);
    setBootProgress(15);
    setAiLoadingMessage('Initializing AI neural models & server connection...');

    try {
      // Parallel loading: AI Models & Database resources
      const aiPromise = loadAIModels();
      const sessionsPromise = fetchSessions();
      const studentsPromise = fetchStudents();

      await Promise.allSettled([aiPromise, sessionsPromise, studentsPromise]);
      setBootProgress(100);
      setAiLoadingMessage('System initialization complete!');
    } catch (err) {
      console.error('System boot error:', err);
      setBootError('System boot encountered an issue. You may continue to the app.');
      setBootProgress(100);
    }
  };

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
      fetchSummary(activeSessionId, false); // silent background fetch
    }, 4000);
    return () => clearInterval(interval);
  }, [activeSessionId]);

  const loadAIModels = async () => {
    try {
      setAiReady(false);
      await faceService.loadModels((msg, percent) => {
        setAiLoadingMessage(msg);
        if (percent) {
          setBootProgress(prev => Math.max(prev, Math.round(percent * 0.7)));
        }
      });
      setAiReady(true);
      setBootProgress(prev => Math.max(prev, 75));
    } catch (err) {
      console.error('Failed to initialize AI models:', err);
      setAiLoadingMessage('AI initialization warning. Check models directory.');
    }
  };

  const fetchSessions = async () => {
    setIsGlobalLoading(true);
    try {
      const res = await api.getSessions();
      if (res.success) {
        const list = res.data || [];
        setSessions(list);
        if (list.length === 0) {
          setActiveSessionId(null);
        } else if (!activeSessionId || !list.some(s => s.id === activeSessionId)) {
          setActiveSessionId(list[0].id);
        }
        setSessionsLoaded(true);
        setBootProgress(prev => Math.max(prev, 85));
      }
    } catch (e) {
      console.error('Error loading sessions:', e);
    } finally {
      setIsGlobalLoading(false);
    }
  };

  const fetchStudents = async () => {
    setIsStudentsLoading(true);
    try {
      const res = await api.getStudents();
      if (res.success) {
        setStudents(res.data || []);
        faceService.buildFaceMatcher(res.data, distanceThreshold);
        setStudentsLoaded(true);
        setBootProgress(prev => Math.max(prev, 95));
      }
    } catch (e) {
      console.error('Error loading students:', e);
    } finally {
      setIsStudentsLoading(false);
    }
  };

  const fetchSummary = async (sessionId, showLoading = true) => {
    if (showLoading) setIsSummaryLoading(true);
    try {
      const res = await api.getAttendanceSummary(sessionId);
      if (res.success) {
        setSummaryData(res.data);
      }
    } catch (e) {
      console.error('Error loading attendance summary:', e);
    } finally {
      if (showLoading) setIsSummaryLoading(false);
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || null;

  return (
    <div className="app-layout">
      {/* Full-Screen Cyber AI App Bootloader */}
      {isBooting && (
        <AppLoader
          progress={bootProgress}
          statusMessage={aiLoadingMessage}
          aiReady={aiReady}
          studentsLoaded={studentsLoaded}
          sessionsLoaded={sessionsLoaded}
          error={bootError}
          onComplete={() => setIsBooting(false)}
          language={language}
        />
      )}

      {/* Top Navbar with Global Loading Bar */}
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
        isGlobalLoading={isGlobalLoading || isSummaryLoading}
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
            loading={isSummaryLoading}
          />
        )}

        {activeTab === 'attendance' && (
          <AttendanceList
            summaryData={summaryData}
            activeSession={activeSession}
            onRefresh={() => fetchSummary(activeSessionId, true)}
            onOpenFallback={() => setIsFallbackOpen(true)}
            language={language}
            loading={isSummaryLoading}
          />
        )}

        {activeTab === 'register' && (
          <StudentRegistration
            activeSession={activeSession}
            sessions={sessions}
            onStudentAdded={() => {
              fetchStudents();
              if (activeSessionId) fetchSummary(activeSessionId, false);
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
            loading={isStudentsLoading}
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
