import { ApiError, type AuthContext } from "./http.js";
import {
  queryRowsWithParams as query,
  queryRowsWithParamsInTransaction,
  sql,
  type QueryParameter,
} from "./database.js";
const int = (name: string, value: unknown): QueryParameter => ({
  name,
  value,
  type: sql.Int,
});
export async function seller(
  auth: AuthContext,
  companyId: number,
  transaction?: sql.Transaction,
) {
  if (auth.isAdmin) return;
  if (auth.companyId !== companyId)
    throw new ApiError(403, "Seller company access required.");
  const rows = await (
    transaction
      ? (statement: string, params: QueryParameter[]) =>
          queryRowsWithParamsInTransaction(transaction, statement, params)
      : query
  )(
    `SELECT cm.Id FROM dbo.CompanyMembers cm${transaction ? " WITH(HOLDLOCK)" : ""} JOIN dbo.MemberRoles mr ON mr.Id=cm.MemberRoleId
    JOIN dbo.AccountStatuses ms ON ms.Id=cm.MemberStatusId JOIN dbo.SellerProfiles sp${transaction ? " WITH(HOLDLOCK)" : ""} ON sp.CompanyId=cm.CompanyId
    WHERE cm.CompanyId=@companyId AND cm.UserId=@userId AND ms.Code='active' AND mr.Code IN ('owner','admin','seller_operator')`,
    [int("companyId", companyId), int("userId", auth.userId)],
  );
  if (!rows.length)
    throw new ApiError(403, "Active seller membership required.");
}
