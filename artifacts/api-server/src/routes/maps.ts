import { Router, type IRouter } from "express";
import { rateLimit } from "express-rate-limit";
import { PreviewRouteBody, PreviewRouteResponse } from "@workspace/api-zod";
import { AppError } from "../lib/pablo";

const router: IRouter = Router();
const limiter = rateLimit({
  windowMs: 60_000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false,
  message: { error: "طلبات الخريطة كتير. استنى دقيقة وحاول تاني." },
  // Shared-proxy IP is deliberately used conservatively for this pilot.
  validate: { xForwardedForHeader: false },
});
router.post("/routes/preview", limiter, async (req, res): Promise<void> => {
  const parsed = PreviewRouteBody.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, "حدد مكان الركوب والوجهة على الخريطة.");
  const { pickupLat, pickupLng, destinationLat, destinationLng } = parsed.data;
  // Fixed provider host and strictly validated numeric values prevent SSRF.
  const coordinates = `${pickupLng},${pickupLat};${destinationLng},${destinationLat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=simplified&geometries=geojson&steps=false`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Routing provider status ${response.status}`);
    const data = await response.json() as { code?: string; routes?: { distance: number; duration: number; geometry: { coordinates: number[][] } }[] };
    const route = data.routes?.[0];
    if (data.code !== "Ok" || !route) throw new AppError(422, "مفيش مسار قيادة متاح بين النقطتين. راجع اختيارك.");
    res.setHeader("Cache-Control", "no-store");
    res.json(PreviewRouteResponse.parse({
      distanceMeters: route.distance, durationSeconds: route.duration, coordinates: route.geometry.coordinates,
    }));
  } catch (error) {
    if (error instanceof AppError) throw error;
    req.log.warn("Route preview provider unavailable");
    throw new AppError(503, "خدمة حساب المسار مش متاحة دلوقتي. جرّب تاني؛ تقدر تطلب الرحلة بالنقط المحددة من غير حساب المسافة.");
  }
});
export default router;
