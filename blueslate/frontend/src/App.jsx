import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import SetupPage from "./pages/SetupPage";
import ChatPage from "./pages/ChatPage";
import ReceptionistPage from "./pages/ReceptionistPage";
import AdminLayout from "./layouts/AdminLayout";
import DashboardPage from "./pages/DashboardPage";
import LeadsPage from "./pages/LeadsPage";
import CallHistoryPage from "./pages/CallHistoryPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import SettingsPage from "./pages/SettingsPage";
import ThemeToggle from "./components/ThemeToggle";

const ADMIN_PATHS = ["/dashboard", "/leads", "/call-history", "/analytics", "/knowledge-base", "/settings"];

function GlobalThemeToggle() {
    const { pathname } = useLocation();
    if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) return null;
    return <ThemeToggle />;
}

function App() {
    return (
        <BrowserRouter>
            <GlobalThemeToggle />
            <Routes>
                {/* Public / chat routes */}
                <Route path="/" element={<SetupPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/receptionist" element={<ReceptionistPage />} />

                {/* Admin routes — persistent sidebar + header via AdminLayout */}
                <Route element={<AdminLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/leads" element={<LeadsPage />} />
                    <Route path="/call-history" element={<CallHistoryPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
