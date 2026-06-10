import { Navigate, Outlet } from "react-router-dom";
import { getCurrentRole, getCurrentUser } from "../utils/auth";

export default function ProtectedRoute({ allowedRoles = [] }) {
    const role = getCurrentRole();

    if (!role) {
        const loginPath = allowedRoles.includes("app_admin") ? "/admin-login" : "/login";
        return <Navigate to={loginPath} replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        return <Navigate to={role === "app_admin" ? "/app-admin" : "/dashboard"} replace />;
    }

    if (role === "business_admin") {
        const user = getCurrentUser();
        if (user?.business?.status === "disabled") {
            return <Navigate to="/disabled" replace />;
        }
    }

    return <Outlet />;
}
