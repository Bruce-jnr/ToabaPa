import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ScrollOnNavigation } from './components/ScrollOnNavigation.jsx';
import { appHref } from './lib/siteUrls.js';

const HomePage = lazy(() => import('./pages/public/EventPages.jsx').then((module) => ({ default: module.HomePage })));
const ExplorePage = lazy(() => import('./pages/public/EventPages.jsx').then((module) => ({ default: module.ExplorePage })));
const DemoEventPage = lazy(() => import('./pages/public/DemoEventPage.jsx').then((module) => ({ default: module.DemoEventPage })));
const HowItWorksPage = lazy(() => import('./pages/public/HowItWorksPage.jsx').then((module) => ({ default: module.HowItWorksPage })));
const ContactPage = lazy(() => import('./pages/public/LegalPages.jsx').then((module) => ({ default: module.ContactPage })));
const PrivacyPage = lazy(() => import('./pages/public/LegalPages.jsx').then((module) => ({ default: module.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/public/LegalPages.jsx').then((module) => ({ default: module.TermsPage })));
const PlaceholderPage = lazy(() => import('./pages/public/LegalPages.jsx').then((module) => ({ default: module.PlaceholderPage })));

function AppRedirect({ login = false }) {
  const { pathname, search, hash } = useLocation();
  const destination = appHref(login ? '/login' : `${pathname}${search}${hash}`);
  useEffect(() => { window.location.replace(destination); }, [destination]);
  return <div className="route-loading" role="status">Opening the Toabapa app…</div>;
}

export default function MarketingApp() {
  return (
    <BrowserRouter>
      <ScrollOnNavigation />
      <Suspense fallback={<div className="route-loading" role="status">Loading page…</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/events" element={<ExplorePage />} />
          <Route path="/demo/events/:slug" element={<DemoEventPage />} />
          <Route path="/demo/events/:slug/categories/:categorySlug" element={<DemoEventPage />} />
          <Route path="/events/:slug/*" element={<AppRedirect />} />
          <Route path="/organizers/*" element={<AppRedirect login />} />
          <Route path="/superadmin/login" element={<AppRedirect login />} />
          <Route path="/administrators/login" element={<AppRedirect login />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<PlaceholderPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
