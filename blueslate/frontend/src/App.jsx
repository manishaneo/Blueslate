import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ExperienceSelectorPage from "./pages/ExperienceSelectorPage";
import SetupPage from "./pages/SetupPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import BusinessSetupPage from "./pages/BusinessSetupPage";
import ChatPage from "./pages/ChatPage";
import ReceptionistPage from "./pages/ReceptionistPage";
import AdminLayout from "./layouts/AdminLayout";
import AppAdminLayout from "./layouts/AppAdminLayout";
import AppAdminDashboardPage from "./pages/AppAdminDashboardPage";
import BusinessesPage from "./pages/BusinessesPage";
import DashboardPage from "./pages/DashboardPage";
import LeadsPage from "./pages/LeadsPage";
import LeadDetailsPage from "./pages/LeadDetailsPage";
import ConversationsPage from "./pages/ConversationsPage";
import CallHistoryPage from "./pages/CallHistoryPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import SettingsPage from "./pages/SettingsPage";
import TestAIPage from "./pages/TestAIPage";
import ThemeToggle from "./components/ThemeToggle";
import LoginPage from "./pages/LoginPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import JoinPage from "./pages/JoinPage";
import AddBusinessPage from "./pages/AddBusinessPage";
import CustomerPortalPage from "./pages/CustomerPortalPage";
import ProtectedRoute from "./components/ProtectedRoute";
import DisabledBusinessPage from "./pages/DisabledBusinessPage";
import DemoPage from "./pages/DemoPage";

const ADMIN_PATHS = ["/dashboard", "/leads", "/conversations", "/call-history", "/analytics", "/knowledge-base", "/settings", "/test-ai", "/app-admin"];
// Pages that manage their own inline theme toggle — suppress the global floating button
const NO_FLOAT_TOGGLE = new Set(["/", "/chat", "/receptionist", "/login", "/admin-login", "/join", "/business-setup", "/add-business", "/customer", "/disabled"]);

function GlobalThemeToggle() {
    const { pathname } = useLocation();
    if (NO_FLOAT_TOGGLE.has(pathname) || ADMIN_PATHS.some((p) => pathname.startsWith(p))) return null;
    return <ThemeToggle />;
}

function App() {
    return (
        <BrowserRouter>
            <GlobalThemeToggle />
            <Routes>
                {/* Public routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/admin-login" element={<AdminLoginPage />} />
                <Route path="/disabled" element={<DisabledBusinessPage />} />
                <Route path="/customer" element={<CustomerPortalPage />} />

                {/* Onboarding + demo routes (public) */}
                <Route path="/demo" element={<DemoPage />} />
                <Route path="/join" element={<JoinPage />} />
                <Route path="/setup" element={<SetupPage />} />
                <Route path="/experience" element={<ExperienceSelectorPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/receptionist" element={<ReceptionistPage />} />

                {/* Invitation flow (public for now) */}
                <Route path="/accept-invite" element={<AcceptInvitePage />} />
                <Route path="/business-setup" element={<BusinessSetupPage />} />

                {/* App Admin panel — requires app_admin role */}
                <Route element={<ProtectedRoute allowedRoles={["app_admin"]} />}>
                    <Route element={<AppAdminLayout />}>
                        <Route path="/app-admin" element={<AppAdminDashboardPage />} />
                        <Route path="/app-admin/businesses" element={<BusinessesPage />} />
                    </Route>
                </Route>

                {/* Business Admin routes — requires business_admin role */}
                <Route element={<ProtectedRoute allowedRoles={["business_admin"]} />}>
                    {/* Full-screen flows — no sidebar */}
                    <Route path="/add-business" element={<AddBusinessPage />} />

                    <Route element={<AdminLayout />}>
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/leads" element={<LeadsPage />} />
                        <Route path="/leads/:leadId" element={<LeadDetailsPage />} />
                        <Route path="/conversations" element={<ConversationsPage />} />
                        <Route path="/call-history" element={<CallHistoryPage />} />
                        <Route path="/analytics" element={<AnalyticsPage />} />
                        <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/test-ai" element={<TestAIPage />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
