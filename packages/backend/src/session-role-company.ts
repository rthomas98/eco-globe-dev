import type { SessionUser } from "./auth.js";

export function selectSessionRoleCompany(
  user: Pick<SessionUser, "activeCompanyId" | "companies">,
  role: "buyer" | "seller",
) {
  const isEligible = (company: SessionUser["companies"][number]) =>
    company.companyTypeCode === role || company.companyTypeCode === "both";

  return (
    user.companies.find(
      (company) => company.id === user.activeCompanyId && isEligible(company),
    ) ?? user.companies.find(isEligible)
  );
}
