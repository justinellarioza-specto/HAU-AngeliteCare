// AngeliteCare API client — talks to the Node/Express backend.
// Set VITE_API_URL in a .env file to point at a deployed backend, e.g.
//   VITE_API_URL=https://angelitecare-api.onrender.com/api
// Development: the backend runs separately on port 5000.
// Production build: the backend serves this site, so the API is on the same address (/api).
export const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");

const TOKEN_KEY = "angelitecare-token";

export function getToken(): string | null {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Called when the session expires so the app can return to the public site
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type Query = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, query?: Query) {
  const url = new URL(API_URL + path, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  const token = getToken();
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Cannot reach the AngeliteCare server. Check that the backend is running.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token && onUnauthorized) onUnauthorized();
    let message: string = data.message || `Request failed (${response.status})`;
    if (Array.isArray(data.details) && data.details.length) {
      message += ": " + data.details.map((d: { field?: string; message: string; name?: string }) => d.name ? `${d.name} — ${d.message}` : d.message).join("; ");
    }
    throw new ApiError(response.status, message, data.details);
  }
  return data as T;
}

const get = <T>(path: string, query?: Query) => request<T>("GET", path, undefined, query);
const post = <T>(path: string, body: unknown = {}) => request<T>("POST", path, body);
const patch = <T>(path: string, body: unknown) => request<T>("PATCH", path, body);
const del = <T>(path: string) => request<T>("DELETE", path);

// ---------------- Types ----------------
export type RequestType = "checkup" | "medicine" | "medical_supply" | "certificate" | "other";
export type VisitStatus = "waiting" | "in_progress" | "completed" | "cancelled" | "no_show";
export type Role = "admin" | "nurse";

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  checkup: "Consultation / Check-up",
  medicine: "Medicine Request",
  medical_supply: "Medical Supply / Equipment",
  certificate: "Medical Clearance / Certificate",
  other: "Other Concern",
};

export const STATUS_LABELS: Record<VisitStatus, string> = {
  waiting: "Waiting",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export interface Paged<T> {
  success: boolean;
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface StaffUser {
  _id: string;
  fullName: string;
  username: string;
  email?: string;
  role: Role;
  position?: string;
  isActive: boolean;
  lastLoginAt?: string;
}

export interface Patient {
  _id: string;
  studentNumber: string;
  patientType?: "student" | "faculty" | "staff";
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName?: string;
  sex?: "male" | "female";
  birthDate?: string;
  department?: string;
  program?: string;
  yearLevel?: number;
  section?: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  emergencyContact?: { name?: string; relationship?: string; contactNumber?: string };
  bloodType?: string;
  allergies?: string[];
  medicalConditions?: string[];
  currentMedications?: string[];
  notes?: string;
  isProfileComplete?: boolean;
  lastVisitAt?: string;
}

export interface Vitals {
  bloodPressure?: string;
  temperature?: number;
  pulseRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  painScale?: number;
}

export interface DispensedItem {
  item: string;
  name: string;
  unit: string;
  quantity: number;
  instructions?: string;
  batches: { lotNumber?: string; expirationDate?: string; quantity: number }[];
}

export interface Visit {
  _id: string;
  patient: Patient | string;
  studentNumber: string;
  queueNumber: string;
  queueDate: string;
  priority: "normal" | "urgent";
  source: "kiosk" | "walk_in";
  requestType: RequestType;
  reason?: string;
  requestedItems: { item?: string; name?: string; quantity: number }[];
  status: VisitStatus;
  vitals?: Vitals;
  assessment?: string;
  treatment?: string;
  dispensed: DispensedItem[];
  referral?: string;
  remarks?: string;
  followUpDate?: string;
  cancelReason?: string;
  handledBy?: { _id: string; fullName: string; position?: string } | string;
  calledAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Batch {
  _id: string;
  lotNumber?: string;
  quantity: number;
  expirationDate?: string;
  receivedAt?: string;
  supplier?: string;
}

export interface InventoryItem {
  _id: string;
  name: string;
  genericName?: string;
  brandName?: string;
  category: "medicine" | "supply" | "equipment";
  dosageForm?: string;
  strength?: string;
  unit: string;
  description?: string;
  reorderLevel: number;
  isRequestable: boolean;
  isActive: boolean;
  batches: Batch[];
  totalQuantity: number;
  availableQuantity: number;
  expiredQuantity: number;
  nearestExpiration: string | null;
  isLowStock: boolean;
  stockStatus?: { out: boolean; low: boolean; expiring: boolean; expired: boolean };
}

export interface StockMovement {
  _id: string;
  itemName: string;
  type: "restock" | "dispense" | "adjust" | "dispose";
  quantity: number;
  lotNumber?: string;
  balanceAfter?: number;
  reason?: string;
  performedBy?: { fullName: string };
  visit?: { queueNumber: string; studentNumber: string };
  createdAt: string;
}

export interface Ticket {
  id: string;
  queueNumber: string;
  requestType: RequestType;
  requestTypeLabel: string;
  status: VisitStatus;
  position: number;
  createdAt: string;
}

export interface KioskItem {
  _id: string;
  name: string;
  category: string;
  unit: string;
  inStock: boolean;
}

export interface AlertEntry {
  itemId: string;
  name: string;
  unit: string;
  batchId: string;
  lotNumber?: string;
  quantity: number;
  expirationDate: string;
  daysLeft: number;
}

export interface Alerts {
  expiryWarningDays: number;
  counts: { lowStock: number; expiringSoon: number; expired: number };
  lowStock: { _id: string; name: string; unit: string; availableQuantity: number; reorderLevel: number; outOfStock: boolean }[];
  expiringSoon: AlertEntry[];
  expired: AlertEntry[];
}

export interface Summary {
  date: string;
  today: {
    total: number;
    byStatus: Record<VisitStatus, number>;
    byType: Partial<Record<RequestType, number>>;
    avgWaitMinutes: number | null;
    avgConsultMinutes: number | null;
  };
  patients: { total: number; incompleteProfiles: number };
  inventory: { activeItems: number; lowStock: number; expiringSoon: number; itemsWithExpiredStock: number };
}

export interface Reports {
  range: { from: string; to: string };
  totalVisits: number;
  visitsPerDay: { date: string; count: number }[];
  visitsByType: Partial<Record<RequestType, number>>;
  visitsByStatus: Partial<Record<VisitStatus, number>>;
  topDispensedItems: { item: string; name: string; quantity: number }[];
}

export interface AuditEntry {
  _id: string;
  username?: string;
  action: string;
  entity?: string;
  entityId?: string;
  details?: unknown;
  ip?: string;
  createdAt: string;
}

// ---------------- Endpoints ----------------
export const api = {
  // auth
  login: (username: string, password: string) =>
    post<{ token: string; user: StaffUser }>("/auth/login", { username, password }),
  me: () => get<{ user: StaffUser }>("/auth/me"),
  updateMe: (body: Partial<Pick<StaffUser, "fullName" | "email" | "position">>) => patch<{ user: StaffUser }>("/auth/me", body),
  changePassword: (currentPassword: string, newPassword: string) =>
    patch<{ token: string }>("/auth/me/password", { currentPassword, newPassword }),

  // student kiosk (no login)
  kioskOptions: () => get<{ requestTypes: { value: RequestType; label: string }[]; items: KioskItem[] }>("/kiosk/options"),
  kioskLookup: (studentNumber: string) =>
    post<{ registered: boolean; displayName?: string; activeRequest: Ticket | null }>("/kiosk/lookup", { studentNumber }),
  kioskSubmit: (body: {
    studentNumber: string;
    requestType: RequestType;
    reason?: string;
    requestedItems?: { item?: string; name?: string; quantity: number }[];
    patient?: { firstName: string; lastName: string; program?: string; yearLevel?: number; section?: string; contactNumber?: string };
  }) => post<{ message: string; displayName: string; ticket: Ticket }>("/kiosk/requests", body),
  kioskTicket: (id: string) => get<{ ticket: Ticket }>(`/kiosk/requests/${id}`),
  kioskCancel: (id: string, studentNumber: string) => post<{ ticket: Ticket }>(`/kiosk/requests/${id}/cancel`, { studentNumber }),

  // queue & visits
  queue: () => get<{ date: string; counts: Record<VisitStatus, number>; inProgress: Visit[]; waiting: Visit[] }>("/queue"),
  callNext: (requestType?: RequestType) => post<{ data: Visit | null; message?: string }>("/queue/next", requestType ? { requestType } : {}),
  visits: (query: Query) => get<Paged<Visit>>("/visits", query),
  visit: (id: string) => get<{ data: Visit }>(`/visits/${id}`),
  createWalkIn: (body: { studentNumber: string; requestType: RequestType; reason?: string; priority?: "normal" | "urgent"; addToQueue?: boolean }) =>
    post<{ data: Visit }>("/visits", body),
  updateVisit: (id: string, body: Partial<Pick<Visit, "assessment" | "treatment" | "referral" | "remarks" | "reason">> & { vitals?: Vitals }) =>
    patch<{ data: Visit }>(`/visits/${id}`, body),
  callVisit: (id: string) => post<{ data: Visit }>(`/visits/${id}/call`),
  requeueVisit: (id: string) => post<{ data: Visit }>(`/visits/${id}/requeue`),
  noShow: (id: string) => post<{ data: Visit }>(`/visits/${id}/no-show`),
  cancelVisit: (id: string, reason?: string) => post<{ data: Visit }>(`/visits/${id}/cancel`, { reason }),
  completeVisit: (id: string, body: {
    vitals?: Vitals; assessment?: string; treatment?: string; referral?: string; remarks?: string;
    dispensed: { item: string; quantity: number; instructions?: string }[];
  }) => post<{ data: Visit }>(`/visits/${id}/complete`, body),

  // patients
  patients: (query: Query) => get<Paged<Patient>>("/patients", query),
  patient: (studentNumber: string) =>
    get<{ data: Patient; summary: { totalCompletedVisits: number; visitsByType: Record<string, number>; recentVisits: Visit[] } }>(
      `/patients/${encodeURIComponent(studentNumber)}`,
    ),
  createPatient: (body: Partial<Patient> & { studentNumber: string; firstName: string; lastName: string }) =>
    post<{ data: Patient }>("/patients", body),
  updatePatient: (studentNumber: string, body: Partial<Patient>) =>
    patch<{ data: Patient }>(`/patients/${encodeURIComponent(studentNumber)}`, body),
  patientHistory: (studentNumber: string, query: Query = {}) =>
    get<Paged<Visit> & { patient: Pick<Patient, "_id" | "studentNumber" | "fullName" | "allergies"> }>(
      `/patients/${encodeURIComponent(studentNumber)}/visits`, query,
    ),

  // inventory
  inventory: (query: Query = {}) => get<Paged<InventoryItem>>("/inventory", query),
  item: (id: string) => get<{ data: InventoryItem }>(`/inventory/${id}`),
  inventoryAlerts: () => get<Alerts>("/inventory/alerts"),
  createItem: (body: Record<string, unknown>) => post<{ data: InventoryItem }>("/inventory", body),
  updateItem: (id: string, body: Record<string, unknown>) => patch<{ data: InventoryItem }>(`/inventory/${id}`, body),
  archiveItem: (id: string) => del<{ data: InventoryItem }>(`/inventory/${id}`),
  restock: (id: string, body: { quantity: number; lotNumber?: string; expirationDate?: string; supplier?: string }) =>
    post<{ data: InventoryItem }>(`/inventory/${id}/restock`, body),
  adjust: (id: string, body: { batchId: string; newQuantity: number; reason: string }) =>
    post<{ data: InventoryItem }>(`/inventory/${id}/adjust`, body),
  disposeExpired: (id: string) => post<{ data: InventoryItem; removed: { quantity: number }[] }>(`/inventory/${id}/dispose-expired`),
  movements: (query: Query = {}, itemId?: string) =>
    get<Paged<StockMovement>>(itemId ? `/inventory/${itemId}/movements` : "/inventory/movements", query),

  // dashboard & admin
  summary: () => get<Summary>("/dashboard/summary"),
  reports: (query: Query = {}) => get<Reports>("/dashboard/reports", query),
  auditLogs: (query: Query = {}) => get<Paged<AuditEntry>>("/dashboard/audit-logs", query),
  users: () => get<{ data: StaffUser[] }>("/users"),
  createUser: (body: { fullName: string; username: string; password: string; role: Role; position?: string; email?: string }) =>
    post<{ data: StaffUser }>("/users", body),
  updateUser: (id: string, body: Partial<Pick<StaffUser, "fullName" | "role" | "position" | "isActive" | "email">>) =>
    patch<{ data: StaffUser }>(`/users/${id}`, body),
  resetUserPassword: (id: string, newPassword: string) => patch<{ message: string }>(`/users/${id}/reset-password`, { newPassword }),
};

// ---------------- Formatting helpers ----------------
export function patientName(p: Visit["patient"] | undefined): string {
  if (!p || typeof p === "string") return "—";
  return p.fullName || `${p.firstName} ${p.lastName}`;
}

export function staffName(s: Visit["handledBy"]): string {
  if (!s || typeof s === "string") return "—";
  return s.fullName;
}

export function fmtDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function fmtTime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

export function vitalsSummary(v?: Vitals): string {
  if (!v) return "—";
  const parts = [
    v.bloodPressure && `BP ${v.bloodPressure}`,
    v.temperature && `${v.temperature} °C`,
    v.pulseRate && `${v.pulseRate} bpm`,
    v.oxygenSaturation && `SpO₂ ${v.oxygenSaturation}%`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

export function needsReview(v?: Vitals): boolean {
  if (!v) return false;
  const [sys, dia] = (v.bloodPressure || "").split("/").map(Number);
  return (v.temperature ?? 0) >= 37.5 || (v.pulseRate ?? 0) > 100 || (v.oxygenSaturation ?? 100) < 95 || sys >= 140 || dia >= 90;
}
