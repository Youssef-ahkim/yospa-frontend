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
