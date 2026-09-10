import type { QueryParameter } from "./database.js";
import { int, text } from "./lab-routes.js";
import { shippingMode } from "./sample-shipping-provider.js";
type Exec = (
  q: string,
  p?: QueryParameter[],
) => Promise<Record<string, unknown>[]>;
/** Must run inside the same SQL transaction that creates the order, before any charge. */
export async function applySampleShippingCredit(exec: Exec, orderId: number) {
  if (shippingMode() === "unavailable") return 0;
  const order = (
    await exec(
      "SELECT BuyerCompanyId AS buyer,ListingId AS listing,TotalAmount AS total,CurrencyCode AS currency FROM dbo.Orders WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id",
      [int("id", orderId)],
    )
  )[0];
  if (!order || order.currency !== "USD" || !order.listing) return 0;
  await exec(
    "DECLARE @lock INT; EXEC @lock=sp_getapplock @Resource=@key,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @lock<0 THROW 50001,'Credit lock unavailable',1;",
    [text("key", `sample-credit:${order.buyer}:${order.listing}`)],
  );
  const credits = await exec(
    `SELECT c.SampleRequestId AS id,c.AmountCents-COALESCE((SELECT SUM(a.AmountCents) FROM dbo.SampleCreditApplications a WHERE a.SampleRequestId=c.SampleRequestId),0) AS remaining FROM dbo.SampleShippingCredits c WITH(UPDLOCK,HOLDLOCK) JOIN dbo.SampleShipping s ON s.SampleRequestId=c.SampleRequestId JOIN dbo.SampleShippingQuotes q ON q.Id=s.QuoteId WHERE c.BuyerCompanyId=@buyer AND c.ListingId=@listing AND c.RedeemedOrderId IS NULL AND q.Provider=@mode AND s.State='delivered' ORDER BY c.CreatedAt,c.SampleRequestId`,
    [
      int("buyer", order.buyer),
      int("listing", order.listing),
      text("mode", shippingMode()),
    ],
  );
  let available = Math.round(Number(order.total) * 100),
    applied = 0;
  for (const c of credits) {
    const amount = Math.min(available, Number(c.remaining));
    if (amount <= 0) continue;
    await exec(
      "INSERT dbo.SampleCreditApplications(SampleRequestId,OrderId,AmountCents) VALUES(@sample,@order,@amount)",
      [int("sample", c.id), int("order", orderId), int("amount", amount)],
    );
    if (amount === Number(c.remaining))
      await exec(
        "UPDATE dbo.SampleShippingCredits SET RedeemedOrderId=@order,RedeemedAt=SYSUTCDATETIME() WHERE SampleRequestId=@sample",
        [int("sample", c.id), int("order", orderId)],
      );
    available -= amount;
    applied += amount;
  }
  if (applied)
    await exec(
      "UPDATE dbo.Orders SET TotalAmount=TotalAmount-CAST(@cents AS decimal(18,2))/100,SampleShippingCreditCents=@cents WHERE Id=@id",
      [int("cents", applied), int("id", orderId)],
    );
  return applied;
}
