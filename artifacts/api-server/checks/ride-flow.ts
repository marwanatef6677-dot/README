// Isolated HTTP integration check. Never imported by the production entrypoint.
// The build harness substitutes only the auth middleware with test identities.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import { db, pool, profiles, rides, rideLocations } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import rideRouter from "../src/routes/rides";
import trackingRouter from "../src/routes/tracking";
import { AppError } from "../src/lib/pablo";

const prefix = `check-${randomUUID()}`;
const ids = [`${prefix}-customer`, `${prefix}-driver1`, `${prefix}-driver2`, `${prefix}-stranger`];
const app = express();
app.use(express.json(), trackingRouter, rideRouter);
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(error instanceof AppError ? error.status : 500).json({ error: error instanceof Error ? error.message : "error" });
});
const server = app.listen(0, "127.0.0.1");
await new Promise<void>(r => server.once("listening", r));
const address = server.address();
assert.ok(address && typeof address !== "string");
const base = `http://127.0.0.1:${address.port}`;
const request = async (user: string, path: string, method = "GET", data?: unknown) => {
  const response = await fetch(base + path, {
    method, headers: { "Content-Type": "application/json", "x-test-user": user },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  return { status: response.status, body: response.status === 204 ? null : await response.json() };
};
try {
  await db.insert(profiles).values(ids.map((id, i) => ({
    id, name: "حساب اختبار", phone: "01000000000", role: i === 1 || i === 2 ? "driver" : "customer",
    province: "القاهرة", vehicle: "سيارة اختبار", plate: "اختبار", onboarded: true,
  })));
  const input = { pickup: "نقطة اختبار أولى", destination: "نقطة اختبار ثانية", province: "القاهرة", rideType: "economy", pickupLat: 30.0444, pickupLng: 31.2357, destinationLat: 30.0626, destinationLng: 31.2497 };
  const created = await request(ids[0], "/rides", "POST", input);
  assert.equal(created.status, 201);
  const id = created.body.id;
  assert.equal((await request(ids[0], "/rides", "POST", input)).status, 409);
  assert.equal((await request(ids[3], `/rides/${id}`)).status, 404);
  const queue = await request(ids[1], "/rides/available");
  const queued = queue.body.find((r: { id: number }) => r.id === id);
  assert.equal(queued.customerPhone, null);
  assert.equal(queued.pickupLat, null);
  assert.equal(queued.destinationLat, null);
  const accepted = await Promise.all([ids[1], ids[2]].map(user => request(user, `/rides/${id}/action`, "POST", { action: "accept" })));
  assert.deepEqual(accepted.map(r => r.status).sort(), [200, 409]);
  const driver = ids[accepted[0].status === 200 ? 1 : 2];
  const point = { latitude: 30.045, longitude: 31.236, accuracy: 12 };
  assert.equal((await request(ids[0], `/rides/${id}/location`, "PUT", point)).status, 404);
  assert.equal((await request(ids[3], `/rides/${id}/location`)).status, 404);
  assert.equal((await request(driver, `/rides/${id}/location`, "PUT", point)).status, 200);
  assert.equal((await request(ids[0], `/rides/${id}/location`)).body.location.latitude, point.latitude);
  assert.equal((await request(driver, `/rides/${id}/location`, "DELETE")).status, 204);
  assert.equal((await request(ids[0], `/rides/${id}/location`)).body.location, null);
  assert.equal((await request(driver, `/rides/${id}/action`, "POST", { action: "complete" })).status, 409);
  for (const action of ["arrive", "start"]) assert.equal((await request(driver, `/rides/${id}/action`, "POST", { action })).status, 200);
  assert.equal((await request(ids[0], `/rides/${id}/action`, "POST", { action: "cancel" })).status, 409);
  const last = await Promise.all([
    request(driver, `/rides/${id}/location`, "PUT", point),
    request(driver, `/rides/${id}/action`, "POST", { action: "complete" }),
  ]);
  assert.equal(last[1].status, 200);
  assert.equal((await request(ids[0], `/rides/${id}/location`)).body.location, null);
  assert.equal((await db.select().from(rideLocations).where(eq(rideLocations.rideId, id))).length, 0);
  assert.equal((await request(driver, `/rides/${id}/location`, "PUT", point)).status, 409);
  assert.equal((await request(ids[0], `/rides/${id}/action`, "POST", { action: "rate", rating: 5 })).status, 200);
  assert.equal((await request(ids[0], `/rides/${id}/action`, "POST", { action: "rate", rating: 4 })).status, 409);
  const second = await request(ids[0], "/rides", "POST", input);
  assert.equal(second.status, 201);
  assert.equal((await request(driver, `/rides/${second.body.id}/action`, "POST", { action: "accept" })).status, 200);
  await request(driver, `/rides/${second.body.id}/location`, "PUT", point);
  assert.equal((await request(ids[0], `/rides/${second.body.id}/action`, "POST", { action: "cancel" })).status, 200);
  assert.equal((await request(driver, `/rides/${second.body.id}/location`)).body.location, null);
  process.stdout.write("PASS: booking, ownership, atomic acceptance, tracking privacy, stop, completion/cancel cleanup, rating.\n");
} finally {
  await db.delete(rides).where(inArray(rides.customerId, ids));
  await db.delete(profiles).where(inArray(profiles.id, ids));
  await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  await pool.end();
}
