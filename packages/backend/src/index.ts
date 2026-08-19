import { createServer } from "node:http";
import { handleApiRoute } from "./api.js";
import { handleAuthRoute } from "./auth-routes.js";
import { handleDocusignRoute } from "./docusign-routes.js";
import { getDatabaseHealth, getSchemaTables } from "./database.js";
import { ApiError, corsHeaders, sendHtml, sendJson } from "./http.js";

const port = Number(process.env.PORT ?? 4050);
const host = process.env.HOST ?? "127.0.0.1";

const endpointGroups = [
  {
    title: "Health and schema",
    endpoints: [
      {
        method: "GET",
        path: "/health",
        auth: "Public",
        description: "Backend and Azure SQL health check.",
      },
      {
        method: "GET",
        path: "/schema/tables",
        auth: "Public",
        description: "Current database table inventory and row counts.",
      },
      {
        method: "GET",
        path: "/api/endpoints",
        auth: "Public",
        description: "Browser-friendly endpoint directory.",
      },
      {
        method: "GET",
        path: "/api/endpoints.json",
        auth: "Public",
        description: "Machine-readable endpoint directory.",
      },
    ],
  },
  {
    title: "Authentication",
    endpoints: [
      {
        method: "POST",
        path: "/auth/register",
        auth: "Public",
        description: "Create a password-backed user.",
      },
      {
        method: "POST",
        path: "/auth/verify-email",
        auth: "Public",
        description: "Consume a single-use email verification link.",
      },
      {
        method: "POST",
        path: "/auth/resend-verification",
        auth: "Public",
        description:
          "Resend a verification link without revealing account existence.",
      },
      {
        method: "POST",
        path: "/auth/request-password-reset",
        auth: "Public",
        description:
          "Send password reset instructions without revealing account existence.",
      },
      {
        method: "POST",
        path: "/auth/reset-password",
        auth: "Public",
        description: "Consume a single-use password reset link.",
      },
      {
        method: "POST",
        path: "/auth/login",
        auth: "Public",
        description: "Create a bearer session.",
      },
      {
        method: "GET",
        path: "/auth/session",
        auth: "Bearer",
        description: "Read the current bearer session.",
      },
      {
        method: "POST",
        path: "/auth/logout",
        auth: "Bearer",
        description: "Revoke the current bearer session.",
      },
      {
        method: "POST",
        path: "/auth/dev/seed-demo-users",
        auth: "Dev only",
        description: "Seed demo buyer, seller, and admin users.",
      },
      {
        method: "GET",
        path: "/auth/dev/browser-test",
        auth: "Dev only",
        description: "Browser-visible backend auth smoke test.",
      },
      {
        method: "POST",
        path: "/auth/dev/email-test",
        auth: "Dev only",
        description: "Send a Resend integration email (local/test only).",
      },
    ],
  },
  {
    title: "Core marketplace",
    endpoints: [
      {
        method: "GET",
        path: "/api/lookups",
        auth: "Public",
        description: "Active lookup/status/type values.",
      },
      {
        method: "GET/POST",
        path: "/api/users",
        auth: "Mixed",
        description: "List or create users.",
      },
      {
        method: "PATCH/DELETE",
        path: "/api/users/:id",
        auth: "Bearer",
        description: "Update or deactivate users.",
      },
      {
        method: "GET/POST",
        path: "/api/companies",
        auth: "Mixed",
        description: "List or create companies.",
      },
      {
        method: "PATCH/DELETE",
        path: "/api/companies/:id",
        auth: "Bearer",
        description: "Update or deactivate companies.",
      },
      {
        method: "GET/POST",
        path: "/api/companies/:id/members",
        auth: "Bearer",
        description: "List or add company members.",
      },
      {
        method: "DELETE",
        path: "/api/company-members/:id",
        auth: "Bearer",
        description: "Deactivate a company member.",
      },
      {
        method: "GET/POST",
        path: "/api/locations",
        auth: "Mixed",
        description: "List or create locations.",
      },
      {
        method: "GET/POST",
        path: "/api/companies/:id/locations",
        auth: "Bearer",
        description: "List or create company locations.",
      },
      {
        method: "PATCH/DELETE",
        path: "/api/locations/:id",
        auth: "Bearer",
        description: "Update or delete a location.",
      },
      {
        method: "GET/POST",
        path: "/api/listings",
        auth: "Mixed",
        description: "List or create feedstock/product listings.",
      },
      {
        method: "PATCH/DELETE",
        path: "/api/listings/:id",
        auth: "Bearer",
        description: "Update or close listings.",
      },
      {
        method: "GET/POST",
        path: "/api/listing-documents",
        auth: "Mixed",
        description: "List or create listing documents.",
      },
      {
        method: "PATCH/DELETE",
        path: "/api/listing-documents/:id",
        auth: "Bearer",
        description: "Update or delete listing documents.",
      },
      {
        method: "GET",
        path: "/api/buyer-profiles",
        auth: "Bearer",
        description:
          "List buyer onboarding, billing, subscription, and approval readiness.",
      },
      {
        method: "PATCH",
        path: "/api/buyer-profiles/:id",
        auth: "Bearer",
        description: "Update buyer profile readiness/status fields.",
      },
      {
        method: "GET",
        path: "/api/seller-profiles",
        auth: "Bearer",
        description:
          "List seller onboarding, payout, subscription, and approval readiness.",
      },
      {
        method: "PATCH",
        path: "/api/seller-profiles/:id",
        auth: "Bearer",
        description: "Update seller profile readiness/status fields.",
      },
    ],
  },
  {
    title: "Phase 1 transactions",
    endpoints: [
      {
        method: "POST",
        path: "/api/onboarding",
        auth: "Bearer",
        description: "Complete buyer, seller, or both onboarding.",
      },
      {
        method: "POST",
        path: "/api/stripe/onboarding",
        auth: "Bearer",
        description: "Start buyer billing or seller payout onboarding.",
      },
      {
        method: "GET/POST",
        path: "/api/quotes",
        auth: "Mixed",
        description: "List or create quotes.",
      },
      {
        method: "PATCH",
        path: "/api/quotes/:id",
        auth: "Bearer",
        description: "Update quote terms or status.",
      },
      {
        method: "GET/POST",
        path: "/api/orders",
        auth: "Mixed",
        description: "List or create orders, including admin direct orders.",
      },
      {
        method: "PATCH",
        path: "/api/orders/:id",
        auth: "Bearer",
        description: "Update order status, total, or escrow flag.",
      },
      {
        method: "GET/POST",
        path: "/api/notifications",
        auth: "Mixed",
        description: "List or create notifications.",
      },
      {
        method: "PATCH",
        path: "/api/notifications/:id",
        auth: "Bearer",
        description: "Update notification status/read fields.",
      },
      {
        method: "GET/POST",
        path: "/api/notification-preferences",
        auth: "Mixed",
        description: "List or create notification preferences.",
      },
      {
        method: "PATCH/DELETE",
        path: "/api/notification-preferences/:id",
        auth: "Bearer",
        description: "Update or delete notification preferences.",
      },
      {
        method: "GET",
        path: "/api/audit-logs",
        auth: "Admin bearer",
        description: "Admin-only audit log list and export trigger.",
      },
    ],
  },
  {
    title: "Phase 2 settlement and logistics",
    endpoints: [
      {
        method: "GET/POST",
        path: "/api/carriers",
        auth: "Mixed",
        description:
          "List carrier integrations or create admin-managed carrier records.",
      },
      {
        method: "PATCH/DELETE",
        path: "/api/carriers/:id",
        auth: "Admin bearer",
        description: "Update or deactivate carrier integrations.",
      },
      {
        method: "GET/POST",
        path: "/api/shipments",
        auth: "Mixed",
        description:
          "List or create shipment records with carrier, route, cost, and carbon fields.",
      },
      {
        method: "PATCH",
        path: "/api/shipments/:id",
        auth: "Bearer",
        description:
          "Update shipment tracking, status, delivery confirmation, or carbon data.",
      },
      {
        method: "GET/POST",
        path: "/api/escrows",
        auth: "Mixed",
        description:
          "List or create escrow records tied to orders and release rules.",
      },
      {
        method: "PATCH",
        path: "/api/escrows/:id",
        auth: "Bearer",
        description:
          "Update escrow provider references, status, release rules, or dispute lock.",
      },
      {
        method: "GET/POST",
        path: "/api/payments",
        auth: "Mixed",
        description: "List or create buyer funding/payment events.",
      },
      {
        method: "PATCH",
        path: "/api/payments/:id",
        auth: "Bearer",
        description: "Update payment status, amount, or provider reference.",
      },
      {
        method: "GET/POST",
        path: "/api/payouts",
        auth: "Mixed",
        description: "List or create seller payout events.",
      },
      {
        method: "PATCH",
        path: "/api/payouts/:id",
        auth: "Bearer",
        description: "Update payout status, amount, or provider reference.",
      },
      {
        method: "GET/POST",
        path: "/api/disputes",
        auth: "Mixed",
        description: "List or open transaction, escrow, or shipment disputes.",
      },
      {
        method: "PATCH",
        path: "/api/disputes/:id",
        auth: "Bearer",
        description: "Update dispute status, summary, or resolution notes.",
      },
    ],
  },
  {
    title: "Phase 3 contracts and signatures",
    endpoints: [
      {
        method: "GET/POST",
        path: "/api/contracts",
        auth: "Mixed",
        description:
          "List or create platform listing contracts and custom off-platform contracts.",
      },
      {
        method: "PATCH",
        path: "/api/contracts/:id",
        auth: "Bearer",
        description:
          "Update contract status, renewal terms, renewal date, or signed document URL.",
      },
      {
        method: "GET/POST",
        path: "/api/signatures",
        auth: "Mixed",
        description: "List or create electronic-signature signer records.",
      },
      {
        method: "PATCH",
        path: "/api/signatures/:id",
        auth: "Bearer",
        description:
          "Update signature provider status, signed document URL, or signed timestamp.",
      },
      {
        method: "GET",
        path: "/api/docusign/status",
        auth: "Admin bearer",
        description: "Check DocuSign and immutable document-storage configuration.",
      },
      {
        method: "POST",
        path: "/api/contracts/:id/docusign-envelope",
        auth: "Bearer",
        description: "Create and send a DocuSign envelope for the contract's buyer and seller signers.",
      },
      {
        method: "POST",
        path: "/api/signatures/:id/docusign-view",
        auth: "Bearer",
        description: "Create a short-lived embedded DocuSign signing URL for the assigned signer.",
      },
      {
        method: "POST",
        path: "/api/docusign/envelopes/:id/sync",
        auth: "Bearer",
        description: "Reconcile envelope and recipient statuses from DocuSign.",
      },
      {
        method: "POST",
        path: "/api/docusign/webhook",
        auth: "DocuSign HMAC",
        description: "Receive idempotent DocuSign Connect events and archive completed documents.",
      },
      {
        method: "GET",
        path: "/api/contracts/:id/docusign-documents/:kind",
        auth: "Bearer",
        description: "Stream an authorized archived agreement or completion certificate.",
      },
    ],
  },
];

function openApiDocument(origin: string) {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const group of endpointGroups) {
    for (const endpoint of group.endpoints) {
      const path = endpoint.path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
      const methods = endpoint.method.toLowerCase().split("/");

      paths[path] ??= {};

      for (const method of methods) {
        const requiresBearer =
          endpoint.auth !== "Public" &&
          endpoint.auth !== "Dev only" &&
          (endpoint.auth !== "Mixed" || method !== "get");

        paths[path][method] = {
          tags: [group.title],
          summary: endpoint.description,
          security: requiresBearer ? [{ bearerAuth: [] }] : [],
          parameters: path.includes("{id}")
            ? [
                {
                  name: "id",
                  in: "path",
                  required: true,
                  schema: { type: "integer", minimum: 1 },
                },
              ]
            : undefined,
          requestBody:
            method === "post" || method === "patch"
              ? {
                  required: method === "post",
                  content: {
                    "application/json": {
                      schema: { type: "object", additionalProperties: true },
                      examples: requestExamples[path]?.[method],
                    },
                  },
                }
              : undefined,
          responses: {
            "200": {
              description: "Successful response.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiResponse" },
                },
              },
            },
            "201": {
              description: "Created response.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiResponse" },
                },
              },
            },
            "400": { description: "Invalid request." },
            "401": { description: "Missing or invalid bearer token." },
            "403": { description: "Forbidden." },
            "404": { description: "Not found." },
          },
        };
      }
    }
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "EcoGlobe Backend API",
      version: "0.1.0",
      description:
        "Local dev/demo API contract for EcoGlobe auth, marketplace, onboarding profiles, transactions, logistics, escrow, payments, contracts, notifications, disputes, and audit logs.",
    },
    servers: [{ url: origin }],
    tags: endpointGroups.map((group) => ({ name: group.title })),
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "opaque dev session token",
        },
      },
      schemas: {
        ApiResponse: {
          type: "object",
          properties: {
            ok: { type: "boolean" },
          },
          additionalProperties: true,
        },
      },
    },
  };
}

const requestExamples: Record<string, Record<string, unknown>> = {
  "/auth/login": {
    post: {
      seller: {
        summary: "Seller login",
        value: {
          email: "demo.seller@ecoglobe.com",
          password: "<set ECOGLOBE_DEMO_PASSWORD>",
          role: "seller",
        },
      },
      buyer: {
        summary: "Buyer login",
        value: {
          email: "demo.buyer@ecoglobe.com",
          password: "<set ECOGLOBE_DEMO_PASSWORD>",
          role: "buyer",
        },
      },
      admin: {
        summary: "Admin login",
        value: {
          email: "demo.admin@ecoglobe.com",
          password: "<set ECOGLOBE_DEMO_PASSWORD>",
          role: "admin",
        },
      },
    },
  },
  "/api/listings": {
    post: {
      default: {
        summary: "Create listing",
        value: {
          sellerCompanyId: 3,
          locationId: 9,
          title: "Recovered industrial byproduct",
          materialTypeCode: "industrial_byproduct",
          quantity: 2500,
          quantityUnit: "tons",
          minimumOrderQuantity: 200,
          pricePerUnit: 52,
          listingStatusCode: "published",
          description: "Demo listing for marketplace testing.",
        },
      },
    },
  },
  "/api/quotes": {
    post: {
      default: {
        summary: "Create quote",
        value: {
          listingId: 2,
          buyerCompanyId: 2,
          quantity: 25,
          unitPrice: 52,
          quoteStatusCode: "sent",
          deliveryTerms: "Delivered to buyer facility.",
        },
      },
    },
  },
  "/api/orders": {
    post: {
      quoteOrder: {
        summary: "Create order from accepted quote",
        value: {
          quoteId: 1,
          buyerCompanyId: 2,
        },
      },
      adminDirect: {
        summary: "Create admin direct order",
        value: {
          listingId: 2,
          buyerCompanyId: 2,
          sellerCompanyId: 3,
          creationSourceCode: "admin_direct",
          totalAmount: 950,
          directOrderReason: "Admin-created demo order.",
        },
      },
    },
  },
  "/api/notifications": {
    post: {
      default: {
        summary: "Create in-app notification",
        value: {
          userId: 2,
          companyId: 2,
          relatedRecordTypeCode: "order",
          relatedRecordId: 1,
          notificationCategoryCode: "orders",
          subject: "Order created",
          body: "Your order is now active.",
        },
      },
    },
  },
  "/api/notification-preferences": {
    post: {
      default: {
        summary: "Create notification preference",
        value: {
          userId: 2,
          notificationChannelCode: "in_app",
          notificationCategoryCode: "orders",
          enabled: true,
        },
      },
    },
  },
  "/api/buyer-profiles/{id}": {
    patch: {
      default: {
        summary: "Update buyer readiness",
        value: {
          billingStatusCode: "active",
          approvalStatusCode: "verified",
        },
      },
    },
  },
  "/api/seller-profiles/{id}": {
    patch: {
      default: {
        summary: "Update seller readiness",
        value: {
          payoutStatusCode: "enabled",
          approvalStatusCode: "verified",
        },
      },
    },
  },
  "/api/carriers": {
    post: {
      default: {
        summary: "Create carrier integration",
        value: {
          name: "Delta Bulk Network",
          code: "delta_bulk_network",
          description: "Regional bulk freight and port drayage carrier.",
          isActive: true,
          sortOrder: 50,
        },
      },
    },
  },
  "/api/shipments": {
    post: {
      default: {
        summary: "Create shipment",
        value: {
          orderId: 1,
          carrierCode: "ecofreight",
          trackingNumber: "ECO-7A92-50021",
          shipmentStatusCode: "scheduled",
          shippingCost: 1840,
          carbonImpactKgCo2e: 420,
        },
      },
    },
  },
  "/api/escrows": {
    post: {
      default: {
        summary: "Create escrow",
        value: {
          orderId: 1,
          escrowProviderCode: "demo_escrow",
          escrowStatusCode: "funding_required",
          thresholdAmount: 1000,
          releaseRuleCode: "delivery_confirmation",
        },
      },
    },
  },
  "/api/payments": {
    post: {
      default: {
        summary: "Create buyer payment",
        value: {
          orderId: 1,
          payerCompanyId: 2,
          paymentTypeCode: "buyer_funding",
          paymentStatusCode: "pending",
        },
      },
    },
  },
  "/api/payouts": {
    post: {
      default: {
        summary: "Create seller payout",
        value: {
          orderId: 1,
          payoutStatusCode: "pending",
        },
      },
    },
  },
  "/api/contracts": {
    post: {
      default: {
        summary: "Create recurring supply contract",
        value: {
          buyerCompanyId: 2,
          sellerCompanyId: 3,
          listingId: 2,
          title: "Recurring bulk feedstock supply",
          contractSourceCode: "platform_listing",
          contractStatusCode: "draft",
          renewalTerms:
            "Renews monthly unless either party gives 30 days notice.",
          renewalDate: "2027-05-15",
        },
      },
    },
  },
  "/api/signatures": {
    post: {
      default: {
        summary: "Create signature request",
        value: {
          contractId: 1,
          signerUserId: 2,
          signerCompanyId: 2,
          signatureStatusCode: "sent",
        },
      },
    },
  },
  "/api/disputes": {
    post: {
      default: {
        summary: "Open dispute",
        value: {
          orderId: 1,
          issueTypeCode: "quality",
          disputeStatusCode: "open",
          summary: "Buyer reported material quality variance after delivery.",
        },
      },
    },
  },
};

function endpointsHtml() {
  const groups = endpointGroups
    .map(
      (group) => `
        <section>
          <h2>${group.title}</h2>
          <table>
            <thead>
              <tr><th>Method</th><th>Path</th><th>Auth</th><th>Description</th></tr>
            </thead>
            <tbody>
              ${group.endpoints
                .map(
                  (endpoint) => `
                    <tr>
                      <td><span class="method">${endpoint.method}</span></td>
                      <td><code>${endpoint.path}</code></td>
                      <td>${endpoint.auth}</td>
                      <td>${endpoint.description}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </section>
      `,
    )
    .join("");

  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>EcoGlobe Backend Endpoints</title>
        <style>
          body { margin: 0; background: #f6f6f3; color: #111; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
          main { max-width: 1120px; margin: 0 auto; padding: 40px 20px 64px; }
          h1 { margin: 0; font-size: clamp(32px, 5vw, 56px); letter-spacing: -0.05em; }
          .lede { max-width: 760px; color: #555; font-size: 16px; line-height: 1.6; }
          section { margin-top: 28px; overflow: hidden; border: 1px solid #ddd; border-radius: 18px; background: white; box-shadow: 0 18px 40px rgba(0,0,0,0.04); }
          h2 { margin: 0; padding: 18px 20px; border-bottom: 1px solid #eee; font-size: 18px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 14px 20px; border-bottom: 1px solid #f0f0f0; text-align: left; vertical-align: top; font-size: 14px; }
          th { color: #777; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
          tr:last-child td { border-bottom: 0; }
          code { border-radius: 8px; background: #f4f4f4; padding: 4px 7px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
          .method { display: inline-flex; border-radius: 999px; background: #111; color: white; padding: 4px 9px; font-size: 12px; font-weight: 700; }
          .links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
          .links a { color: #111; border: 1px solid #ccc; border-radius: 999px; padding: 9px 13px; text-decoration: none; font-weight: 700; font-size: 13px; background: white; }
          @media (max-width: 760px) {
            table, thead, tbody, tr, th, td { display: block; }
            thead { display: none; }
            tr { border-bottom: 1px solid #eee; padding: 10px 0; }
            td { border: 0; padding: 6px 16px; }
          }
        </style>
      </head>
      <body>
        <main>
          <h1>EcoGlobe Backend Endpoints</h1>
          <p class="lede">This is the local dev/demo API directory. Protected routes require an <code>Authorization: Bearer &lt;token&gt;</code> header from <code>/auth/login</code>.</p>
          <div class="links">
            <a href="/health">Open health check</a>
            <a href="/schema/tables">Open schema tables</a>
            <a href="/api/lookups">Open lookups</a>
            <a href="/api/endpoints.json">Open JSON endpoint list</a>
            <a href="/auth/dev/browser-test">Open browser smoke test</a>
          </div>
          ${groups}
        </main>
      </body>
    </html>`;
}

function swaggerHtml() {
  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>EcoGlobe Swagger Docs</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
        <style>
          body { margin: 0; background: #f6f6f3; }
          .topbar { display: none; }
          .swagger-ui .scheme-container { box-shadow: none; border-bottom: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script>
          window.ui = SwaggerUIBundle({
            url: "/api/openapi.json",
            dom_id: "#swagger-ui",
            deepLinking: true,
            persistAuthorization: true,
            displayRequestDuration: true,
            tryItOutEnabled: true
          });
        </script>
      </body>
    </html>`;
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders());
      response.end();
      return;
    }

    const requestUrl = new URL(
      request.url ?? "/",
      `http://${request.headers.host ?? host}`,
    );

    if (request.method === "GET" && requestUrl.pathname === "/api/endpoints") {
      sendHtml(response, 200, endpointsHtml());
      return;
    }

    if (
      request.method === "GET" &&
      requestUrl.pathname === "/api/endpoints.json"
    ) {
      sendJson(response, 200, { ok: true, endpointGroups });
      return;
    }

    if (
      request.method === "GET" &&
      requestUrl.pathname === "/api/openapi.json"
    ) {
      sendJson(response, 200, openApiDocument(requestUrl.origin));
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/docs") {
      sendHtml(response, 200, swaggerHtml());
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/health") {
      const database = await getDatabaseHealth();
      const healthy =
        database.connected ||
        (process.env.NODE_ENV !== "production" && !database.configured);

      sendJson(
        response,
        healthy ? 200 : 503,
        {
          ok: healthy,
          service: "eco-globe-backend",
          database,
        },
      );
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/schema/tables") {
      const database = await getDatabaseHealth();

      if (!database.connected) {
        sendJson(response, 503, {
          ok: false,
          error: database.configured
            ? "Azure SQL is configured but not reachable."
            : "Azure SQL connection string is not configured.",
          database,
        });
        return;
      }

      const tables = await getSchemaTables();

      sendJson(response, 200, {
        ok: true,
        count: tables.length,
        tables,
      });
      return;
    }

    const authHandled = await handleAuthRoute(request, response, requestUrl);

    if (authHandled) {
      return;
    }

    const docusignHandled = await handleDocusignRoute(request, response, requestUrl);

    if (docusignHandled) {
      return;
    }

    const handled = await handleApiRoute(request, response, requestUrl);

    if (handled) {
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;

    sendJson(response, status, {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unexpected backend error.",
    });
  }
});

server.listen(port, host, () => {
  console.log(`EcoGlobe backend API listening on http://${host}:${port}`);
});
