import { createHash, timingSafeEqual } from "node:crypto";
import { AppError } from "./pablo";

export type FawryPaymentMethod = "PayAtFawry" | "MWALLET";

type FawryConfig = {
  merchantCode: string;
  secureKey: string;
  baseUrl: string;
  notifyUrl?: string;
};

export type FawryStatus = {
  merchantRefNumber?: string;
  merchantRefNum?: string;
  fawryRefNumber?: string;
  orderStatus?: string;
  orderAmount?: string | number;
  paymentAmount?: string | number;
  paymentMethod?: string;
  paymentRefrenceNumber?: string;
  paymentReferenceNumber?: string;
  messageSignature?: string;
  walletQr?: string;
  referenceNumber?: string;
  statusCode?: number;
  statusDescription?: string;
};

export class FawryUncertainError extends Error {}

export function getFawryConfig(): FawryConfig {
  const merchantCode = process.env.FAWRY_MERCHANT_CODE?.trim();
  const secureKey = process.env.FAWRY_SECURE_KEY?.trim();
  if (!merchantCode || !secureKey) {
    throw new AppError(503, "شحن الرصيد لسه مش متوصل بحساب فوري. كمل إعدادات فوري في أسرار المشروع.");
  }
  const mode = process.env.FAWRY_ENVIRONMENT?.trim() || "staging";
  if (mode !== "staging" && mode !== "production") throw new AppError(503, "إعداد بيئة فوري غير صحيح.");
  const baseUrl = mode === "production"
    ? "https://www.atfawry.com"
    : "https://atfawry.fawrystaging.com";
  const notifyUrl = process.env.FAWRY_NOTIFY_URL?.trim();
  if (notifyUrl) {
    let parsed: URL;
    try { parsed = new URL(notifyUrl); } catch { throw new AppError(503, "رابط إشعار فوري غير صحيح."); }
    if (parsed.protocol !== "https:") throw new AppError(503, "رابط إشعار فوري لازم يكون HTTPS.");
  }
  if (mode === "production" && !notifyUrl) {
    throw new AppError(503, "لازم تضبط رابط إشعار الدفع الرسمي من إعدادات حساب فوري قبل تفعيل التحصيل.");
  }
  return { merchantCode, secureKey, baseUrl, notifyUrl };
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function constantTimeHexEqual(left: string | undefined, right: string): boolean {
  if (!left || !/^[a-f0-9]{64}$/i.test(left)) return false;
  const a = Buffer.from(left.toLowerCase(), "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyFawryNotification(payload: FawryStatus, secureKey: string): boolean {
  const merchantRef = payload.merchantRefNumber ?? payload.merchantRefNum ?? "";
  const fawryRef = payload.fawryRefNumber ?? "";
  const paymentAmount = Number(payload.paymentAmount);
  const orderAmount = Number(payload.orderAmount);
  if (!merchantRef || !fawryRef || !payload.orderStatus || !payload.paymentMethod
      || !Number.isFinite(paymentAmount) || !Number.isFinite(orderAmount)) return false;
  const paymentReference = payload.paymentRefrenceNumber ?? payload.paymentReferenceNumber ?? "";
  const signature = sha256(
    fawryRef + merchantRef + paymentAmount.toFixed(2) + orderAmount.toFixed(2)
      + payload.orderStatus + payload.paymentMethod + paymentReference + secureKey,
  );
  return constantTimeHexEqual(payload.messageSignature, signature);
}

export async function createFawryCharge(input: {
  merchantRefNum: string;
  amountPiasters: number;
  paymentMethod: FawryPaymentMethod;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
}): Promise<FawryStatus> {
  const config = getFawryConfig();
  const amount = (input.amountPiasters / 100).toFixed(2);
  const payload: Record<string, unknown> = {
    merchantCode: config.merchantCode,
    merchantRefNum: input.merchantRefNum,
    paymentMethod: input.paymentMethod,
    customerName: input.customerName,
    customerMobile: input.customerMobile.replace(/^\+20/, "0"),
    customerEmail: input.customerEmail,
    amount,
    currencyCode: "EGP",
    description: "شحن رصيد كابتن بابلو",
    language: "ar-eg",
    paymentExpiry: Date.now() + 30 * 60 * 1000,
    chargeItems: [{
      itemId: "pablo-captain-wallet",
      description: "شحن رصيد كابتن بابلو",
      price: amount,
      quantity: 1,
    }],
  };
  if (config.notifyUrl) payload.orderWebHookUrl = config.notifyUrl;
  payload.signature = sha256(
    config.merchantCode + input.merchantRefNum + input.paymentMethod + amount + config.secureKey,
  );
  const endpoint = input.paymentMethod === "MWALLET"
    ? "/ECommerceWeb/api/payments/charge"
    : "/ECommerceWeb/Fawry/payments/charge";
  let response: Response;
  try {
    response = await fetch(config.baseUrl + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new FawryUncertainError("فوري لم يؤكد إنشاء طلب الشحن. حالة الطلب قيد التحقق.");
  }
  const result = await response.json().catch(() => null) as FawryStatus | null;
  if (!response.ok || !result) {
    throw new FawryUncertainError("فوري لم يؤكد إنشاء طلب الشحن. حالة الطلب قيد التحقق.");
  }
  if (result.statusCode !== 200 || (!result.referenceNumber && !result.fawryRefNumber)) {
    throw new AppError(502, "فوري مأنشأش طلب الشحن. مفيش رصيد اتضاف؛ جرّب تاني أو راجع حساب فوري.");
  }
  return result;
}

export async function getFawryPaymentStatus(merchantRefNum: string): Promise<FawryStatus> {
  const config = getFawryConfig();
  const signature = sha256(config.merchantCode + merchantRefNum + config.secureKey);
  const url = new URL("/ECommerceWeb/Fawry/payments/status/v2", config.baseUrl);
  url.searchParams.set("merchantCode", config.merchantCode);
  url.searchParams.set("merchantRefNumber", merchantRefNum);
  url.searchParams.set("signature", signature);
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new AppError(503, "تعذر تحديث حالة طلب الشحن من فوري. الرصيد لم يتغير.");
  }
  const result = await response.json().catch(() => null) as FawryStatus | null;
  if (!response.ok || !result) throw new AppError(503, "تعذر تحديث حالة طلب الشحن من فوري. الرصيد لم يتغير.");
  return result;
}

export function fawryAmountToPiasters(value: string | number | undefined): number | null {
  if (value === undefined) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}
