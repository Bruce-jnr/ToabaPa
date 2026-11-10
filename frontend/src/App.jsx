import { BrowserRouter, Route, Routes } from 'react-router-dom';
import {
  AdministratorsRoute,
  AuditLogsRoute,
  CandidatesRoute,
  CategoriesRoute,
  CreateEventRoute,
  DashboardRoute,
  EventsRoute,
  FinancialRoute,
  LoginPortalRoute,
  PaymentsRoute,
  SettingsRoute,
} from './pages/OrganizerAdminPages.jsx';
import { EventDetailPage } from './pages/public/EventDetailPage.jsx';
import { ExplorePage, HomePage } from './pages/public/EventPages.jsx';
import {
  ContactPage,
  PlaceholderPage,
  PrivacyPage,
  TermsPage,
} from './pages/public/LegalPages.jsx';
import { OrganizerPage } from './pages/public/OrganizerPage.jsx';
import { PaymentVerifyPage } from './pages/public/PaymentVerifyPage.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/events" element={<ExplorePage />} />
        <Route path="/events/:slug" element={<EventDetailPage />} />
        <Route path="/payment/verify" element={<PaymentVerifyPage />} />
        <Route path="/organizers" element={<OrganizerPage />} />
        <Route path="/superadmin/login" element={<LoginPortalRoute portal="superadmin" />} />
        <Route path="/administrators/login" element={<LoginPortalRoute portal="administrator" />} />
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
        <Route path="/dashboard/administrators" element={<AdministratorsRoute />} />
        <Route path="/dashboard/financial" element={<FinancialRoute />} />
        <Route path="/dashboard/transactions" element={<PaymentsRoute />} />
        <Route path="*" element={<PlaceholderPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
