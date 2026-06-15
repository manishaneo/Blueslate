const AUTH_KEY  = "blueslate_auth";
const TOKEN_KEY = "blueslate_token";

export function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem(AUTH_KEY)) ?? null;
    } catch {
        return null;
    }
}

export function getCurrentRole() {
    return getCurrentUser()?.role ?? null;
}

export function getToken() {
    return localStorage.getItem(TOKEN_KEY) ?? null;
}

export function isAppAdmin() {
    return getCurrentRole() === "app_admin";
}

export function isBusinessAdmin() {
    return getCurrentRole() === "business_admin";
}

export function getActiveBusinessId() {
    return getCurrentUser()?.activeBusinessId ?? null;
}

export function getBusinesses() {
    return getCurrentUser()?.businesses ?? [];
}

export function getActiveBusiness() {
    const user = getCurrentUser();
    const activeId = user?.activeBusinessId;
    return user?.businesses?.find((b) => b.id === activeId) ?? null;
}

// Accepts a role string ("business_admin") OR a full user object { id, email, role, ... }.
// AcceptInvitePage and BusinessSetupPage pass a string; LoginPage passes the full object.
export function setAuth(roleOrUser) {
    const data = typeof roleOrUser === "string"
        ? { role: roleOrUser }
        : roleOrUser;
    localStorage.setItem(AUTH_KEY, JSON.stringify(data));
}

export function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

export function logout() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = "/login";
}
