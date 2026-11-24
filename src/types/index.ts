export type Role = "owner" | "admin" | "staff" | "superuser";

export interface Spa {
  id: number;
  name: string;
  slug: string;
  status?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  spa_id: number | null;
  spa?: Spa | null;
}

export interface Staff {
  id: number;
  spa_id?: number;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Therapist {
  id: number;
  spa_id?: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  color: string;
  notes?: string | null;
  is_active?: boolean;
  user_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ClientStats {
  total_reservations: number;
  completed_count: number;
  cancelled_count: number;
  upcoming_count: number;
  last_visit: string | null;
  total_spent: number | null;
}

export interface Client {
  id: number;
  spa_id?: number;
  full_name: string;
  phone: string;
  email: string | null;
  notes?: string | null;
  stats?: ClientStats;
  created_at?: string;
  updated_at?: string;
}

export interface Service {
  id: number;
  spa_id?: number;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: string | number;
  is_active: boolean;
}

export type ReservationStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface ReservationStatusConfig {
  label: string;
  badgeClass: string;
  dotClass: string;
}

export const RESERVATION_STATUSES: Record<ReservationStatus, ReservationStatusConfig> = {
  pending: {
    label: "Pending",
    badgeClass: "bg-[#FFF8EE] text-[#B45309] border-[#FDE68A]",
    dotClass: "bg-[#F59E0B]",
  },
  confirmed: {
    label: "Confirmed",
    badgeClass: "bg-[#F0EAF7] text-[#7455A4] border-[#C9B8E2]",
    dotClass: "bg-[#7455A4]",
  },
  completed: {
    label: "Completed",
    badgeClass: "bg-[#91A68D]/15 text-[#91A68D] border-[#91A68D]/30",
    dotClass: "bg-[#91A68D]",
  },
  cancelled: {
    label: "Cancelled",
    badgeClass: "bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3]",
    dotClass: "bg-[#F43F5E]",
  },
};

export const ALLOWED_STATUS_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export interface Reservation {
  id: number;
  spa_id?: number;
  client_id?: number;
  service_id?: number;
  therapist_id?: number | null;
  start_time: string;
  end_time: string;
  total_price: number | string;
  status: ReservationStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  client?: Client | null;
  service?: Service | null;
  therapist?: Therapist | null;
}

export interface ApiResponse<T> {
  message?: string;
  data?: T;
}

export interface PaginationLink {
  url: string | null;
  label: string;
  active: boolean;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
  links?: PaginationLink[];
  first_page_url?: string;
  last_page_url?: string;
  next_page_url?: string | null;
  prev_page_url?: string | null;
  path?: string;
}

export interface DashboardSummary {
  today_reservations_count: number;
  upcoming_count: number;
  revenue: number | null;
  counts_by_status: {
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  };
  total_clients: number;
  total_reservations: number;
}

export type SalesReportRange = "1d" | "7d" | "30d" | "12m";

export interface SalesBucket {
  label: string;
  start: string; // naive local "YYYY-MM-DD HH:mm:ss"
  revenue: number | null; // null for staff
  completed_count: number;
  bookings: number;
}

export interface SalesTotals {
  revenue: number | null; // null for staff
  completed_count: number;
  bookings: number;
}

export interface SalesReportData {
  range: SalesReportRange;
  from: string;
  to: string;
  buckets: SalesBucket[];
  totals: SalesTotals;
  now?: string;
}

export interface BestSellerService {
  service_id: number;
  name: string;
  count: number;
  revenue: number | null; // null for staff
}

export interface PlatformStats {
  spas: {
    total: number;
    active: number;
    suspended: number;
  };
  users: number;
  clients: number;
  reservations: number;
}

export interface PlatformSpa {
  id: number;
  name: string;
  slug: string;
  status: "active" | "suspended";
  owner_emails: string[];
  counts: {
    users: number;
    clients: number;
    services: number;
    therapists: number;
    reservations: number;
  };
  created_at?: string;
  updated_at?: string;
}

export interface PlatformUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
}

export interface PlatformSpaDetail {
  spa: {
    id: number;
    name: string;
    slug: string;
    status: "active" | "suspended";
    created_at?: string;
    updated_at?: string;
  };
  counts: {
    users: number;
    clients: number;
    services: number;
    therapists: number;
    reservations: number;
  };
  users: PlatformUser[];
}

export interface PlatformAuditLog {
  id: number;
  actor_user_id: number | null;
  action: string;
  subject_type: string;
  subject_id: number | null;
  spa_id: number | null;
  meta?: Record<string, unknown> | null;
  ip?: string | null;
  created_at?: string;
  actor?: { id: number; name: string; email: string } | null;
  spa?: { id: number; name: string; slug: string } | null;
}
