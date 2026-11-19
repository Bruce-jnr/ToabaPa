import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SnackbarProvider } from "./components/SnackbarProvider.jsx";
import { ScrollOnNavigation } from './components/ScrollOnNavigation.jsx';

const lazyNamed = (loader, name) =>
  lazy(() => loader().then((module) => ({ default: module[name] })));
const loadAdmin = () => import("./pages/OrganizerAdminPages.jsx");
const EventDetailPage = lazyNamed(
  () => import("./pages/public/EventDetailPage.jsx"),
  "EventDetailPage",
);
const DemoEventPage = lazyNamed(() => import('./pages/public/DemoEventPage.jsx'), 'DemoEventPage');
const PaymentVerifyPage = lazyNamed(
  () => import("./pages/public/PaymentVerifyPage.jsx"),
  "PaymentVerifyPage",
);
const AdministratorsRoute = lazyNamed(loadAdmin, "AdministratorsRoute");
const AuditLogsRoute = lazyNamed(loadAdmin, "AuditLogsRoute");
const CandidatesRoute = lazyNamed(loadAdmin, "CandidatesRoute");
const CategoriesRoute = lazyNamed(loadAdmin, "CategoriesRoute");
const CreateEventRoute = lazyNamed(loadAdmin, "CreateEventRoute");
const DashboardRoute = lazyNamed(loadAdmin, "DashboardRoute");
const EventsRoute = lazyNamed(loadAdmin, "EventsRoute");
const ArchivedEventsRoute = lazyNamed(loadAdmin, "ArchivedEventsRoute");
const FinancialRoute = lazyNamed(loadAdmin, "FinancialRoute");
const LoginRoute = lazyNamed(loadAdmin, "LoginRoute");
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
    <SnackbarProvider>
    <BrowserRouter>
      <ScrollOnNavigation />
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<LoginRoute />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/events/:slug" element={<EventDetailPage />} />
          <Route path="/events/:slug/categories/:categorySlug" element={<EventDetailPage />} />
          <Route path="/demo/events/:slug" element={<DemoEventPage />} />
          <Route path="/demo/events/:slug/categories/:categorySlug" element={<DemoEventPage />} />
          <Route path="/payment/verify" element={<PaymentVerifyPage />} />
          <Route path="/organizers" element={<Navigate to="/login" replace />} />
          <Route path="/superadmin/login" element={<Navigate to="/login" replace />} />
          <Route path="/organizers/login" element={<Navigate to="/login" replace />} />
          <Route path="/administrators/login" element={<Navigate to="/login" replace />} />
          <Route path="/dashboard" element={<DashboardRoute />} />
          <Route path="/dashboard/events/new" element={<CreateEventRoute />} />
          <Route path="/dashboard/events" element={<EventsRoute />} />
          <Route path="/dashboard/events/archived" element={<ArchivedEventsRoute />} />
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
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    </SnackbarProvider>
  );
}

export default App;
