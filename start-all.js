// Start both SQLite Backend Server and Vite Dev Server concurrently
import { spawn } from 'child_process';
import process from 'process';

console.log('====================================================');
console.log('🚀 Starting AI Attendance System (Full-Stack)...');
console.log('====================================================\n');

// 1. Start SQLite Backend API Server (Port 5000)
const server = spawn('node', ['server.js'], {
  stdio: 'inherit',
  env: process.env
});

server.on('error', (err) => {
  console.error('Failed to start SQLite Backend Server:', err);
});

// 2. Start Vite Frontend Server (Port 5173) directly via node
const vite = spawn('node', ['./node_modules/vite/bin/vite.js'], {
  stdio: 'inherit',
  env: process.env
});

vite.on('error', (err) => {
  console.error('Failed to start Vite Dev Server:', err);
});

// Graceful shutdown
const shutdown = () => {
  console.log('\n🛑 Shutting down AI Attendance System...');
  server.kill();
  vite.kill();
  process.exit();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
