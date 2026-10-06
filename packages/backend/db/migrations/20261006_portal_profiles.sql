-- Backfill only missing profiles for the existing declared company type.
-- New profiles use registration defaults; existing profile/licence/KYC/member state is untouched.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

INSERT dbo.BuyerProfiles(CompanyId,OnboardingStatusId,SubscriptionStatusId,BillingStatusId,ApprovalStatusId)
SELECT c.Id,a.Id,s.Id,p.Id,p.Id
FROM dbo.Companies c JOIN dbo.CompanyTypes t ON t.Id=c.CompanyTypeId
CROSS JOIN dbo.AccountStatuses a CROSS JOIN dbo.AccountStatuses s CROSS JOIN dbo.AccountStatuses p
WHERE t.Code IN('buyer','both') AND a.Code='active'
AND s.Code='subscribed_buyer' AND p.Code='pending_verification'
AND NOT EXISTS(SELECT 1 FROM dbo.BuyerProfiles WITH(UPDLOCK,HOLDLOCK) WHERE CompanyId=c.Id);
INSERT dbo.SellerProfiles(CompanyId,OnboardingStatusId,SubscriptionStatusId,PayoutStatusId,ApprovalStatusId,LicenceTierId)
SELECT c.Id,a.Id,s.Id,ps.Id,p.Id,lt.Id
FROM dbo.Companies c JOIN dbo.CompanyTypes t ON t.Id=c.CompanyTypeId
CROSS JOIN dbo.AccountStatuses a CROSS JOIN dbo.AccountStatuses s CROSS JOIN dbo.AccountStatuses p
CROSS JOIN dbo.PayoutStatuses ps CROSS JOIN dbo.LicenceTiers lt
WHERE t.Code IN('seller','both') AND a.Code='active'
AND s.Code='subscribed_seller' AND p.Code='pending_verification' AND ps.Code='pending' AND lt.Code='free'
AND NOT EXISTS(SELECT 1 FROM dbo.SellerProfiles WITH(UPDLOCK,HOLDLOCK) WHERE CompanyId=c.Id);

COMMIT TRANSACTION;
