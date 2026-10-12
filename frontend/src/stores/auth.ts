import { reactive } from "vue";
import { api, getToken, setToken, setUnauthorizedHandler, type StaffUser } from "@/api";

// Simple shared auth state (no Pinia needed for one store).
export const auth = reactive({
  user: null as StaffUser | null,
  ready: false, // true once we've checked for a saved session
});

let restoring: Promise<void> | null = null;

// Restores a staff session after a page refresh (token is kept in sessionStorage)
export function restoreSession(): Promise<void> {
  if (auth.ready) return Promise.resolve();
  if (!restoring) {
    restoring = (async () => {
      if (getToken()) {
        try {
          auth.user = (await api.me()).user;
        } catch {
          setToken(null);
        }
      }
      auth.ready = true;
    })();
  }
  return restoring;
}

export async function login(username: string, password: string): Promise<StaffUser> {
  const { token, user } = await api.login(username, password);
  setToken(token);
  auth.user = user;
  return user;
}

export function logout() {
  setToken(null);
  auth.user = null;
}

export function setUser(user: StaffUser) {
  auth.user = user;
}

// When any API call returns 401 (expired session), sign out and go back to the public site
export function installUnauthorizedHandler(onExpired: () => void) {
  setUnauthorizedHandler(() => {
    logout();
    onExpired();
  });
}
