import { lazy, Suspense, useLayoutEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";

function ScrollOnNavigation() {
  const { pathname, search, hash } = useLocation();

  useLayoutEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, search, hash]);

  return null;
}

const lazyNamed = (loader, name) =>
  lazy(() => loader().then((module) => ({ default: module[name] })));
const loadAdmin = () => import("./pages/OrganizerAdminPages.jsx");
const loadEventPages = () => import("./pages/public/EventPages.jsx");
const loadLegalPages = () => import("./pages/public/LegalPages.jsx");

const HomePage = lazyNamed(loadEventPages, "HomePage");
const ExplorePage = lazyNamed(loadEventPages, "ExplorePage");
const EventDetailPage = lazyNamed(
  () => import("./pages/public/EventDetailPage.jsx"),
  "EventDetailPage",
);
const PaymentVerifyPage = lazyNamed(
  () => import("./pages/public/PaymentVerifyPage.jsx"),
  "PaymentVerifyPage",
);
const OrganizerPage = lazyNamed(
  () => import("./pages/public/OrganizerPage.jsx"),
  "OrganizerPage",
);
const ContactPage = lazyNamed(loadLegalPages, "ContactPage");
const PlaceholderPage = lazyNamed(loadLegalPages, "PlaceholderPage");
const PrivacyPage = lazyNamed(loadLegalPages, "PrivacyPage");
const TermsPage = lazyNamed(loadLegalPages, "TermsPage");
const AdministratorsRoute = lazyNamed(loadAdmin, "AdministratorsRoute");
const AuditLogsRoute = lazyNamed(loadAdmin, "AuditLogsRoute");
const CandidatesRoute = lazyNamed(loadAdmin, "CandidatesRoute");
const CategoriesRoute = lazyNamed(loadAdmin, "CategoriesRoute");
const CreateEventRoute = lazyNamed(loadAdmin, "CreateEventRoute");
const DashboardRoute = lazyNamed(loadAdmin, "DashboardRoute");
const EventsRoute = lazyNamed(loadAdmin, "EventsRoute");
const FinancialRoute = lazyNamed(loadAdmin, "FinancialRoute");
const LoginPortalRoute = lazyNamed(loadAdmin, "LoginPortalRoute");
const PaymentsRoute = lazyNamed(loadAdmin, "PaymentsRoute");
const SettingsRoute = lazyNamed(loadAdmin, "SettingsRoute");

function RouteLoading() {
  return (
    <div className="route-loading" role="status">
      Loading page…
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollOnNavigation />
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/events" element={<ExplorePage />} />
          <Route path="/events/:slug" element={<EventDetailPage />} />
          <Route path="/payment/verify" element={<PaymentVerifyPage />} />
          <Route path="/organizers" element={<OrganizerPage />} />
          <Route
            path="/superadmin/login"
            element={<LoginPortalRoute portal="superadmin" />}
          />
          <Route
            path="/administrators/login"
            element={<LoginPortalRoute portal="administrator" />}
          />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/dashboard" element={<DashboardRoute />} />
          <Route path="/dashboard/events/new" element={<CreateEventRoute />} />
          <Route path="/dashboard/events" element={<EventsRoute />} />
          <Route path="/dashboard/categories" element={<CategoriesRoute />} />
          <Route path="/dashboard/candidates" element={<CandidatesRoute />} />
          <Route path="/dashboard/payments" element={<PaymentsRoute />} />
          <Route path="/dashboard/settings" element={<SettingsRoute />} />
          <Route path="/dashboard/audit-logs" element={<AuditLogsRoute />} />
          <Route
            path="/dashboard/administrators"
            element={<AdministratorsRoute />}
          />
          <Route path="/dashboard/financial" element={<FinancialRoute />} />
          <Route path="/dashboard/transactions" element={<PaymentsRoute />} />
          <Route path="*" element={<PlaceholderPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
