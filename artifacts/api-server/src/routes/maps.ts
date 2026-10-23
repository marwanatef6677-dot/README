import { Router, type IRouter } from "express";
import { rateLimit } from "express-rate-limit";
import { PreviewRouteBody, PreviewRouteResponse } from "@workspace/api-zod";
import { AppError } from "../lib/pablo";
import { calculateFarePiasters, getRoutePreview } from "../lib/routing";

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
  try {
    const route = await getRoutePreview({ pickupLat, pickupLng, destinationLat, destinationLng });
    res.setHeader("Cache-Control", "no-store");
    res.json(PreviewRouteResponse.parse({
      distanceMeters: route.distanceMeters, durationSeconds: route.durationSeconds, coordinates: route.coordinates,
      estimatedFarePiasters: calculateFarePiasters(route.distanceMeters, route.durationSeconds),
    }));
  } catch (error) {
    if (error instanceof AppError) throw error;
    req.log.warn("Route preview provider unavailable");
    throw new AppError(503, "خدمة حساب المسار مش متاحة دلوقتي. جرّب تاني؛ تقدر تطلب الرحلة بالنقط المحددة من غير حساب المسافة.");
  }
});
export default router;
