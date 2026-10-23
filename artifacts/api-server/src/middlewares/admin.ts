import { clerkClient } from "@clerk/express";
import type { RequestHandler } from "express";

export const requirePabloAdmin: RequestHandler = async (_req, res, next) => {
  const userId = res.locals.userId as string | undefined;
  const allowed = new Set(
    (process.env.PABLO_ADMIN_EMAILS ?? "")
      .split(",").map((email) => email.trim().toLowerCase()).filter(Boolean),
  );
  if (!userId || allowed.size === 0) {
    res.status(503).json({ error: "لم يتم إعداد حساب مدير بابلو بعد." });
    return;
  }
  try {
    const user = await clerkClient.users.getUser(userId);
    const primary = user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId);
    if (!primary || primary.verification?.status !== "verified" || !allowed.has(primary.emailAddress.toLowerCase())) {
      res.status(403).json({ error: "صفحة مراجعة الكباتن للمدير المصرّح له فقط." });
      return;
    }
    next();
  } catch {
    res.status(503).json({ error: "تعذر التحقق من حساب المدير." });
  }
};
