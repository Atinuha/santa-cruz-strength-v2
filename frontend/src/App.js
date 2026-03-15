import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import CRMLayout from './components/CRMLayout';
import { trackPageView } from './utils/analytics';

// Public Pages
import Home from './pages/Home';
import Join from './pages/Join';
import PersonalTraining from './pages/PersonalTraining';
import Contact from './pages/Contact';
import ThankYou from './pages/ThankYou';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Events from './pages/Events';
import ReviewPage from './pages/ReviewPage';

// Staff CRM Pages
import StaffLogin from './pages/staff/Login';
import Dashboard from './pages/staff/Dashboard';
import LeadDetail from './pages/staff/LeadDetail';
import Settings from './pages/staff/Settings';
import AcceptInvite from './pages/staff/AcceptInvite';
import BlogManager from './pages/staff/BlogManager';
import ForgotPassword from './pages/staff/ForgotPassword';
import ResetPassword from './pages/staff/ResetPassword';
import MobilePortal from './pages/staff/MobilePortal';
import EventsManager from './pages/staff/EventsManager';

import './App.css';

/** Fires a GA4 + Meta Pixel page_view on every client-side route change */
function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (!location.pathname.startsWith('/staff')) {
      trackPageView(location.pathname + location.search);
    }
  }, [location]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RouteTracker />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/join" element={<Join />} />
          <Route path="/personal-training" element={<PersonalTraining />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/events" element={<Events />} />
          <Route path="/review/:token" element={<ReviewPage />} />

          {/* Staff Auth */}
          <Route path="/staff/login" element={<CRMLayout><StaffLogin /></CRMLayout>} />
          <Route path="/staff/accept-invite" element={<CRMLayout><AcceptInvite /></CRMLayout>} />
          <Route path="/staff/forgot-password" element={<CRMLayout><ForgotPassword /></CRMLayout>} />
          <Route path="/staff/reset-password" element={<CRMLayout><ResetPassword /></CRMLayout>} />

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
          <Route path="/staff/mobile" element={
            <ProtectedRoute><MobilePortal /></ProtectedRoute>
          } />
          <Route path="/staff/events" element={
            <CRMLayout><ProtectedRoute><EventsManager /></ProtectedRoute></CRMLayout>
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
