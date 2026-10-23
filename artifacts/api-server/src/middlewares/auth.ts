import { getAuth } from "@clerk/express";
import { db, profiles } from "@workspace/db";
import type { RequestHandler } from "express";

export const requirePabloAuth: RequestHandler = async (req, res, next) => {
  const id = getAuth(req).userId;
  if (!id) {
    res.status(401).json({ error: "سجّل الدخول الأول عشان تكمل." });
    return;
  }
  await db.insert(profiles).values({ id }).onConflictDoNothing();
  res.locals.userId = id;
  res.setHeader("Cache-Control", "no-store");
  next();
};
