IF COL_LENGTH('dbo.RefundCases','BaselineRefundedCents') IS NULL ALTER TABLE dbo.RefundCases ADD BaselineRefundedCents INT NOT NULL DEFAULT 0;
GO
INSERT dbo.RefundProviderReferences(PlatformAccountId,Livemode,RefundId,RefundCaseId)
 SELECT r.PlatformAccountId,r.Livemode,r.ProviderRefundId,r.Id FROM dbo.RefundCases r
 WHERE r.ProviderRefundId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.RefundProviderReferences x WHERE x.PlatformAccountId=r.PlatformAccountId AND x.Livemode=r.Livemode AND x.RefundId=r.ProviderRefundId);
GO
