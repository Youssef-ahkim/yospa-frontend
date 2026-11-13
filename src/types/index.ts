export interface Spa {
  id: number;
  name: string;
  slug: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  spa_id: number | null;
  spa?: Spa | null;
}

export interface Client {
  id: number;
  spa_id?: number;
  full_name: string;
  phone: string;
  email: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Service {
  id: number;
  spa_id?: number;
  name: string;
  description?: string;
  duration_minutes: number;
  price: string | number;
  is_active?: boolean;
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
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
  },
  confirmed: {
    label: "Confirmed",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
    dotClass: "bg-green-500",
  },
  completed: {
    label: "Completed",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500",
  },
  cancelled: {
    label: "Cancelled",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    dotClass: "bg-red-500",
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
  start_time: string;
  end_time: string;
  total_price: number | string;
  status: ReservationStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  client?: Client | null;
  service?: Service | null;
}

export interface ApiResponse<T> {
  message?: string;
  data?: T;
}
