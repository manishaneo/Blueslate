import api from "../utils/api";
import { getCurrentUser, setAuth } from "../utils/auth";

/**
 * Fetches the current user's business memberships with live status from the
 * backend and patches the businesses array in localStorage.
 *
 * Returns the fresh businesses array so callers can react immediately
 * without a second localStorage read.
 */
export async function refreshBusinesses() {
    const { data } = await api.get("/auth/me/businesses");
    const businesses = data.data; // [{ id, name, website, status }]

    const current = getCurrentUser();
    if (current) {
        setAuth({ ...current, businesses });
    }

    return businesses;
}
