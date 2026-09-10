/** Real lab-referral SQL/API checks. Only the owned local database is allowed. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { open } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import { once } from "node:events";
const require = createRequire(
  new URL("../packages/backend/package.json", import.meta.url),
);
const sql = require("mssql");
let pool,
  child,
  phase = "owned database";
try {
  assert.match(
    process.env.AZURE_SQL_CONNECTION_STRING ?? "",
    /^Server=127\.0\.0\.1,/,
  );
  pool = await new sql.ConnectionPool(
    process.env.AZURE_SQL_CONNECTION_STRING,
  ).connect();
  const identity = (
    await pool
      .request()
      .query("SELECT DB_NAME() AS db,Token FROM dbo.OrcaOwner")
  ).recordset[0];
  assert.equal(identity.db, process.env.ORCA_SQL_DATABASE);
  assert.equal(identity.Token, process.env.ORCA_SQL_MARKER);
  const handle = await open(
    process.env.ORCA_ANA_FIXTURE,
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  let fixture;
  try {
    const stat = await handle.stat();
    assert.ok(
      stat.isFile() &&
        stat.uid === process.getuid() &&
        !(stat.mode & 0o077) &&
        stat.nlink === 1,
    );
    fixture = JSON.parse(await handle.readFile("utf8"));
  } finally {
    await handle.close();
  }
  assert.equal(fixture.database, identity.db);
  child = spawn(
    process.execPath,
    ["--import", require.resolve("tsx"), "src/index.ts"],
    {
      cwd: new URL("../packages/backend", import.meta.url),
      env: process.env,
      stdio: "ignore",
    },
  );
  const origin = process.env.ECOGLOBE_API_BASE_URL;
  assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      ready = (await fetch(origin + "/health")).ok;
    } catch {}
    if (ready) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(ready);
  async function call(path, method = "GET", body, token, status = 200) {
    const res = await fetch(origin + path, {
      method,
      signal: AbortSignal.timeout(30000),
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: "Bearer " + token } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (res.status !== status) {
      const failure = await res.json().catch(() => ({}));
      assert.equal(
        res.status,
        status,
        phase +
          " " +
          method +
          " " +
          path +
          ": " +
          String(failure.error ?? "").slice(0, 200),
      );
    }
    return res.json();
  }
  const seller = await call("/auth/login", "POST", {
    email: fixture.seller.email,
    password: fixture.password,
    role: "seller",
  });
  const admin = await call("/auth/login", "POST", {
    email: fixture.admin.email,
    password: fixture.password,
    role: "admin",
  });
  const buyer = await call("/auth/login", "POST", {
    email: fixture.buyer.email,
    password: fixture.password,
    role: "buyer",
  });
  const listingId = fixture.listings.find((x) => x.status === "published").id;
  phase = "configuration and access";
  await call("/api/pilots/requests", "GET", undefined, undefined, 401);
  await call("/api/admin/pilots/requests", "GET", undefined, buyer.token, 403);
  const config = await call(
    `/api/pilots/config?listingId=${listingId}`,
    "GET",
    undefined,
    buyer.token,
  );
  assert.ok(config.locations.length);
  const input = {
    listingId,
    clientRequestId: randomUUID(),
    loadChoice: "two",
    loadCount: 2,
    approximateTonnage: 45,
    deliveryLocationId: config.locations[0].id,
    neededBy: "October 2026",
    constraints: ["Booked delivery window", "Weighbridge ticket"],
    objective: "Synthetic pilot moisture consistency " + randomUUID(),
  };
  await call(
    "/api/pilots/requests",
    "POST",
    { ...input, loadCount: 1 },
    buyer.token,
    400,
  );
  await call(
    "/api/pilots/requests",
    "POST",
    { ...input, deliveryLocationId: 2147483647 },
    buyer.token,
    400,
  );
  const simultaneous = await Promise.all([
    call("/api/pilots/requests", "POST", input, buyer.token, 201),
    call("/api/pilots/requests", "POST", input, buyer.token, 201),
  ]);
  const req = simultaneous[0].request;
  assert.equal(simultaneous[1].request.id, req.id);
  assert.equal(
    (await call("/api/pilots/requests", "POST", input, buyer.token, 201))
      .request.id,
    req.id,
  );
  await call(
    "/api/pilots/requests",
    "POST",
    { ...input, objective: "changed" },
    buyer.token,
    409,
  );
  await call(
    `/api/pilots/requests/${req.id}`,
    "GET",
    undefined,
    seller.token,
    404,
  );
  const hidden = (
    await call("/api/pilots/seller-interest", "GET", undefined, seller.token)
  ).requests.find((x) => x.id === req.id);
  assert.ok(hidden);
  assert.equal(hidden.buyerCompanyName, undefined);
  assert.equal(hidden.objective, undefined);
  assert.equal(hidden.destinationLabel, undefined);
  phase = "slots and concurrent bookings";
  const staff = (
    await call("/api/admin/pilots/slots", "GET", undefined, admin.token)
  ).staff;
  const start = new Date(
    Date.now() +
      86400000 * 2 +
      ((Math.floor(Math.random() * 100000) * 60000) % 86400000),
  );
  start.setUTCSeconds(0, 0);
  const slot = (
    await call(
      "/api/admin/pilots/slots",
      "POST",
      { ownerUserId: staff[0].userId, startsAt: start.toISOString() },
      admin.token,
      201,
    )
  ).slot;
  await call(
    "/api/admin/pilots/slots",
    "POST",
    { ownerUserId: staff[0].userId, startsAt: start.toISOString() },
    admin.token,
    409,
  );
  const req2 = (
    await call(
      "/api/pilots/requests",
      "POST",
      { ...input, clientRequestId: randomUUID() },
      buyer.token,
      201,
    )
  ).request;
  const book = async (id) =>
    fetch(origin + `/api/pilots/requests/${id}/schedule`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + buyer.token,
      },
      body: JSON.stringify({ slotId: slot.id }),
    });
  const booked = await Promise.all([book(req.id), book(req2.id)]);
  assert.deepEqual(booked.map((x) => x.status).sort(), [200, 409]);
  const winner = booked[0].status === 200 ? req : req2,
    loser = winner.id === req.id ? req2 : req;
  assert.equal(
    (
      await call(
        `/api/pilots/requests/${winner.id}/schedule`,
        "POST",
        { slotId: slot.id },
        buyer.token,
      )
    ).request.status,
    "call_booked",
  );
  await call(
    `/api/admin/pilots/slots/${slot.id}`,
    "DELETE",
    undefined,
    admin.token,
    409,
  );
  const fallback = (
    await call(
      `/api/pilots/requests/${loser.id}/email-preference`,
      "POST",
      {},
      buyer.token,
    )
  ).request;
  assert.equal(fallback.contactPreference, "email");
  phase = "desk and consent";
  const adminPath = `/api/admin/pilots/requests/${winner.id}`;
  await call(adminPath, "PATCH", { status: "won" }, admin.token, 409);
  await call(adminPath + "/handoff", "POST", {}, admin.token, 409);
  const note = "Lane record " + randomUUID();
  await call(adminPath + "/notes", "POST", { body: note }, admin.token, 201);
  assert.equal(
    (
      await call(
        `/api/admin/pilots/requests?q=${encodeURIComponent(note)}`,
        "GET",
        undefined,
        admin.token,
      )
    ).requests[0].id,
    winner.id,
  );
  await call(
    adminPath + "/steps/seller_availability",
    "PUT",
    { completed: true },
    admin.token,
  );
  const detail = await call(adminPath, "GET", undefined, admin.token);
  assert.ok(
    detail.steps.find((x) => x.key === "seller_availability").completedByName,
  );
  assert.deepEqual(
    (
      await call(
        `/api/pilots/requests/${winner.id}`,
        "GET",
        undefined,
        buyer.token,
      )
    ).notes,
    [],
  );
  for (const status of ["call_held", "working_lane", "offer_sent"])
    await call(
      adminPath,
      "PATCH",
      {
        status,
        nextAction: "Synthetic next action",
        ownerUserId: staff[0].userId,
      },
      admin.token,
    );
  await call(
    `/api/pilots/requests/${winner.id}/proceed`,
    "POST",
    { confirm: true },
    seller.token,
    404,
  );
  assert.equal(
    (
      await call(
        `/api/pilots/requests/${winner.id}`,
        "GET",
        undefined,
        buyer.token,
      )
    ).request.nextAction,
    "",
  );
  const agreed = (
    await call(
      `/api/pilots/requests/${winner.id}/proceed`,
      "POST",
      { confirm: true },
      buyer.token,
    )
  ).request;
  assert.ok(agreed.buyerConsentedAt);
  const visible = (
    await call("/api/pilots/seller-interest", "GET", undefined, seller.token)
  ).requests.find((x) => x.id === winner.id);
  assert.ok(visible.buyerCompanyName);
  assert.equal(visible.objective, undefined);
  phase = "fulfilment handoff";
  const handoff = await call(adminPath + "/handoff", "POST", {}, admin.token);
  assert.ok(handoff.shipmentId);
  assert.equal(
    (await call(adminPath + "/handoff", "POST", {}, admin.token)).shipmentId,
    handoff.shipmentId,
  );
  const shipment = (
    await call("/api/shipments", "GET", undefined, admin.token)
  ).shipments.find((x) => x.id === handoff.shipmentId);
  assert.equal(shipment.pilotRequestId, winner.id);
  assert.equal(shipment.orderId, null);
  assert.equal(shipment.shippingCost, null);
  await call(
    `/api/shipments/${shipment.id}`,
    "PATCH",
    { shipmentStatusCode: "scheduled" },
    buyer.token,
    403,
  );
  await call(
    `/api/shipments/${shipment.id}`,
    "PATCH",
    { shipmentStatusCode: "scheduled" },
    admin.token,
  );
  phase = "database persistence";
  const persisted = (
    await pool
      .request()
      .input("id", sql.Int, winner.id)
      .query(
        "SELECT Status,BuyerConsentedAt FROM dbo.PilotRequests WHERE Id=@id",
      )
  ).recordset[0];
  assert.equal(persisted.Status, "won");
  assert.ok(persisted.BuyerConsentedAt);
  console.log(
    JSON.stringify({
      ok: true,
      pilotId: winner.id,
      fallbackId: loser.id,
      shipmentId: shipment.id,
      listingId,
      checks: [
        "access",
        "input validation",
        "idempotency",
        "concurrent slot booking",
        "identity consent",
        "searchable attributed notes",
        "steps",
        "lifecycle",
        "email preference",
        "shipment handoff",
        "SQL persistence",
      ],
    }),
  );
} catch (error) {
  console.error(
    "Pilot integration failed at " +
      phase +
      ": " +
      (error instanceof Error ? error.message : "unknown"),
  );
  process.exitCode = 1;
} finally {
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await once(child, "exit");
  }
  if (pool) await pool.close();
  await sql.close();
}
