const TICKET_KEY = "angelitecare-ticket";
export type SavedTicket = { id: string; studentNumber: string };

// The student's current ticket is remembered in this browser so "Track my request" works after a refresh
export function loadSavedTicket(): SavedTicket | null {
  try {
    const raw = window.localStorage.getItem(TICKET_KEY);
    return raw ? (JSON.parse(raw) as SavedTicket) : null;
  } catch {
    return null;
  }
}

export function saveTicket(ticket: SavedTicket | null) {
  try {
    if (ticket) window.localStorage.setItem(TICKET_KEY, JSON.stringify(ticket));
    else window.localStorage.removeItem(TICKET_KEY);
  } catch {
    /* storage unavailable */
  }
}
