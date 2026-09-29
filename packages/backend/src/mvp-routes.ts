import type { IncomingMessage, ServerResponse } from "node:http";
import { requireSessionAuth } from "./auth.js";
import {
  queryRowsWithParams as query,
  queryRowsWithParamsInTransaction as txQuery,
  runInTransaction,
  sql,
  type QueryParameter,
} from "./database.js";
import {
  ApiError,
  readJsonBody,
  sendJson,
  corsHeaders,
  type AuthContext,
} from "./http.js";
import { validatePdf } from "./lab-validation.js";
const int = (name: string, value: unknown): QueryParameter => ({
  name,
  value,
  type: sql.Int,
});
const text = (name: string, value: unknown): QueryParameter => ({
  name,
  value,
  type: sql.NVarChar(sql.MAX),
});
export function boundedText(value: unknown, name: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new ApiError(
      400,
      `${name} is required and must be at most ${max} characters.`,
    );
  return value.trim();
}
function id(value: unknown): number {
  const number =
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof number !== "number" || !Number.isSafeInteger(number) || number < 1)
    throw new ApiError(400, "Invalid record ID.");
  return number;
}
function admin(auth: AuthContext) {
  if (!auth.isAdmin) throw new ApiError(403, "Administrator required.");
}
async function companyAccess(
  auth: AuthContext,
  companyId: number,
  write = false,
) {
  if (!auth.isAdmin && auth.companyId !== companyId)
    throw new ApiError(403, "Company access denied.");
  const rows = await query(
    `SELECT c.Id FROM dbo.Companies c WHERE c.Id=@company AND (@admin=1 OR (c.VerificationStatusId NOT IN (SELECT Id FROM dbo.AccountStatuses WHERE Code IN ('inactive','suspended')) AND EXISTS(
 SELECT 1 FROM dbo.CompanyMembers m JOIN dbo.MemberRoles r ON r.Id=m.MemberRoleId JOIN dbo.AccountStatuses s ON s.Id=m.MemberStatusId
 WHERE m.CompanyId=c.Id AND m.UserId=@user AND s.Code='active' AND (@write=0 OR r.Code IN ('owner','admin') OR m.CanExecuteTransactions=1))))`,
    [
      int("company", companyId),
      int("user", auth.userId),
      int("admin", auth.isAdmin ? 1 : 0),
      int("write", write ? 1 : 0),
    ],
  );
  if (!rows.length)
    throw new ApiError(403, "Active company permission required.");
}
export async function validateCompanyDocument(body: Record<string, unknown>) {
  const fileName = boundedText(body.fileName, "File name", 240);
  if (/[\x00-\x1f\\/]/.test(fileName))
    throw new ApiError(400, "Invalid file name.");
  const contentType = boundedText(body.contentType, "Content type", 100);
  const encoded = boundedText(
    body.contentBase64,
    "File content",
    7 * 1024 * 1024,
  );
  if (encoded.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
    throw new ApiError(400, "Invalid base64 file.");
  const bytes = Buffer.from(encoded, "base64");
  if (
    bytes.length === 0 ||
    bytes.length > 5 * 1024 * 1024 ||
    bytes.toString("base64") !== encoded
  )
    throw new ApiError(400, "File must be between 1 byte and 5 MiB.");
  if (contentType === "application/pdf") await validatePdf(encoded);
  else if (contentType === "image/png") {
    if (
      bytes.length < 24 ||
      !bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      throw new ApiError(400, "Invalid PNG.");
  } else if (contentType === "image/jpeg") {
    if (
      bytes.length < 4 ||
      bytes[0] !== 255 ||
      bytes[1] !== 216 ||
      bytes.at(-2) !== 255 ||
      bytes.at(-1) !== 217
    )
      throw new ApiError(400, "Invalid JPEG.");
  } else throw new ApiError(400, "Upload a PDF, PNG or JPEG.");
  const category = boundedText(
    body.category ?? body.type ?? "general",
    "Category",
    60,
  );
  if (!/^[a-zA-Z0-9 _-]+$/.test(category))
    throw new ApiError(400, "Invalid category.");
  return { fileName, contentType, bytes, category };
}
const selectDocuments = `SELECT d.Id AS id,d.CompanyId AS companyId,d.FileName AS fileName,d.ContentType AS contentType,
 d.Category AS category,CASE WHEN d.Status='pending' THEN 'pending_review' ELSE d.Status END AS status,d.SizeBytes AS sizeBytes,d.CreatedAt AS createdAt,u.Name AS uploadedBy,u.Name AS uploadedByName,c.LegalName AS companyName,
 d.ReviewNote AS reviewNote,d.ReviewedAt AS reviewedAt FROM dbo.CompanyDocuments d JOIN dbo.Users u ON u.Id=d.UploadedByUserId JOIN dbo.Companies c ON c.Id=d.CompanyId`;
const contactWindows = new Map<string, { count: number; until: number }>();
export function validateContact(body: Record<string, unknown>) {
  const name = boundedText(body.name, "Name", 200),
    email = boundedText(body.email, "Email", 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new ApiError(400, "Valid email required.");
  return {
    name,
    email,
    company: body.company ? boundedText(body.company, "Company", 240) : null,
    topic: boundedText(
      body.topic ?? body.subject ?? "General inquiry",
      "Topic",
      120,
    ),
    message: boundedText(body.message, "Message", 4000),
  };
}
export async function handleMvpRoute(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
): Promise<boolean> {
  const path = url.pathname
      .replace(/^\/api\/verification-evidence\//, "/api/documents/")
      .replace(/(\/verification)\/evidence$/, "$1"),
    method = request.method;
  if (path === "/api/contact" && method === "POST") {
    const value = validateContact(await readJsonBody(request));
    const key = `${request.socket.remoteAddress ?? "unknown"}:${value.email}`,
      now = Date.now();
    for (const [address, window] of contactWindows)
      if (window.until < now) contactWindows.delete(address);
    const window = contactWindows.get(key) ?? { count: 0, until: now + 60000 };
    if (window.count >= 5)
      throw new ApiError(429, "Please wait before sending another message.");
    window.count++;
    contactWindows.set(key, window);
    const rows = await query(
      "INSERT dbo.ContactRequests(Name,Email,Company,Topic,Message) OUTPUT INSERTED.Id AS id VALUES(@name,@email,@company,@topic,@message)",
      Object.entries(value).map(([k, v]) => text(k, v)),
    );
    sendJson(response, 202, {
      ok: true,
      id: rows[0]?.id,
      inquiry: { id: rows[0]?.id },
      deliveryStatus: "recorded",
    });
    return true;
  }
  const verification = path.match(/^\/api\/companies\/(\d+)\/verification$/),
    review = path.match(/^\/api\/admin\/verifications\/(\d+)$/),
    document = path.match(/^\/api\/documents\/(\d+)(\/download)?$/);
  if (
    path !== "/api/documents" &&
    !document &&
    !verification &&
    !review &&
    path !== "/api/admin/verifications" &&
    path !== "/api/admin/contact-requests" &&
    path !== "/api/admin/payment-exceptions"
  )
    return false;
  const auth = await requireSessionAuth(request);
  if (path === "/api/admin/payment-exceptions" && method === "GET") {
    admin(auth);
    const status = url.searchParams.get("status") ?? "open";
    if (status !== "open" && status !== "all")
      throw new ApiError(400, "Status must be open or all.");
    const exceptions = await query(
      `SELECT TOP (501) a.Id AS id,a.OrderId AS orderId,a.ProviderSessionId AS providerSessionId,
      a.Reason AS reason,a.CreatedAt AS createdAt,a.ResolvedAt AS resolvedAt,
      b.LegalName AS buyerCompanyName,s.LegalName AS sellerCompanyName,
      o.TotalAmount AS totalAmount,o.CurrencyCode AS currencyCode
      FROM dbo.CheckoutAnomalies a JOIN dbo.Orders o ON o.Id=a.OrderId
      JOIN dbo.Companies b ON b.Id=o.BuyerCompanyId
      JOIN dbo.Companies s ON s.Id=o.SellerCompanyId
      WHERE (@all=1 OR a.ResolvedAt IS NULL) ORDER BY a.Id DESC`,
      [int("all", status === "all" ? 1 : 0)],
    );
    sendJson(response, 200, { ok: true, exceptions: exceptions.slice(0, 500), hasMore: exceptions.length > 500 });
    return true;
  }
  if (path === "/api/admin/contact-requests" && method === "GET") {
    admin(auth);
    sendJson(response, 200, {
      ok: true,
      requests: await query(
        "SELECT TOP (500) Id AS id,Name AS name,Email AS email,Company AS company,Topic AS topic,Message AS message,CreatedAt AS createdAt FROM dbo.ContactRequests ORDER BY Id DESC",
      ),
    });
    return true;
  }
  if (path === "/api/admin/verifications" && method === "GET") {
    admin(auth);
    const verifications =
      await query(`SELECT c.Id AS companyId,c.LegalName AS companyName,s.Code AS status,
  (SELECT COUNT(*) FROM dbo.CompanyDocuments d WHERE d.CompanyId=c.Id AND d.DeletedAt IS NULL AND d.Category LIKE 'verification%') AS documentCount,
  (SELECT MAX(d.CreatedAt) FROM dbo.CompanyDocuments d WHERE d.CompanyId=c.Id AND d.DeletedAt IS NULL) AS submittedAt
  FROM dbo.Companies c JOIN dbo.AccountStatuses s ON s.Id=c.VerificationStatusId WHERE s.Code<>'inactive' ORDER BY c.Id DESC`);
    sendJson(response, 200, { ok: true, verifications });
    return true;
  }
  if (review && method === "PATCH") {
    admin(auth);
    const companyId = id(review[1]),
      body = await readJsonBody(request),
      decision = boundedText(body.decision, "Decision", 30),
      note = boundedText(body.note, "Review note", 2000);
    if (!["approved", "rejected", "needs_information"].includes(decision))
      throw new ApiError(400, "Invalid decision.");
    await companyAccess(auth, companyId, true);
    await runInTransaction(async (tx) => {
      const docs = await txQuery(
        tx,
        "SELECT Id FROM dbo.CompanyDocuments WITH(UPDLOCK,HOLDLOCK) WHERE CompanyId=@company AND DeletedAt IS NULL AND Category LIKE 'verification%' AND Status<>'rejected'",
        [int("company", companyId)],
      );
      if (decision === "approved" && !docs.length)
        throw new ApiError(
          409,
          "Approval requires uploaded verification evidence.",
        );
      await txQuery(
        tx,
        `UPDATE dbo.Companies SET VerificationStatusId=(SELECT Id FROM dbo.AccountStatuses WHERE Code=@status),UpdatedByUserId=@user,UpdatedAt=SYSUTCDATETIME() WHERE Id=@company;
   INSERT dbo.CompanyVerificationReviews(CompanyId,Decision,Note,ReviewedByUserId) VALUES(@company,@decision,@note,@user);
   IF @decision='approved' UPDATE dbo.CompanyDocuments SET Status='approved',ReviewNote=@note,ReviewedByUserId=@user,ReviewedAt=SYSUTCDATETIME() WHERE CompanyId=@company AND DeletedAt IS NULL AND Category LIKE 'verification%' AND Status<>'rejected';`,
        [
          int("company", companyId),
          int("user", auth.userId),
          text(
            "status",
            decision === "approved" ? "verified" : "pending_verification",
          ),
          text("decision", decision),
          text("note", note),
        ],
      );
    });
    sendJson(response, 200, {
      ok: true,
      companyId,
      decision,
      status: decision === "approved" ? "verified" : "pending_verification",
    });
    return true;
  }
  if (document) {
    const documentId = id(document[1]);
    const row = (
      await query<{
        companyId: number;
        fileName: string;
        contentType: string;
        content: Buffer;
      }>(
        "SELECT CompanyId AS companyId,FileName AS fileName,ContentType AS contentType,Content AS content FROM dbo.CompanyDocuments WHERE Id=@id AND DeletedAt IS NULL",
        [int("id", documentId)],
      )
    )[0];
    if (!row) throw new ApiError(404, "Document not found.");
    await companyAccess(auth, row.companyId, method !== "GET");
    if (document[2] && method === "GET") {
      response.writeHead(200, {
        ...corsHeaders(),
        "content-type": row.contentType,
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.fileName)}`,
        "content-length": row.content.length,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      });
      response.end(row.content);
      return true;
    }
    if (!document[2] && method === "DELETE") {
      await runInTransaction(async (tx) => {
        const protectedEvidence = await txQuery(
          tx,
          "SELECT d.Id FROM dbo.CompanyDocuments d WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Companies c ON c.Id=d.CompanyId JOIN dbo.AccountStatuses s ON s.Id=c.VerificationStatusId WHERE d.Id=@id AND d.Category LIKE 'verification%' AND s.Code='verified'",
          [int("id", documentId)],
        );
        if (protectedEvidence.length)
          throw new ApiError(
            409,
            "Verification evidence is retained while the company is verified. Request an administrator review first.",
          );
        await txQuery(
          tx,
          "UPDATE dbo.CompanyDocuments SET DeletedAt=SYSUTCDATETIME() WHERE Id=@id",
          [int("id", documentId)],
        );
      });
      sendJson(response, 200, { ok: true });
      return true;
    }
    if (!document[2] && method === "PATCH") {
      admin(auth);
      const body = await readJsonBody(request),
        status = boundedText(body.status, "Status", 30),
        note = boundedText(body.note, "Review note", 2000);
      if (!["approved", "rejected"].includes(status))
        throw new ApiError(400, "Invalid document decision.");
      await query(
        "UPDATE dbo.CompanyDocuments SET Status=@status,ReviewNote=@note,ReviewedByUserId=@user,ReviewedAt=SYSUTCDATETIME() WHERE Id=@id",
        [
          int("id", documentId),
          text("status", status),
          text("note", note),
          int("user", auth.userId),
        ],
      );
      sendJson(response, 200, {
        ok: true,
        document: (
          await query(`${selectDocuments} WHERE d.Id=@id`, [
            int("id", documentId),
          ])
        )[0],
      });
      return true;
    }
    throw new ApiError(405, "Method not allowed.");
  }
  if (
    path === "/api/documents" &&
    method === "GET" &&
    auth.isAdmin &&
    !url.searchParams.get("companyId")
  ) {
    sendJson(response, 200, {
      ok: true,
      documents: await query(
        `${selectDocuments} WHERE d.DeletedAt IS NULL ORDER BY d.Id DESC`,
      ),
    });
    return true;
  }
  if (path === "/api/documents" || verification) {
    const body = method === "POST" ? await readJsonBody(request) : {};
    const companyId = id(
      verification?.[1] ??
        body.companyId ??
        url.searchParams.get("companyId") ??
        auth.companyId,
    );
    await companyAccess(auth, companyId, method === "POST");
    if (method === "GET") {
      const documents = await query(
        `${selectDocuments} WHERE d.CompanyId=@company AND d.DeletedAt IS NULL ${verification ? "AND d.Category LIKE 'verification%'" : ""} ORDER BY d.Id DESC`,
        [int("company", companyId)],
      );
      const status = verification
        ? (
            await query<{ status: string }>(
              "SELECT s.Code AS status FROM dbo.Companies c JOIN dbo.AccountStatuses s ON s.Id=c.VerificationStatusId WHERE c.Id=@company",
              [int("company", companyId)],
            )
          )[0]?.status
        : undefined;
      sendJson(response, 200, {
        ok: true,
        documents,
        status,
        ...(verification
          ? {
              verification: {
                companyId,
                verificationStatusCode: status,
                verificationStatusName:
                  status === "verified" ? "Verified" : "Pending verification",
                evidence: documents.map((d) => ({
                  ...d,
                  evidenceType: String(d.category).replace(
                    /^verification_/,
                    "",
                  ),
                })),
              },
            }
          : {}),
      });
      return true;
    }
    if (method === "POST") {
      const value = await validateCompanyDocument({
        ...body,
        ...(verification
          ? {
              category: `verification_${String(body.evidenceType ?? body.type ?? "business").replace(/^verification_/, "")}`,
            }
          : {}),
      });
      const rows = await query(
        `INSERT dbo.CompanyDocuments(CompanyId,FileName,ContentType,Content,Category,SizeBytes,UploadedByUserId)
    OUTPUT INSERTED.Id AS id VALUES(@company,@file,@mime,@content,@category,@size,@user)`,
        [
          int("company", companyId),
          text("file", value.fileName),
          text("mime", value.contentType),
          { name: "content", type: sql.VarBinary(sql.MAX), value: value.bytes },
          text("category", value.category),
          int("size", value.bytes.length),
          int("user", auth.userId),
        ],
      );
      const saved = (
        await query(`${selectDocuments} WHERE d.Id=@id`, [
          int("id", rows[0]?.id),
        ])
      )[0];
      sendJson(response, 201, { ok: true, document: saved, evidence: saved });
      return true;
    }
  }
  throw new ApiError(405, "Method not allowed.");
}
