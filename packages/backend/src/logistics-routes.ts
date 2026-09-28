import type { IncomingMessage, ServerResponse } from "node:http";
import { requireSessionAuth } from "./auth.js";
import {
  sql,
  queryRowsWithParams as query,
  queryRowsWithParamsInTransaction as txQuery,
  runInTransaction,
  type QueryParameter,
} from "./database.js";
import { ApiError, readJsonBody, sendJson, type AuthContext } from "./http.js";
import { validatePdf } from "./lab-validation.js";

const int = (name: string, value: unknown): QueryParameter => ({
  name,
  value,
  type: sql.Int,
});
const text = (name: string, value: unknown, size = 1000): QueryParameter => ({
  name,
  value,
  type: sql.NVarChar(size),
});
function required(value: unknown, name: string, max = 1000) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new ApiError(400, `Invalid ${name}.`);
  return value.trim();
}
function id(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)
    throw new ApiError(400, "Invalid ID.");
  return value;
}
function date(value: unknown, name: string) {
  const raw = required(value, name, 80);
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime()))
    throw new ApiError(400, `Invalid ${name}.`);
  return parsed;
}
type Order = {
  id: number;
  buyerCompanyId: number;
  sellerCompanyId: number;
  status: string;
  currencyCode: string;
  shippingTypeCode: string;
};
export function authorizeLogistics(
  auth: AuthContext,
  order: Order,
  role: "buyer" | "seller" | "participant",
) {
  const allowed =
    role === "buyer"
      ? auth.companyId === order.buyerCompanyId && !auth.isAdmin
      : role === "seller"
        ? auth.isAdmin || auth.companyId === order.sellerCompanyId
        : auth.isAdmin ||
          auth.companyId === order.buyerCompanyId ||
          auth.companyId === order.sellerCompanyId;
  if (!allowed)
    throw new ApiError(
      403,
      "This company cannot perform that logistics action.",
    );
}
const orderSelect = `SELECT o.Id AS id,o.BuyerCompanyId AS buyerCompanyId,o.SellerCompanyId AS sellerCompanyId,os.Code AS status,o.CurrencyCode AS currencyCode,o.DeliveryMethod AS shippingTypeCode FROM dbo.Orders o WITH (UPDLOCK,HOLDLOCK) JOIN dbo.OrderStatuses os ON os.Id=o.OrderStatusId WHERE o.Id=@id`;
async function workspace(auth: AuthContext) {
  const orders = await query(
    `SELECT o.Id AS id,os.Code AS orderStatusCode,o.BuyerCompanyId AS buyerCompanyId,o.SellerCompanyId AS sellerCompanyId,b.LegalName AS buyerCompanyName,s.LegalName AS sellerCompanyName,l.Title AS listingTitle,o.Quantity AS quantity,o.QuantityUnit AS quantityUnitCode,o.DeliveryMethod AS shippingTypeCode,o.CurrencyCode AS currencyCode,o.DeliveryAddress AS deliveryAddress,CAST(CASE WHEN EXISTS(SELECT 1 FROM dbo.Escrows e JOIN dbo.EscrowStatuses es ON es.Id=e.EscrowStatusId WHERE e.OrderId=o.Id AND es.Code='dispute_locked') THEN 1 ELSE 0 END AS BIT) AS fulfilmentLocked,
 (SELECT TOP(1) sh.Id AS id,ss.Code AS statusCode,sh.CarrierId AS carrierId,c.Name AS carrierName,sh.TrackingNumber AS trackingNumber,CONVERT(VARCHAR(33),sh.PickupScheduledAt,126)+'Z' AS pickupScheduledAt,CONVERT(VARCHAR(33),sh.DeliveryConfirmedAt,126)+'Z' AS deliveryConfirmedAt,origin.Name AS originName,origin.Latitude AS originLatitude,origin.Longitude AS originLongitude,dest.Name AS destinationName,dest.Latitude AS destinationLatitude,dest.Longitude AS destinationLongitude,d.BolFileName AS bolFileName,CONVERT(VARCHAR(33),d.BolUploadedAt,126)+'Z' AS bolUploadedAt,d.ReceiverName AS receiverName,d.DeliveryNotes AS deliveryNotes FROM dbo.Shipments sh JOIN dbo.ShipmentStatuses ss ON ss.Id=sh.ShipmentStatusId LEFT JOIN dbo.Carriers c ON c.Id=sh.CarrierId LEFT JOIN dbo.LogisticsShipmentDetails d ON d.ShipmentId=sh.Id LEFT JOIN dbo.Locations origin ON origin.Id=COALESCE(sh.OriginLocationId,l.LocationId) AND origin.CompanyId=o.SellerCompanyId LEFT JOIN dbo.Locations dest ON dest.Id=sh.DestinationLocationId AND dest.CompanyId=o.BuyerCompanyId WHERE sh.OrderId=o.Id ORDER BY sh.Id DESC FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES) AS shipmentJson,
 (SELECT TOP(1) q.Id AS id,q.Status AS status,q.CarrierId AS carrierId,c.Name AS carrierName,q.Amount AS amount,q.CurrencyCode AS currencyCode,CONVERT(VARCHAR(33),q.PickupScheduledAt,126)+'Z' AS pickupScheduledAt,CONVERT(VARCHAR(33),q.EstimatedDeliveryAt,126)+'Z' AS estimatedDeliveryAt,q.Note AS note FROM dbo.LogisticsQuotes q JOIN dbo.Carriers c ON c.Id=q.CarrierId WHERE q.OrderId=o.Id AND q.Status<>'superseded' ORDER BY q.Id DESC FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES) AS quoteJson
 FROM dbo.Orders o JOIN dbo.OrderStatuses os ON os.Id=o.OrderStatusId JOIN dbo.Companies b ON b.Id=o.BuyerCompanyId JOIN dbo.Companies s ON s.Id=o.SellerCompanyId LEFT JOIN dbo.Listings l ON l.Id=o.ListingId WHERE @admin=1 OR o.BuyerCompanyId=@company OR o.SellerCompanyId=@company ORDER BY o.Id DESC`,
    [int("admin", auth.isAdmin ? 1 : 0), int("company", auth.companyId)],
  );
  const carriers = await query(
    `SELECT Id AS id,Code AS code,Name AS name,IsActive AS isActive FROM dbo.Carriers ORDER BY Name`,
  );
  return {
    ok: true,
    orders: orders.map(({ shipmentJson, quoteJson, ...row }) => ({
      ...row,
      shipment:
        typeof shipmentJson === "string" ? JSON.parse(shipmentJson) : null,
      quote: typeof quoteJson === "string" ? JSON.parse(quoteJson) : null,
    })),
    carriers,
  };
}
async function action(
  orderId: number,
  kind: string,
  body: Record<string, unknown>,
  auth: AuthContext,
) {
  await runInTransaction(async (tx) => {
    const params = [int("id", orderId), int("actor", auth.userId)];
    const order = (await txQuery<Order>(tx, orderSelect, params))[0];
    if (!order) throw new ApiError(404, "Order not found.");
    authorizeLogistics(
      auth,
      order,
      kind === "accept" || kind === "confirm" ? "buyer" : "seller",
    );
    const shipments = await txQuery<{ id: number; status: string }>(
      tx,
      `SELECT sh.Id AS id,ss.Code AS status FROM dbo.Shipments sh WITH (UPDLOCK,HOLDLOCK) JOIN dbo.ShipmentStatuses ss ON ss.Id=sh.ShipmentStatusId WHERE sh.OrderId=@id ORDER BY sh.Id DESC`,
      params,
    );
    if (shipments.length > 1)
      throw new ApiError(
        409,
        "Multiple shipments require staff reconciliation before this action.",
      );
    let shipment = shipments[0];
    const q = (
      await txQuery<{
        id: number;
        status: string;
        carrierId: number;
        amount: number;
        pickup: Date;
      }>(
        tx,
        `SELECT TOP(1) Id AS id,Status AS status,CarrierId AS carrierId,Amount AS amount,PickupScheduledAt AS pickup FROM dbo.LogisticsQuotes WHERE OrderId=@id AND Status<>'superseded' ORDER BY Id DESC`,
        params,
      )
    )[0];
    if (kind === "confirm" && shipment?.status === "delivered") return;
    if (kind === "accept" && q?.status === "accepted" && q.id === body.quoteId)
      return;
    if (["cancelled", "completed"].includes(order.status))
      throw new ApiError(409, "This order is closed.");
    if (order.status !== "in_progress")
      throw new ApiError(
        409,
        "The order must be in progress before arranging fulfilment.",
      );
    const blockedEscrow = await txQuery(
      tx,
      `SELECT e.Id FROM dbo.Escrows e JOIN dbo.EscrowStatuses es ON es.Id=e.EscrowStatusId WHERE e.OrderId=@id AND es.Code='dispute_locked'`,
      params,
    );
    if (blockedEscrow.length)
      throw new ApiError(
        409,
        "Resolve the order dispute before changing fulfilment.",
      );
    const pickupOrder = order.shippingTypeCode === "pickup";
    if (pickupOrder && kind !== "confirm")
      throw new ApiError(409, "Pickup orders do not require carrier shipping.");
    if (kind === "confirm" && pickupOrder && !shipment) {
      shipment = (
        await txQuery<{ id: number; status: string }>(
          tx,
          `INSERT INTO dbo.Shipments(OrderId,ShipmentStatusId,CreatedByUserId,UpdatedByUserId) OUTPUT INSERTED.Id AS id,'in_transit' AS status VALUES(@id,(SELECT Id FROM dbo.ShipmentStatuses WHERE Code='in_transit'),@actor,@actor)`,
          params,
        )
      )[0];
    }
    if (kind === "quote") {
      if (
        q?.status === "accepted" ||
        (shipment && shipment.status !== "quote_pending")
      )
        throw new ApiError(409, "Shipping is already scheduled.");
      const carrierId = id(body.carrierId);
      const amount = body.amount;
      if (
        typeof amount !== "number" ||
        !Number.isFinite(amount) ||
        amount < 0 ||
        amount > 10000000 ||
        Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001
      )
        throw new ApiError(400, "Invalid shipping amount.");
      const currency = required(body.currencyCode, "currency", 3).toUpperCase();
      if (currency !== order.currencyCode.trim())
        throw new ApiError(
          400,
          "Shipping quote currency must match the order.",
        );
      const pickup = date(body.pickupScheduledAt, "pickup date");
      if (pickup.getTime() < Date.now())
        throw new ApiError(400, "Pickup must be in the future.");
      const eta = body.estimatedDeliveryAt
        ? date(body.estimatedDeliveryAt, "delivery date")
        : null;
      if (eta && eta < pickup)
        throw new ApiError(400, "Delivery must follow pickup.");
      const active = await txQuery(
        tx,
        "SELECT Id FROM dbo.Carriers WHERE Id=@carrier AND IsActive=1",
        [int("carrier", carrierId)],
      );
      if (!active.length) throw new ApiError(400, "Select an active carrier.");
      await txQuery(
        tx,
        `UPDATE dbo.LogisticsQuotes SET Status='superseded' WHERE OrderId=@id AND Status='offered'; INSERT INTO dbo.LogisticsQuotes(OrderId,CarrierId,Amount,CurrencyCode,PickupScheduledAt,EstimatedDeliveryAt,Note,Status,CreatedByUserId) VALUES(@id,@carrier,@amount,@currency,@pickup,@eta,@note,'offered',@actor);`,
        [
          ...params,
          int("carrier", carrierId),
          { name: "amount", value: amount, type: sql.Decimal(18, 2) },
          text("currency", currency, 3),
          { name: "pickup", value: pickup, type: sql.DateTime2 },
          { name: "eta", value: eta, type: sql.DateTime2 },
          text("note", body.note ? required(body.note, "note") : null),
        ],
      );
    } else if (kind === "accept") {
      if (!q || q.status !== "offered" || q.id !== id(body.quoteId))
        throw new ApiError(409, "The quote changed. Refresh and review it.");
      if (shipment && shipment.status !== "quote_pending")
        throw new ApiError(409, "Shipment already scheduled.");
      if (q.pickup.getTime() < Date.now())
        throw new ApiError(
          409,
          "Pickup time has passed. Request an updated quote.",
        );
      await txQuery(
        tx,
        `UPDATE dbo.LogisticsQuotes SET Status='accepted',AcceptedByUserId=@actor,AcceptedAt=SYSUTCDATETIME() WHERE Id=@quote;
   IF EXISTS(SELECT 1 FROM dbo.Shipments WHERE OrderId=@id) UPDATE dbo.Shipments SET CarrierId=@carrier,ShippingCost=@amount,PickupScheduledAt=@pickup,ShipmentStatusId=(SELECT Id FROM dbo.ShipmentStatuses WHERE Code='scheduled'),UpdatedByUserId=@actor,UpdatedAt=SYSUTCDATETIME() WHERE OrderId=@id;
   ELSE INSERT INTO dbo.Shipments(OrderId,CarrierId,ShippingCost,PickupScheduledAt,ShipmentStatusId,CreatedByUserId,UpdatedByUserId) VALUES(@id,@carrier,@amount,@pickup,(SELECT Id FROM dbo.ShipmentStatuses WHERE Code='scheduled'),@actor,@actor);`,
        [
          ...params,
          int("quote", q.id),
          int("carrier", q.carrierId),
          { name: "amount", value: q.amount, type: sql.Decimal(18, 2) },
          { name: "pickup", value: q.pickup, type: sql.DateTime2 },
        ],
      );
    } else {
      if (!shipment)
        throw new ApiError(409, "Schedule shipping before this action.");
      const sp = [...params, int("shipment", shipment.id)];
      if (kind === "bol") {
        if (shipment.status !== "scheduled")
          throw new ApiError(409, "BOL can only be uploaded before dispatch.");
        const pdf = await validatePdf(body.dataBase64);
        const filename = required(body.fileName, "file name", 240);
        if (
          !filename.toLowerCase().endsWith(".pdf") ||
          body.contentType !== "application/pdf"
        )
          throw new ApiError(400, "Upload a PDF BOL.");
        await txQuery(
          tx,
          `IF NOT EXISTS(SELECT 1 FROM dbo.LogisticsShipmentDetails WHERE ShipmentId=@shipment) INSERT INTO dbo.LogisticsShipmentDetails(ShipmentId) VALUES(@shipment); UPDATE dbo.LogisticsShipmentDetails SET BolFileName=@name,BolContent=@content,BolUploadedAt=SYSUTCDATETIME(),BolUploadedByUserId=@actor WHERE ShipmentId=@shipment;`,
          [
            ...sp,
            text("name", filename, 240),
            { name: "content", value: pdf, type: sql.VarBinary(sql.MAX) },
          ],
        );
      } else if (kind === "dispatch") {
        if (shipment.status === "in_transit") return;
        if (shipment.status !== "scheduled")
          throw new ApiError(
            409,
            "Only scheduled shipments can be dispatched.",
          );
        const bol = await txQuery(
          tx,
          "SELECT ShipmentId FROM dbo.LogisticsShipmentDetails WHERE ShipmentId=@shipment AND BolContent IS NOT NULL",
          sp,
        );
        if (!bol.length)
          throw new ApiError(409, "Upload the BOL before dispatch.");
        await txQuery(
          tx,
          `UPDATE dbo.Shipments SET ShipmentStatusId=(SELECT Id FROM dbo.ShipmentStatuses WHERE Code='in_transit'),TrackingNumber=@tracking,UpdatedByUserId=@actor,UpdatedAt=SYSUTCDATETIME() WHERE Id=@shipment;`,
          [
            ...sp,
            text(
              "tracking",
              body.trackingNumber
                ? required(body.trackingNumber, "tracking number", 160)
                : null,
              160,
            ),
          ],
        );
      } else if (kind === "confirm") {
        if (shipment.status !== "in_transit")
          throw new ApiError(
            409,
            "Only dispatched shipments can be confirmed.",
          );
        if (body.inspectionComplete !== true)
          throw new ApiError(
            400,
            "Confirm inspection before acknowledging receipt.",
          );
        const receiver = required(body.receiverName, "receiver name", 200);
        await txQuery(
          tx,
          `IF NOT EXISTS(SELECT 1 FROM dbo.LogisticsShipmentDetails WHERE ShipmentId=@shipment) INSERT INTO dbo.LogisticsShipmentDetails(ShipmentId) VALUES(@shipment); UPDATE dbo.LogisticsShipmentDetails SET ReceiverName=@receiver,DeliveryNotes=@notes,ConfirmedByUserId=@actor WHERE ShipmentId=@shipment;
     UPDATE dbo.Shipments SET ShipmentStatusId=(SELECT Id FROM dbo.ShipmentStatuses WHERE Code='delivered'),DeliveryConfirmedAt=SYSUTCDATETIME(),UpdatedByUserId=@actor,UpdatedAt=SYSUTCDATETIME() WHERE Id=@shipment;
     UPDATE dbo.Orders SET OrderStatusId=(SELECT Id FROM dbo.OrderStatuses WHERE Code='completed'),UpdatedByUserId=@actor,UpdatedAt=SYSUTCDATETIME() WHERE Id=@id;`,
          [
            ...sp,
            text("receiver", receiver, 200),
            text("notes", body.notes ? required(body.notes, "notes") : null),
          ],
        );
      } else throw new ApiError(404, "Unknown logistics action.");
    }
    await txQuery(
      tx,
      `INSERT INTO dbo.Notifications(CompanyId,RelatedRecordTypeId,RelatedRecordId,NotificationChannelId,NotificationCategoryId,NotificationStatusId,Subject,Body,SentAt,CreatedByUserId,UpdatedByUserId)
      SELECT companyId,(SELECT Id FROM dbo.RecordTypes WHERE Code='order'),@id,(SELECT Id FROM dbo.NotificationChannels WHERE Code='in_app'),(SELECT Id FROM dbo.NotificationCategories WHERE Code='logistics'),(SELECT Id FROM dbo.NotificationStatuses WHERE Code='sent'),@subject,@body,SYSUTCDATETIME(),@actor,@actor
      FROM (SELECT @buyer AS companyId UNION SELECT @seller) parties`,
      [
        ...params,
        int("buyer", order.buyerCompanyId),
        int("seller", order.sellerCompanyId),
        text("subject", `Logistics updated for order #${orderId}`, 240),
        text(
          "body",
          `Saved logistics action: ${kind}. Open the order logistics workspace for details.`,
          4000,
        ),
      ],
    );
    await txQuery(
      tx,
      "INSERT INTO dbo.LogisticsEvents(OrderId,ActorUserId,Action) VALUES(@id,@actor,@action)",
      [...params, text("action", kind, 40)],
    );
  });
}
export async function handleLogisticsRoute(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
) {
  if (!url.pathname.startsWith("/api/logistics/")) return false;
  const auth = await requireSessionAuth(request);
  if (url.pathname === "/api/logistics/workspace" && request.method === "GET") {
    sendJson(response, 200, await workspace(auth));
    return true;
  }
  const match =
    /^\/api\/logistics\/orders\/(\d+)\/(quote|accept|bol|dispatch|confirm)$/.exec(
      url.pathname,
    );
  if (!match) throw new ApiError(404, "Logistics route not found.");
  const orderId = id(Number(match[1]));
  const kind = match[2];
  if (kind === "bol" && request.method === "GET") {
    const order = (
      await query<Order>(orderSelect.replace(" WITH (UPDLOCK,HOLDLOCK)", ""), [
        int("id", orderId),
      ])
    )[0];
    if (!order) throw new ApiError(404, "Order not found.");
    authorizeLogistics(auth, order, "participant");
    const row = (
      await query<{ content: Buffer }>(
        `SELECT TOP(1) d.BolContent AS content FROM dbo.LogisticsShipmentDetails d JOIN dbo.Shipments s ON s.Id=d.ShipmentId WHERE s.OrderId=@id AND d.BolContent IS NOT NULL ORDER BY s.Id DESC`,
        [int("id", orderId)],
      )
    )[0];
    if (!row) throw new ApiError(404, "No BOL uploaded.");
    response.writeHead(200, {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="order-${orderId}-bol.pdf"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    });
    response.end(row.content);
    return true;
  }
  if (request.method !== "POST") throw new ApiError(405, "Method not allowed.");
  await action(
    orderId,
    kind,
    await readJsonBody<Record<string, unknown>>(request),
    auth,
  );
  sendJson(response, 200, { ok: true });
  return true;
}
