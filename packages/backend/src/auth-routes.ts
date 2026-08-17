import type { IncomingMessage, ServerResponse } from "node:http";
import {
  createPasswordUser,
  getBearerToken,
  getSessionFromToken,
  loginWithPassword,
  revokeSession,
  seedDemoAuthAccounts,
} from "./auth.js";
import {
  ApiError,
  getOptionalString,
  getRequiredString,
  readJsonBody,
  sendHtml,
  sendJson,
} from "./http.js";

type RegisterBody = {
  name: string;
  email: string;
  password: string;
  accountStatusCode?: string;
};

type LoginBody = {
  email: string;
  password: string;
  role?: string;
};

function requireMethod(actual: string | undefined, expected: string) {
  if (actual !== expected) {
    throw new ApiError(405, "Method not allowed.");
  }
}

function browserTestPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>EcoGlobe Backend Auth/API Browser Test</title>
  <style>
    body { margin: 0; background: #f5f5f2; color: #111; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 980px; margin: 40px auto; padding: 0 20px; }
    h1 { margin: 0 0 8px; font-size: 34px; letter-spacing: -0.04em; }
    p { color: #555; }
    .card { background: #fff; border: 1px solid #ddd; border-radius: 18px; padding: 22px; box-shadow: 0 10px 30px rgba(0,0,0,.06); }
    .row { display: grid; grid-template-columns: 220px 110px 1fr; gap: 12px; align-items: start; padding: 12px 0; border-bottom: 1px solid #eee; }
    .row:last-child { border-bottom: 0; }
    .status { width: fit-content; border-radius: 999px; padding: 5px 10px; font-size: 12px; font-weight: 800; }
    .pass { background: #e7f7ed; color: #087333; }
    .fail { background: #feecec; color: #b00020; }
    .pending { background: #fff4cc; color: #7a5400; }
    code { background: #f0f0ee; padding: 2px 5px; border-radius: 5px; }
    pre { margin: 0; white-space: pre-wrap; font-size: 12px; color: #333; }
  </style>
</head>
<body>
  <main>
    <h1>EcoGlobe Backend Auth/API Browser Test</h1>
    <p>Testing the local backend from this preview browser against the live Azure SQL-backed API.</p>
    <div class="card" id="results"></div>
  </main>
  <script>
    const tests = [
      'Health connects to Azure SQL',
      'Schema endpoint returns 52 tables',
      'Demo users seed successfully',
      'Seller login returns bearer token',
      'Bearer session lookup returns seller role',
      'Protected write rejects without token',
      'Authenticated company create works',
      'Authenticated company delete works',
      'Logout revokes token'
    ];
    const results = document.getElementById('results');
    const state = new Map(tests.map((name) => [name, { status: 'pending', detail: 'Waiting...' }]));
    function render() {
      results.innerHTML = tests.map((name) => {
        const item = state.get(name);
        return '<div class="row"><strong>' + name + '</strong><span class="status ' + item.status + '">' + item.status.toUpperCase() + '</span><pre>' + item.detail + '</pre></div>';
      }).join('');
    }
    function setResult(name, status, detail) { state.set(name, { status, detail }); render(); }
    async function call(path, options = {}) {
      const res = await fetch(path, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
      const text = await res.text();
      let body;
      try { body = JSON.parse(text); } catch { body = text; }
      return { res, body, text };
    }
    async function expectOk(name, path, options, predicate) {
      const { res, body, text } = await call(path, options);
      if (!res.ok) throw new Error(text);
      if (predicate && !predicate(body)) throw new Error(JSON.stringify(body));
      setResult(name, 'pass', JSON.stringify(body, null, 2).slice(0, 900));
      return body;
    }
    (async () => {
      render();
      try {
        const demoPassword = window.prompt('Enter the local ECOGLOBE_DEMO_PASSWORD value.');
        if (!demoPassword) throw new Error('A demo password is required to run this local-only smoke test.');
        await expectOk('Health connects to Azure SQL', '/health', {}, (body) => body.ok && body.database && body.database.connected === true);
        await expectOk('Schema endpoint returns 52 tables', '/schema/tables', {}, (body) => body.ok && body.count === 52);
        await expectOk('Demo users seed successfully', '/auth/dev/seed-demo-users', { method: 'POST' }, (body) => body.ok);
        const login = await expectOk('Seller login returns bearer token', '/auth/login', { method: 'POST', body: JSON.stringify({ email: 'demo.seller@ecoglobe.com', password: demoPassword, role: 'seller' }) }, (body) => body.ok && Boolean(body.token));
        const token = login.token;
        await expectOk('Bearer session lookup returns seller role', '/auth/session', { headers: { authorization: 'Bearer ' + token } }, (body) => body.ok && body.user && body.user.activeRoleCode === 'seller');
        const noToken = await call('/api/companies', { method: 'POST', body: JSON.stringify({ legalName: 'Browser Should Fail', companyTypeCode: 'seller' }) });
        if (noToken.res.status !== 401) throw new Error('Expected 401, got ' + noToken.res.status + ': ' + noToken.text);
        setResult('Protected write rejects without token', 'pass', 'Status 401 as expected');
        const created = await expectOk('Authenticated company create works', '/api/companies', { method: 'POST', headers: { authorization: 'Bearer ' + token }, body: JSON.stringify({ legalName: 'Browser Auth Smoke ' + Date.now(), companyTypeCode: 'seller', verificationStatusCode: 'pending_verification' }) }, (body) => body.ok && body.company && body.company.id);
        await expectOk('Authenticated company delete works', '/api/companies/' + created.company.id, { method: 'DELETE', headers: { authorization: 'Bearer ' + token } }, (body) => body.ok);
        await expectOk('Logout revokes token', '/auth/logout', { method: 'POST', headers: { authorization: 'Bearer ' + token } }, (body) => body.ok);
        const revoked = await call('/auth/session', { headers: { authorization: 'Bearer ' + token } });
        if (revoked.res.status !== 401) throw new Error('Expected revoked token to return 401, got ' + revoked.res.status);
        setResult('Logout revokes token', 'pass', 'Logout returned ok and revoked token now returns 401');
      } catch (error) {
        const pending = tests.find((name) => state.get(name).status === 'pending');
        setResult(pending || tests[0], 'fail', error instanceof Error ? error.message : String(error));
      }
    })();
  </script>
</body>
</html>`;
}

export async function handleAuthRoute(
  request: IncomingMessage,
  response: ServerResponse,
  requestUrl: URL,
) {
  if (requestUrl.pathname === "/auth/register") {
    requireMethod(request.method, "POST");
    const body = await readJsonBody<RegisterBody>(request);
    const user = await createPasswordUser({
      name: getRequiredString(body, "name", 200),
      email: getRequiredString(body, "email", 320),
      password: getRequiredString(body, "password", 200),
      accountStatusCode:
        getOptionalString(body, "accountStatusCode", 80) ?? "unsubscribed",
    });

    sendJson(response, 201, { ok: true, user });
    return true;
  }

  if (requestUrl.pathname === "/auth/login") {
    requireMethod(request.method, "POST");
    const body = await readJsonBody<LoginBody>(request);
    const session = await loginWithPassword({
      email: getRequiredString(body, "email", 320),
      password: getRequiredString(body, "password", 200),
      role: getOptionalString(body, "role", 40),
    });

    sendJson(response, 200, { ok: true, ...session });
    return true;
  }

  if (requestUrl.pathname === "/auth/session") {
    requireMethod(request.method, "GET");
    const user = await getSessionFromToken(getBearerToken(request));

    if (!user) {
      throw new ApiError(401, "Missing or invalid bearer session token.");
    }

    sendJson(response, 200, { ok: true, user });
    return true;
  }

  if (requestUrl.pathname === "/auth/logout") {
    requireMethod(request.method, "POST");
    await revokeSession(getBearerToken(request));
    sendJson(response, 200, { ok: true });
    return true;
  }

  if (requestUrl.pathname === "/auth/dev/seed-demo-users") {
    requireMethod(request.method, "POST");

    if (process.env.NODE_ENV === "production") {
      throw new ApiError(404, "Not found.");
    }

    await seedDemoAuthAccounts();
    sendJson(response, 200, {
      ok: true,
      demoPassword: "Configured through ECOGLOBE_DEMO_PASSWORD.",
      users: [
        "demo.buyer@ecoglobe.com",
        "demo.seller@ecoglobe.com",
        "demo.admin@ecoglobe.com",
      ],
    });
    return true;
  }

  if (requestUrl.pathname === "/auth/dev/browser-test") {
    requireMethod(request.method, "GET");

    if (process.env.NODE_ENV === "production") {
      throw new ApiError(404, "Not found.");
    }

    sendHtml(response, 200, browserTestPage());
    return true;
  }

  return false;
}
