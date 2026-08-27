import {
  pbkdf2 as pbkdf2Callback,
  randomBytes,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import type { IncomingMessage } from "node:http";
import {
  queryRowsWithParams,
  queryRowsWithParamsInTransaction,
  runInTransaction,
  sql,
} from "./database.js";
import { sendEcoGlobeEmail } from "./email.js";
import { ApiError, type AuthContext } from "./http.js";

const pbkdf2 = promisify(pbkdf2Callback);

const PASSWORD_ITERATIONS = 210_000;
const PASSWORD_KEY_LENGTH = 32;
const SESSION_DAYS = 7;
const EMAIL_VERIFICATION_HOURS = 24;
const PASSWORD_RESET_MINUTES = 30;

function getDemoPassword() {
  const password = process.env.ECOGLOBE_DEMO_PASSWORD?.trim();

  if (!password) {
    throw new ApiError(
      503,
      "ECOGLOBE_DEMO_PASSWORD must be configured before seeding demo users.",
    );
  }

  return password;
}

type UserRecord = {
  id: number;
  name: string;
  email: string;
  accountStatusCode: string;
  emailVerifiedAt?: Date | string | null;
};

type SessionRecord = {
  id: number;
  userId: number;
  activeCompanyId?: number;
  activeRoleCode: string;
  expiresAt: Date;
  name: string;
  email: string;
  accountStatusCode: string;
  emailVerifiedAt?: Date | string | null;
};

export type SessionUser = UserRecord & {
  activeCompanyId?: number;
  activeRoleCode: string;
  companies: Array<{
    id: number;
    legalName: string;
    companyTypeCode: string;
    memberRoleCode: string;
    permissionTierCode: string;
    canApproveTransactions: boolean;
    canExecuteTransactions: boolean;
  }>;
};

function textParam(name: string, value: string | undefined, length = 240) {
  return { name, type: sql.NVarChar(length), value };
}

function varcharParam(name: string, value: string | undefined, length = 120) {
  return { name, type: sql.VarChar(length), value };
}

function intParam(name: string, value: number | undefined) {
  return { name, type: sql.Int, value };
}

function dateTimeParam(name: string, value: Date | undefined) {
  return { name, type: sql.DateTime2, value };
}

function varBinaryParam(
  name: string,
  value: Buffer | undefined,
  length: number,
) {
  return { name, type: sql.VarBinary(length), value };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeRole(role?: string) {
  if (!role) return undefined;
  const normalized = role.trim().toLowerCase();

  if (!["buyer", "seller", "admin"].includes(normalized)) {
    throw new ApiError(400, "role must be buyer, seller, or admin.");
  }

  return normalized;
}

function getAuthorizedRoles(
  user: Pick<UserRecord, "accountStatusCode">,
  companies: SessionUser["companies"],
) {
  const roles = new Set<string>();

  if (user.accountStatusCode === "subscribed_buyer") roles.add("buyer");
  if (user.accountStatusCode === "subscribed_seller") roles.add("seller");

  for (const company of companies) {
    if (company.companyTypeCode === "buyer") roles.add("buyer");
    if (company.companyTypeCode === "seller") roles.add("seller");
    if (company.companyTypeCode === "both") {
      roles.add("buyer");
      roles.add("seller");
    }
    if (company.memberRoleCode === "admin") roles.add("admin");
  }

  return roles;
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest();
}

function createAuthToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashSessionToken(token) };
}

function webUrl(path: string, token: string) {
  const baseUrl =
    process.env.ECOGLOBE_WEB_URL?.trim().replace(/\/$/, "") ||
    "http://localhost:4040";
  return `${baseUrl}${path}?token=${encodeURIComponent(token)}`;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>\"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

async function hashPassword(
  password: string,
  salt = randomBytes(32),
  iterations = PASSWORD_ITERATIONS,
) {
  const hash = await pbkdf2(
    password,
    salt,
    iterations,
    PASSWORD_KEY_LENGTH,
    "sha256",
  );
  return { hash, salt, iterations };
}

async function verifyPassword(
  password: string,
  salt: Buffer,
  expectedHash: Buffer,
  iterations: number,
) {
  const { hash } = await hashPassword(password, Buffer.from(salt), iterations);
  const normalizedHash = Buffer.from(hash);
  const normalizedExpectedHash = Buffer.from(expectedHash);
  return (
    normalizedHash.length === normalizedExpectedHash.length &&
    timingSafeEqual(normalizedHash, normalizedExpectedHash)
  );
}

async function lookupId(table: string, code: string) {
  const rows = await queryRowsWithParams<{ id: number }>(
    `SELECT Id AS id FROM dbo.${table} WHERE Code = @code AND IsActive = 1;`,
    [varcharParam("code", code, 80)],
  );

  if (!rows[0]) {
    throw new ApiError(500, `Missing required lookup value ${table}.${code}.`);
  }

  return rows[0].id;
}

/**
 * Dev-only escape hatch: ECOGLOBE_SKIP_EMAIL_VERIFICATION=true marks new
 * accounts verified at creation and lets unverified accounts sign in.
 */
export function shouldSkipEmailVerification() {
  return process.env.ECOGLOBE_SKIP_EMAIL_VERIFICATION === "true";
}

export async function createPasswordUser({
  name,
  email,
  password,
  accountStatusCode = "unsubscribed",
  createdByUserId,
}: {
  name: string;
  email: string;
  password: string;
  accountStatusCode?: string;
  createdByUserId?: number;
}) {
  if (password.length < 8) {
    throw new ApiError(400, "password must be at least 8 characters.");
  }

  const normalizedEmail = normalizeEmail(email);
  const existing = await queryRowsWithParams<{ id: number }>(
    "SELECT Id AS id FROM dbo.Users WHERE Email = @email;",
    [textParam("email", normalizedEmail, 320)],
  );

  if (existing[0]) {
    throw new ApiError(409, "A user with that email already exists.");
  }

  const accountStatusId = await lookupId("AccountStatuses", accountStatusCode);
  const userRows = await queryRowsWithParams<UserRecord>(
    `
      INSERT INTO dbo.Users (Name, Email, AccountStatusId, EmailVerifiedAt, CreatedByUserId, UpdatedByUserId)
      OUTPUT INSERTED.Id AS id, INSERTED.Name AS name, INSERTED.Email AS email, @accountStatusCode AS accountStatusCode
      VALUES (@name, @email, @accountStatusId, @emailVerifiedAt, @createdByUserId, @updatedByUserId);
    `,
    [
      textParam("name", name.trim(), 200),
      textParam("email", normalizedEmail, 320),
      intParam("accountStatusId", accountStatusId),
      varcharParam("accountStatusCode", accountStatusCode, 80),
      dateTimeParam(
        "emailVerifiedAt",
        shouldSkipEmailVerification() ? new Date() : undefined,
      ),
      intParam("createdByUserId", createdByUserId),
      intParam("updatedByUserId", createdByUserId),
    ],
  );

  const user = userRows[0];

  if (!user) {
    throw new ApiError(500, "Unable to create user.");
  }

  const { hash, salt, iterations } = await hashPassword(password);
  await queryRowsWithParams(
    `
      INSERT INTO dbo.UserPasswords (UserId, PasswordHash, PasswordSalt, Iterations, CreatedByUserId, UpdatedByUserId)
      VALUES (@userId, @passwordHash, @passwordSalt, @iterations, @createdByUserId, @updatedByUserId);
    `,
    [
      intParam("userId", user.id),
      varBinaryParam("passwordHash", hash, 64),
      varBinaryParam("passwordSalt", salt, 32),
      intParam("iterations", iterations),
      intParam("createdByUserId", createdByUserId ?? user.id),
      intParam("updatedByUserId", createdByUserId ?? user.id),
    ],
  );

  return user;
}

export type RegistrationIntent = "buy" | "sell" | "both" | "explore";

export function accountStatusCodeForIntent(intent: RegistrationIntent) {
  if (intent === "sell") return "subscribed_seller";
  if (intent === "explore") return "unsubscribed";
  return "subscribed_buyer";
}

export type RegistrationCompanyResult = {
  company: { id: number; legalName: string };
  membership: "owner_created" | "join_requested" | "already_member";
};

/**
 * Handles the company side of sign-up per the onboarding guide's
 * "create or join a company" step. When the legal name is new, the registrant
 * becomes the Company Owner of a pending company shell with a default
 * location carrying the sign-up country. When a company with that legal name
 * already exists, a pending join request (viewer, view-only) is recorded for
 * the Company Owner to approve instead of creating a duplicate company.
 * Explore-intent accounts never reach this function.
 */
export async function createRegistrationCompany({
  userId,
  companyName,
  intent,
  countryCode,
}: {
  userId: number;
  companyName: string;
  intent: Exclude<RegistrationIntent, "explore">;
  countryCode: string;
}): Promise<RegistrationCompanyResult> {
  const companyTypeCode =
    intent === "buy" ? "buyer" : intent === "sell" ? "seller" : "both";
  const companyTypeId = await lookupId("CompanyTypes", companyTypeCode);
  const pendingStatusId = await lookupId(
    "AccountStatuses",
    "pending_verification",
  );
  const activeStatusId = await lookupId("AccountStatuses", "active");
  const ownerRoleId = await lookupId("MemberRoles", "owner");
  const executorTierId = await lookupId("PermissionTiers", "executor");
  const locationTypeId = await lookupId(
    "LocationTypes",
    intent === "sell" ? "pickup" : "delivery",
  );

  const existingRows = await queryRowsWithParams<{
    id: number;
    legalName: string;
  }>(
    `
      SELECT TOP (1) Id AS id, LegalName AS legalName
      FROM dbo.Companies
      WHERE LOWER(LegalName) = LOWER(@legalName)
      ORDER BY Id;
    `,
    [textParam("legalName", companyName, 240)],
  );
  const existingCompany = existingRows[0];

  if (existingCompany) {
    const viewerRoleId = await lookupId("MemberRoles", "viewer");
    const viewOnlyTierId = await lookupId("PermissionTiers", "view_only");
    const membershipRows = await queryRowsWithParams<{ inserted: number }>(
      `
        IF EXISTS (
          SELECT 1 FROM dbo.CompanyMembers
          WHERE UserId = @userId AND CompanyId = @companyId
        )
        BEGIN
          SELECT 0 AS inserted;
        END
        ELSE
        BEGIN
          INSERT INTO dbo.CompanyMembers (
            UserId, CompanyId, MemberRoleId, PermissionTierId, MemberStatusId,
            CanApproveTransactions, CanExecuteTransactions, CreatedByUserId, UpdatedByUserId
          )
          VALUES (
            @userId, @companyId, @memberRoleId, @permissionTierId, @memberStatusId,
            0, 0, @userId, @userId
          );
          SELECT 1 AS inserted;
        END;
      `,
      [
        intParam("userId", userId),
        intParam("companyId", existingCompany.id),
        intParam("memberRoleId", viewerRoleId),
        intParam("permissionTierId", viewOnlyTierId),
        intParam("memberStatusId", pendingStatusId),
      ],
    );

    return {
      company: existingCompany,
      membership: membershipRows[0]?.inserted
        ? "join_requested"
        : "already_member",
    };
  }

  const companyRows = await queryRowsWithParams<{
    id: number;
    legalName: string;
  }>(
    `
      INSERT INTO dbo.Companies (
        LegalName, CompanyTypeId, VerificationStatusId, CreatedByUserId, UpdatedByUserId
      )
      OUTPUT INSERTED.Id AS id, INSERTED.LegalName AS legalName
      VALUES (@legalName, @companyTypeId, @verificationStatusId, @userId, @userId);
    `,
    [
      textParam("legalName", companyName, 240),
      intParam("companyTypeId", companyTypeId),
      intParam("verificationStatusId", pendingStatusId),
      intParam("userId", userId),
    ],
  );
  const company = companyRows[0];
  if (!company) {
    throw new ApiError(500, "Unable to create the sign-up company.");
  }

  await queryRowsWithParams(
    `
      INSERT INTO dbo.CompanyMembers (
        UserId, CompanyId, MemberRoleId, PermissionTierId, MemberStatusId,
        CanApproveTransactions, CanExecuteTransactions, CreatedByUserId, UpdatedByUserId
      )
      VALUES (
        @userId, @companyId, @memberRoleId, @permissionTierId, @memberStatusId,
        1, 1, @userId, @userId
      );
    `,
    [
      intParam("userId", userId),
      intParam("companyId", company.id),
      intParam("memberRoleId", ownerRoleId),
      intParam("permissionTierId", executorTierId),
      intParam("memberStatusId", activeStatusId),
    ],
  );

  await queryRowsWithParams(
    `
      INSERT INTO dbo.Locations (
        CompanyId, LocationTypeId, Name, AddressLine1, City, StateProvince,
        PostalCode, CountryCode, IsDefault, CreatedByUserId, UpdatedByUserId
      )
      VALUES (
        @companyId, @locationTypeId, @name, @addressLine1, @city, NULL,
        NULL, @countryCode, 1, @userId, @userId
      );
    `,
    [
      intParam("companyId", company.id),
      intParam("locationTypeId", locationTypeId),
      textParam("name", "Registered address", 160),
      textParam("addressLine1", "To be provided during onboarding", 240),
      textParam("city", "To be provided", 120),
      varcharParam("countryCode", countryCode.toUpperCase(), 2),
      intParam("userId", userId),
    ],
  );

  return { company, membership: "owner_created" };
}

async function issueVerificationToken(userId: number) {
  const { token, tokenHash } = createAuthToken();
  const expiresAt = new Date(
    Date.now() + EMAIL_VERIFICATION_HOURS * 60 * 60 * 1000,
  );

  await queryRowsWithParams(
    `
      UPDATE dbo.Users
      SET EmailVerificationTokenHash = @tokenHash,
          EmailVerificationTokenExpiresAt = @expiresAt,
          UpdatedAt = SYSUTCDATETIME()
      WHERE Id = @userId;
    `,
    [
      varBinaryParam("tokenHash", tokenHash, 32),
      dateTimeParam("expiresAt", expiresAt),
      intParam("userId", userId),
    ],
  );

  return token;
}

async function issuePasswordResetToken(userId: number) {
  const { token, tokenHash } = createAuthToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_MINUTES * 60 * 1000);

  await queryRowsWithParams(
    `
      UPDATE dbo.Users
      SET PasswordResetTokenHash = @tokenHash,
          PasswordResetTokenExpiresAt = @expiresAt,
          UpdatedAt = SYSUTCDATETIME()
      WHERE Id = @userId;
    `,
    [
      varBinaryParam("tokenHash", tokenHash, 32),
      dateTimeParam("expiresAt", expiresAt),
      intParam("userId", userId),
    ],
  );

  return token;
}

async function sendVerificationEmail(
  user: Pick<UserRecord, "id" | "name" | "email">,
) {
  const token = await issueVerificationToken(user.id);
  const link = webUrl("/verify-email", token);
  const safeName = escapeHtml(user.name);
  const safeLink = escapeHtml(link);

  await sendEcoGlobeEmail({
    to: user.email,
    subject: "Verify your EcoGlobe email",
    html: `<h1>Verify your EcoGlobe email</h1><p>Hi ${safeName},</p><p>Confirm your email address to finish setting up your EcoGlobe account.</p><p><a href="${safeLink}">Verify email address</a></p><p>This link expires in 24 hours.</p>`,
    text: `Verify your EcoGlobe email: ${link}\n\nThis link expires in 24 hours.`,
  });
}

export async function resendVerificationEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const user = (
    await queryRowsWithParams<UserRecord>(
      `
        SELECT u.Id AS id, u.Name AS name, u.Email AS email,
               u.EmailVerifiedAt AS emailVerifiedAt,
               s.Code AS accountStatusCode
        FROM dbo.Users u
        INNER JOIN dbo.AccountStatuses s ON s.Id = u.AccountStatusId
        WHERE u.Email = @email;
      `,
      [textParam("email", normalizedEmail, 320)],
    )
  )[0];

  if (!user || user.emailVerifiedAt) {
    return { sent: false };
  }

  await sendVerificationEmail(user);
  return { sent: true };
}

export async function verifyEmailToken(token: string) {
  const tokenHash = hashSessionToken(token);
  const verified = await queryRowsWithParams<{ id: number; email: string }>(
    `
      UPDATE dbo.Users
      SET EmailVerifiedAt = SYSUTCDATETIME(),
          EmailVerificationTokenHash = NULL,
          EmailVerificationTokenExpiresAt = NULL,
          UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.Email AS email
      WHERE EmailVerificationTokenHash = @tokenHash
        AND EmailVerificationTokenExpiresAt > SYSUTCDATETIME();
    `,
    [varBinaryParam("tokenHash", tokenHash, 32)],
  );

  if (!verified[0]) {
    throw new ApiError(400, "This verification link is invalid or expired.");
  }

  return verified[0];
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const user = (
    await queryRowsWithParams<UserRecord>(
      `
        SELECT u.Id AS id, u.Name AS name, u.Email AS email,
               s.Code AS accountStatusCode
        FROM dbo.Users u
        INNER JOIN dbo.AccountStatuses s ON s.Id = u.AccountStatusId
        WHERE u.Email = @email;
      `,
      [textParam("email", normalizedEmail, 320)],
    )
  )[0];

  if (!user) {
    return { sent: false };
  }

  const token = await issuePasswordResetToken(user.id);
  const link = webUrl("/reset-password", token);
  const safeName = escapeHtml(user.name);
  const safeLink = escapeHtml(link);

  await sendEcoGlobeEmail({
    to: user.email,
    subject: "Reset your EcoGlobe password",
    html: `<h1>Reset your EcoGlobe password</h1><p>Hi ${safeName},</p><p>Use the link below to choose a new password.</p><p><a href="${safeLink}">Reset password</a></p><p>This link expires in 30 minutes.</p>`,
    text: `Reset your EcoGlobe password: ${link}\n\nThis link expires in 30 minutes.`,
  });

  return { sent: true };
}

export async function resetPassword(token: string, password: string) {
  if (password.length < 8) {
    throw new ApiError(400, "password must be at least 8 characters.");
  }

  const tokenHash = hashSessionToken(token);
  const { hash, salt, iterations } = await hashPassword(password);

  await runInTransaction(async (transaction) => {
    const consumed = await queryRowsWithParamsInTransaction<{ id: number }>(
      transaction,
      `
        UPDATE dbo.Users
        SET PasswordResetTokenHash = NULL,
            PasswordResetTokenExpiresAt = NULL,
            UpdatedAt = SYSUTCDATETIME()
        OUTPUT INSERTED.Id AS id
        WHERE PasswordResetTokenHash = @tokenHash
          AND PasswordResetTokenExpiresAt > SYSUTCDATETIME();
      `,
      [varBinaryParam("tokenHash", tokenHash, 32)],
    );

    const user = consumed[0];
    if (!user) {
      throw new ApiError(400, "This reset link is invalid or expired.");
    }

    const updated = await queryRowsWithParamsInTransaction<{ userId: number }>(
      transaction,
      `
        UPDATE dbo.UserPasswords
        SET PasswordHash = @passwordHash,
            PasswordSalt = @passwordSalt,
            Iterations = @iterations,
            PasswordUpdatedAt = SYSUTCDATETIME(),
            UpdatedByUserId = @userId,
            UpdatedAt = SYSUTCDATETIME()
        OUTPUT INSERTED.UserId AS userId
        WHERE UserId = @userId;
      `,
      [
        varBinaryParam("passwordHash", hash, 64),
        varBinaryParam("passwordSalt", salt, 32),
        intParam("iterations", iterations),
        intParam("userId", user.id),
      ],
    );

    if (!updated[0]) {
      throw new ApiError(500, "Unable to reset this password.");
    }

    await queryRowsWithParamsInTransaction(
      transaction,
      `
        UPDATE dbo.UserSessions
        SET RevokedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
        WHERE UserId = @userId AND RevokedAt IS NULL;
      `,
      [intParam("userId", user.id)],
    );
  });

  return { ok: true };
}

export async function markUserEmailVerified(userId: number) {
  await queryRowsWithParams(
    `UPDATE dbo.Users SET EmailVerifiedAt = COALESCE(EmailVerifiedAt, SYSUTCDATETIME()), UpdatedAt = SYSUTCDATETIME() WHERE Id = @userId;`,
    [intParam("userId", userId)],
  );
}

async function ensurePasswordCredential(userId: number, password: string) {
  const existing = await queryRowsWithParams<{ id: number }>(
    "SELECT Id AS id FROM dbo.UserPasswords WHERE UserId = @userId;",
    [intParam("userId", userId)],
  );

  const { hash, salt, iterations } = await hashPassword(password);

  if (existing[0]) {
    await queryRowsWithParams(
      `
        UPDATE dbo.UserPasswords
        SET PasswordHash = @passwordHash,
            PasswordSalt = @passwordSalt,
            Iterations = @iterations,
            UpdatedByUserId = @updatedByUserId,
            UpdatedAt = SYSUTCDATETIME()
        WHERE UserId = @userId;
      `,
      [
        intParam("userId", userId),
        varBinaryParam("passwordHash", hash, 64),
        varBinaryParam("passwordSalt", salt, 32),
        intParam("iterations", iterations),
        intParam("updatedByUserId", userId),
      ],
    );
    return;
  }

  await queryRowsWithParams(
    `
      INSERT INTO dbo.UserPasswords (UserId, PasswordHash, PasswordSalt, Iterations, CreatedByUserId, UpdatedByUserId)
      VALUES (@userId, @passwordHash, @passwordSalt, @iterations, @createdByUserId, @updatedByUserId);
    `,
    [
      intParam("userId", userId),
      varBinaryParam("passwordHash", hash, 64),
      varBinaryParam("passwordSalt", salt, 32),
      intParam("iterations", iterations),
      intParam("createdByUserId", userId),
      intParam("updatedByUserId", userId),
    ],
  );
}

async function getUserCompanies(userId: number) {
  return queryRowsWithParams<SessionUser["companies"][number]>(
    `
      SELECT
        c.Id AS id,
        c.LegalName AS legalName,
        ct.Code AS companyTypeCode,
        mr.Code AS memberRoleCode,
        pt.Code AS permissionTierCode,
        cm.CanApproveTransactions AS canApproveTransactions,
        cm.CanExecuteTransactions AS canExecuteTransactions
      FROM dbo.CompanyMembers cm
      INNER JOIN dbo.Companies c ON c.Id = cm.CompanyId
      INNER JOIN dbo.CompanyTypes ct ON ct.Id = c.CompanyTypeId
      INNER JOIN dbo.MemberRoles mr ON mr.Id = cm.MemberRoleId
      INNER JOIN dbo.PermissionTiers pt ON pt.Id = cm.PermissionTierId
      INNER JOIN dbo.AccountStatuses ms ON ms.Id = cm.MemberStatusId
      WHERE cm.UserId = @userId
        AND ms.Code = 'active'
      ORDER BY c.Id;
    `,
    [intParam("userId", userId)],
  );
}

async function getSessionUser(session: SessionRecord): Promise<SessionUser> {
  return {
    id: session.userId,
    name: session.name,
    email: session.email,
    accountStatusCode: session.accountStatusCode,
    activeCompanyId: session.activeCompanyId,
    activeRoleCode: session.activeRoleCode,
    companies: await getUserCompanies(session.userId),
  };
}

export async function issueSession({
  userId,
  activeCompanyId,
  activeRoleCode,
}: {
  userId: number;
  activeCompanyId?: number;
  activeRoleCode: string;
}) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await queryRowsWithParams(
    `
      INSERT INTO dbo.UserSessions (
        UserId, TokenHash, ActiveCompanyId, ActiveRoleCode, ExpiresAt,
        CreatedByUserId, UpdatedByUserId
      )
      VALUES (
        @userId, @tokenHash, @activeCompanyId, @activeRoleCode, @expiresAt,
        @createdByUserId, @updatedByUserId
      );
    `,
    [
      intParam("userId", userId),
      varBinaryParam("tokenHash", tokenHash, 32),
      intParam("activeCompanyId", activeCompanyId),
      varcharParam("activeRoleCode", activeRoleCode, 40),
      dateTimeParam("expiresAt", expiresAt),
      intParam("createdByUserId", userId),
      intParam("updatedByUserId", userId),
    ],
  );

  return { token, expiresAt };
}

export async function loginWithPassword({
  email,
  password,
  role,
}: {
  email: string;
  password: string;
  role?: string;
}) {
  const normalizedEmail = normalizeEmail(email);
  const rows = await queryRowsWithParams<
    UserRecord & {
      passwordHash: Buffer;
      passwordSalt: Buffer;
      iterations: number;
    }
  >(
    `
      SELECT
        u.Id AS id,
        u.Name AS name,
        u.Email AS email,
        u.EmailVerifiedAt AS emailVerifiedAt,
        s.Code AS accountStatusCode,
        up.PasswordHash AS passwordHash,
        up.PasswordSalt AS passwordSalt,
        up.Iterations AS iterations
      FROM dbo.Users u
      INNER JOIN dbo.AccountStatuses s ON s.Id = u.AccountStatusId
      INNER JOIN dbo.UserPasswords up ON up.UserId = u.Id
      WHERE u.Email = @email;
    `,
    [textParam("email", normalizedEmail, 320)],
  );

  const user = rows[0];

  if (
    !user ||
    !(await verifyPassword(
      password,
      user.passwordSalt,
      user.passwordHash,
      user.iterations,
    ))
  ) {
    throw new ApiError(401, "Invalid email or password.");
  }

  if (
    user.accountStatusCode === "suspended" ||
    user.accountStatusCode === "inactive"
  ) {
    throw new ApiError(403, "This user account is not active.");
  }

  if (!user.emailVerifiedAt && !shouldSkipEmailVerification()) {
    throw new ApiError(
      403,
      "Please verify your email address before signing in.",
    );
  }

  const companies = await getUserCompanies(user.id);
  const requestedRole = normalizeRole(role);
  const authorizedRoles = getAuthorizedRoles(user, companies);

  if (requestedRole && !authorizedRoles.has(requestedRole)) {
    throw new ApiError(
      403,
      `This account does not have ${requestedRole} access.`,
    );
  }

  const activeRoleCode =
    requestedRole ??
    (user.accountStatusCode === "subscribed_seller"
      ? "seller"
      : user.accountStatusCode === "subscribed_buyer"
        ? "buyer"
        : companies.some((company) => company.memberRoleCode === "admin")
          ? "admin"
          : authorizedRoles.has("buyer")
            ? "buyer"
            : authorizedRoles.has("seller")
              ? "seller"
              : "explorer");

  const activeCompanyId =
    companies.find((company) =>
      activeRoleCode === "admin"
        ? company.memberRoleCode === "admin"
        : company.companyTypeCode === activeRoleCode ||
          company.companyTypeCode === "both",
    )?.id ?? companies[0]?.id;

  const session = await issueSession({
    userId: user.id,
    activeCompanyId,
    activeRoleCode,
  });

  return {
    token: session.token,
    expiresAt: session.expiresAt,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      accountStatusCode: user.accountStatusCode,
      activeCompanyId,
      activeRoleCode,
      companies,
    },
  };
}

export async function getSessionFromToken(token: string | undefined) {
  if (!token) return undefined;

  const rows = await queryRowsWithParams<SessionRecord>(
    `
      SELECT
        s.Id AS id,
        s.UserId AS userId,
        s.ActiveCompanyId AS activeCompanyId,
        s.ActiveRoleCode AS activeRoleCode,
        s.ExpiresAt AS expiresAt,
        u.Name AS name,
        u.Email AS email,
        u.EmailVerifiedAt AS emailVerifiedAt,
        us.Code AS accountStatusCode
      FROM dbo.UserSessions s
      INNER JOIN dbo.Users u ON u.Id = s.UserId
      INNER JOIN dbo.AccountStatuses us ON us.Id = u.AccountStatusId
      WHERE s.TokenHash = @tokenHash
        AND s.RevokedAt IS NULL
        AND s.ExpiresAt > SYSUTCDATETIME();
    `,
    [varBinaryParam("tokenHash", hashSessionToken(token), 32)],
  );

  const session = rows[0];
  if (!session) return undefined;

  await queryRowsWithParams(
    `
      UPDATE dbo.UserSessions
      SET LastSeenAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
      WHERE Id = @sessionId;
    `,
    [intParam("sessionId", session.id)],
  );

  const user = await getSessionUser(session);
  if (!getAuthorizedRoles(user, user.companies).has(user.activeRoleCode)) {
    return undefined;
  }

  return user;
}

export function getBearerToken(request: IncomingMessage) {
  const rawAuthorization = request.headers.authorization;
  const authorization = Array.isArray(rawAuthorization)
    ? rawAuthorization[0]
    : rawAuthorization;

  if (!authorization?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorization.slice("Bearer ".length).trim();
}

export async function requireSessionAuth(
  request: IncomingMessage,
): Promise<AuthContext> {
  const session = await getSessionFromToken(getBearerToken(request));

  if (session) {
    return {
      userId: session.id,
      companyId: session.activeCompanyId,
      isAdmin: session.activeRoleCode === "admin",
    };
  }

  throw new ApiError(401, "Missing or invalid bearer session token.");
}

/**
 * Like requireSessionAuth, but anonymous callers get `undefined` instead of a
 * 401. Used by public read endpoints that widen results for signed-in users.
 */
export async function getOptionalSessionAuth(
  request: IncomingMessage,
): Promise<AuthContext | undefined> {
  const session = await getSessionFromToken(getBearerToken(request));

  if (!session) return undefined;

  return {
    userId: session.id,
    companyId: session.activeCompanyId,
    isAdmin: session.activeRoleCode === "admin",
  };
}

export async function revokeSession(token: string | undefined) {
  if (!token) {
    throw new ApiError(401, "Missing bearer session token.");
  }

  await queryRowsWithParams(
    `
      UPDATE dbo.UserSessions
      SET RevokedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
      WHERE TokenHash = @tokenHash AND RevokedAt IS NULL;
    `,
    [varBinaryParam("tokenHash", hashSessionToken(token), 32)],
  );
}

export async function seedDemoAuthAccounts() {
  const demoPassword = getDemoPassword();
  const demoUsers = [
    {
      name: "Joanna Bell",
      email: "demo.buyer@ecoglobe.com",
      accountStatusCode: "subscribed_buyer",
      companyName: "AgriCorp Solutions",
      companyTypeCode: "buyer",
      role: "buyer",
    },
    {
      name: "Sam Reyes",
      email: "demo.seller@ecoglobe.com",
      accountStatusCode: "subscribed_seller",
      companyName: "GulfStar Chemicals",
      companyTypeCode: "seller",
      role: "seller",
    },
    {
      name: "EcoGlobe Administrator",
      email: "demo.admin@ecoglobe.com",
      accountStatusCode: "active",
      companyName: "EcoGlobe Operations",
      companyTypeCode: "both",
      role: "admin",
    },
  ];

  const verifiedStatusId = await lookupId("AccountStatuses", "verified");
  const activeStatusId = await lookupId("AccountStatuses", "active");
  const ownerRoleId = await lookupId("MemberRoles", "owner");
  const adminRoleId = await lookupId("MemberRoles", "admin");
  const executorTierId = await lookupId("PermissionTiers", "executor");
  const adminTierId = await lookupId("PermissionTiers", "admin_override");

  for (const demo of demoUsers) {
    let user = (
      await queryRowsWithParams<UserRecord>(
        "SELECT u.Id AS id, u.Name AS name, u.Email AS email, u.EmailVerifiedAt AS emailVerifiedAt, s.Code AS accountStatusCode FROM dbo.Users u INNER JOIN dbo.AccountStatuses s ON s.Id = u.AccountStatusId WHERE u.Email = @email;",
        [textParam("email", demo.email, 320)],
      )
    )[0];

    if (!user) {
      user = await createPasswordUser({
        name: demo.name,
        email: demo.email,
        password: demoPassword,
        accountStatusCode: demo.accountStatusCode,
      });
    } else {
      await ensurePasswordCredential(user.id, demoPassword);
    }

    await markUserEmailVerified(user.id);

    const companyTypeId = await lookupId("CompanyTypes", demo.companyTypeCode);
    const company =
      (
        await queryRowsWithParams<{ id: number }>(
          "SELECT Id AS id FROM dbo.Companies WHERE LegalName = @legalName;",
          [textParam("legalName", demo.companyName, 240)],
        )
      )[0] ??
      (
        await queryRowsWithParams<{ id: number }>(
          `
            INSERT INTO dbo.Companies (LegalName, CompanyTypeId, VerificationStatusId, CreatedByUserId, UpdatedByUserId)
            OUTPUT INSERTED.Id AS id
            VALUES (@legalName, @companyTypeId, @verificationStatusId, @createdByUserId, @updatedByUserId);
          `,
          [
            textParam("legalName", demo.companyName, 240),
            intParam("companyTypeId", companyTypeId),
            intParam("verificationStatusId", verifiedStatusId),
            intParam("createdByUserId", user.id),
            intParam("updatedByUserId", user.id),
          ],
        )
      )[0];

    const memberExists = (
      await queryRowsWithParams<{ id: number }>(
        "SELECT Id AS id FROM dbo.CompanyMembers WHERE UserId = @userId AND CompanyId = @companyId;",
        [intParam("userId", user.id), intParam("companyId", company?.id)],
      )
    )[0];

    if (!memberExists && company) {
      await queryRowsWithParams(
        `
          INSERT INTO dbo.CompanyMembers (
            UserId, CompanyId, MemberRoleId, PermissionTierId, MemberStatusId,
            TransactionApprovalLimit, CanApproveTransactions, CanExecuteTransactions,
            CreatedByUserId, UpdatedByUserId
          )
          VALUES (
            @userId, @companyId, @memberRoleId, @permissionTierId, @memberStatusId,
            @transactionApprovalLimit, @canApproveTransactions, @canExecuteTransactions,
            @createdByUserId, @updatedByUserId
          );
        `,
        [
          intParam("userId", user.id),
          intParam("companyId", company.id),
          intParam(
            "memberRoleId",
            demo.role === "admin" ? adminRoleId : ownerRoleId,
          ),
          intParam(
            "permissionTierId",
            demo.role === "admin" ? adminTierId : executorTierId,
          ),
          intParam("memberStatusId", activeStatusId),
          {
            name: "transactionApprovalLimit",
            type: sql.Decimal(18, 2),
            value: 500000,
          },
          { name: "canApproveTransactions", type: sql.Bit, value: true },
          { name: "canExecuteTransactions", type: sql.Bit, value: true },
          intParam("createdByUserId", user.id),
          intParam("updatedByUserId", user.id),
        ],
      );
    }
  }
}
