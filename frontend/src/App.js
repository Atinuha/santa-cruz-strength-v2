import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import CRMLayout from './components/CRMLayout';

// Public Pages
import Home from './pages/Home';
import Join from './pages/Join';
import PersonalTraining from './pages/PersonalTraining';
import Contact from './pages/Contact';
import ThankYou from './pages/ThankYou';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';

// Staff CRM Pages
import StaffLogin from './pages/staff/Login';
import Dashboard from './pages/staff/Dashboard';
import LeadDetail from './pages/staff/LeadDetail';
import Settings from './pages/staff/Settings';
import AcceptInvite from './pages/staff/AcceptInvite';
import BlogManager from './pages/staff/BlogManager';

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
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />

          {/* Staff Auth */}
          <Route path="/staff/login" element={<CRMLayout><StaffLogin /></CRMLayout>} />
          <Route path="/staff/accept-invite" element={<CRMLayout><AcceptInvite /></CRMLayout>} />

          {/* Protected Staff CRM */}
          <Route path="/staff/dashboard" element={
            <CRMLayout><ProtectedRoute><Dashboard /></ProtectedRoute></CRMLayout>
          } />
          <Route path="/staff/leads/:id" element={
            <CRMLayout><ProtectedRoute><LeadDetail /></ProtectedRoute></CRMLayout>
          } />
          <Route path="/staff/settings" element={
            <CRMLayout><ProtectedRoute><Settings /></ProtectedRoute></CRMLayout>
          } />
          <Route path="/staff/blog" element={
            <CRMLayout><ProtectedRoute><BlogManager /></ProtectedRoute></CRMLayout>
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
