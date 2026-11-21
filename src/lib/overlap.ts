import type { Reservation } from "@/types";

export interface OverlapCheckParams {
  startTime: string;
  endTime: string;
  excludeReservationId?: number | null;
  targetTherapistId?: number | null;
  reservations: Reservation[];
}

export interface OverlapResult {
  hasGenericConflict: boolean;
  genericConflict: Reservation | null;
  hasTherapistConflict: boolean;
  therapistConflict: Reservation | null;
}

export function isTimeOverlapping(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && endA > startB;
}

export function checkReservationOverlap(params: OverlapCheckParams): OverlapResult {
  const {
    startTime,
    endTime,
    excludeReservationId,
    targetTherapistId,
    reservations,
  } = params;

  if (!startTime || !endTime || !reservations.length) {
    return {
      hasGenericConflict: false,
      genericConflict: null,
      hasTherapistConflict: false,
      therapistConflict: null,
    };
  }

  const currentStart = new Date(startTime.replace(" ", "T")).getTime();
  const currentEnd = new Date(endTime.replace(" ", "T")).getTime();

  if (isNaN(currentStart) || isNaN(currentEnd) || currentStart >= currentEnd) {
    return {
      hasGenericConflict: false,
      genericConflict: null,
      hasTherapistConflict: false,
      therapistConflict: null,
    };
  }

  let genericConflict: Reservation | null = null;
  let therapistConflict: Reservation | null = null;

  for (const r of reservations) {
    if (excludeReservationId && r.id === excludeReservationId) {
      continue;
    }
    if (r.status === "cancelled") {
      continue;
    }

    const rStart = new Date(r.start_time.replace(" ", "T")).getTime();
    const rEnd = new Date(r.end_time.replace(" ", "T")).getTime();

    if (isNaN(rStart) || isNaN(rEnd)) {
      continue;
    }

    if (isTimeOverlapping(currentStart, currentEnd, rStart, rEnd)) {
      if (!genericConflict) {
        genericConflict = r;
      }

      if (targetTherapistId != null && targetTherapistId !== undefined) {
        const rTherapistId = r.therapist_id ?? r.therapist?.id;
        if (rTherapistId != null && Number(rTherapistId) === Number(targetTherapistId)) {
          therapistConflict = r;
          break;
        }
      }
    }
  }

  return {
    hasGenericConflict: Boolean(genericConflict),
    genericConflict,
    hasTherapistConflict: Boolean(therapistConflict),
    therapistConflict,
  };
}
