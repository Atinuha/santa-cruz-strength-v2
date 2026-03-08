import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import Home from './pages/Home';
import Join from './pages/Join';
import PersonalTraining from './pages/PersonalTraining';
import Contact from './pages/Contact';
import ThankYou from './pages/ThankYou';

// Staff CRM Pages
import StaffLogin from './pages/staff/Login';
import Dashboard from './pages/staff/Dashboard';
import LeadDetail from './pages/staff/LeadDetail';
import Settings from './pages/staff/Settings';
import AcceptInvite from './pages/staff/AcceptInvite';

import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/join" element={<Join />} />
          <Route path="/personal-training" element={<PersonalTraining />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/thank-you" element={<ThankYou />} />

          {/* Staff Auth */}
          <Route path="/staff/login" element={<StaffLogin />} />
          <Route path="/staff/accept-invite" element={<AcceptInvite />} />

          {/* Protected Staff CRM */}
          <Route path="/staff/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/staff/leads/:id" element={
            <ProtectedRoute><LeadDetail /></ProtectedRoute>
          } />
          <Route path="/staff/settings" element={
            <ProtectedRoute><Settings /></ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Home />} />
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1A1A1A',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#FFFFFF',
              fontSize: '14px',
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
