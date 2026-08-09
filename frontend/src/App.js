import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import CRMLayout from './components/CRMLayout';
import RouteSeo from './components/RouteSeo';
import AnalyticsConsent from './components/AnalyticsConsent';
import { trackPageView, trackPhoneClick } from './utils/analytics';
import { captureAttribution } from './utils/attribution';

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
import About from './pages/About';
import LocalWellness from './pages/LocalWellness';
import Pride from './pages/Pride';
import NotFound from './pages/NotFound';
import ImplementationPreview from './pages/ImplementationPreview';

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
import CampaignManager from './pages/staff/CampaignManager';
import EmailBuilder from './pages/staff/EmailBuilder';
import SMSBuilder from './pages/staff/SMSBuilder';
import TeamManager from './pages/staff/TeamManager';
import ContentManager from './pages/staff/ContentManager';
import CorporateLeads from './pages/staff/CorporateLeads';

import './App.css';
// scs-release.css and scs-ledger.css are gone. They held a design that was
// invented in this repository rather than approved. The approved system now
// lives in index.css, ported from the build Mike signed off.

/** Updates attribution and fires one route-level page view outside staff utilities. */
function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (!location.pathname.startsWith('/staff')) {
      if (!location.pathname.startsWith('/review/') && location.pathname !== '/thank-you') {
        captureAttribution(location);
      }
      trackPageView(location.pathname + location.search);
    }
  }, [location]);

  useEffect(() => {
    const trackCurrentRouteAfterConsent = () => trackPageView(location.pathname + location.search);
    window.addEventListener('scs:analytics-consent-granted', trackCurrentRouteAfterConsent);
    return () => window.removeEventListener('scs:analytics-consent-granted', trackCurrentRouteAfterConsent);
  }, [location]);

  useEffect(() => {
    const handleTrackedClick = (event) => {
      const phoneLink = event.target.closest?.('a[href^="tel:"]');
      if (phoneLink) trackPhoneClick(phoneLink.getAttribute('href'));
    };
    document.addEventListener('click', handleTrackedClick);
    return () => document.removeEventListener('click', handleTrackedClick);
  }, []);

  return null;
}

/**
 * Everything inside the router, with the router itself left to the caller.
 *
 * The browser wraps this in BrowserRouter below. scripts/prerender.mjs wraps
 * the same component in StaticRouter to render each route to HTML at build
 * time. One route table, two entry points: a route that exists for a visitor
 * cannot go missing from the prerender, because there is nowhere for it to go
 * missing from.
 */
export function AppRoutes() {
  return (
    <AuthProvider>
      <>
        <RouteSeo />
        <RouteTracker />
        <div id="main-content">
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
          <Route path="/about" element={<About />} />
          <Route path="/local-wellness" element={<LocalWellness />} />
          <Route path="/pride" element={<Pride />} />
          <Route path="/review/:token" element={<ReviewPage />} />
          {process.env.REACT_APP_PREVIEW_MODE === 'true' && (
            <Route path="/implementation-preview" element={<ImplementationPreview />} />
          )}

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
          <Route path="/staff/campaigns" element={
            <CRMLayout><ProtectedRoute><CampaignManager /></ProtectedRoute></CRMLayout>
          } />
          <Route path="/staff/campaigns/builder/:campaignId" element={
            <ProtectedRoute><EmailBuilder /></ProtectedRoute>
          } />
          <Route path="/staff/campaigns/sms/:campaignId" element={
            <ProtectedRoute><SMSBuilder /></ProtectedRoute>
          } />
          <Route path="/staff/team" element={
            <CRMLayout><ProtectedRoute><TeamManager /></ProtectedRoute></CRMLayout>
          } />
          <Route path="/staff/content" element={
            <CRMLayout><ProtectedRoute><ContentManager /></ProtectedRoute></CRMLayout>
          } />
          <Route path="/staff/corporate" element={
            <CRMLayout><ProtectedRoute><CorporateLeads /></ProtectedRoute></CRMLayout>
          } />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </div>
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
        <AnalyticsConsent />
      </>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
