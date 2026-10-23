import type { RideStatus, RideTypeId } from "@workspace/api-client-react";

export const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export const STATUS_LABEL: Record<RideStatus, string> = {
  pending: "مستني كابتن",
  accepted: "الكابتن جاي لك",
  arrived: "الكابتن وصل",
  in_progress: "في الطريق",
  completed: "الرحلة خلصت",
  cancelled: "اتلغت",
};

export const STATUS_HINT: Record<RideStatus, string> = {
  pending: "الطلب اتبعت لكباتن التجربة في محافظتك. أول ما حد يقبله هتشوف بياناته هنا.",
  accepted: "كابتن قبل الطلب وجاي على نقطة الركوب.",
  arrived: "الكابتن مستنيك عند نقطة الركوب.",
  in_progress: "الرحلة بدأت. توصل بالسلامة.",
  completed: "الرحلة اتقفلت. ممكن تقيّمها مرة واحدة.",
  cancelled: "الطلب ده اتلغى ومش هيتحرك تاني.",
};

export const ACTIVE: RideStatus[] = ["pending", "accepted", "arrived", "in_progress"];
export const STEPS: RideStatus[] = ["pending", "accepted", "arrived", "in_progress", "completed"];

export const RIDE_TYPE_FALLBACK: Record<RideTypeId, string> = {
  economy: "اقتصادي",
  family: "عائلي",
  premium: "مميز",
  motorcycle: "موتوسيكل",
};

export function errorText(err: unknown, fallback = "حصلت مشكلة. جرّب تاني كمان شوية."): string {
  const e = err as { status?: number; data?: unknown; message?: string } | null;
  const d = e?.data as { error?: string; message?: string } | string | undefined;
  const msg = typeof d === "string" ? d : d?.error || d?.message;
  if (msg && /[\u0600-\u06FF]/.test(msg)) return msg;
  switch (e?.status) {
    case 401: return "لازم تسجّل دخول الأول.";
    case 403: return "مش مسموح لك تعمل الحركة دي.";
    case 404: return "مش لاقيين الحاجة دي. ممكن تكون اتشالت.";
    case 409: return "مينفعش دلوقتي: الطلب حالته اتغيّرت أو عندك رحلة شغالة بالفعل.";
    case 400: case 422: return "في بيانات ناقصة أو مش مظبوطة. راجعها وجرّب تاني.";
  }
  if (e?.status && e.status >= 500) return "السيرفر واقع شوية. جرّب كمان دقيقة.";
  return fallback;
}

export function fmtTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch { return iso; }
}

export function relTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "دلوقتي";
  if (diff < 3600) return `من ${Math.floor(diff / 60).toLocaleString("ar-EG")} دقيقة`;
  if (diff < 86400) return `من ${Math.floor(diff / 3600).toLocaleString("ar-EG")} ساعة`;
  return fmtTime(iso);
}

export type Draft = {
  pickup: string; destination: string; province: string; rideType: RideTypeId;
  serviceType?: "passenger" | "delivery";
  deliveryDescription?: string;
  recipientName?: string;
  recipientPhone?: string;
  notes: string; pickupLat?: number; pickupLng?: number; destinationLat?: number; destinationLng?: number;
  fareAdjustmentPiasters?: number;
};
const DRAFT_KEY = "pablo:draft";
export const emptyDraft: Draft = { pickup: "", destination: "", province: "", rideType: "economy", serviceType: "passenger", deliveryDescription: "", recipientName: "", recipientPhone: "", notes: "" };
export function loadDraft(): Draft {
  try { const r = sessionStorage.getItem(DRAFT_KEY); if (r) return { ...emptyDraft, ...JSON.parse(r) }; } catch { /* ignore */ }
  return emptyDraft;
}
export function saveDraft(d: Draft) { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* ignore */ } }
export function clearDraft() { try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } }
