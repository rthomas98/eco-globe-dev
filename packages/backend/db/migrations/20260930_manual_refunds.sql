IF OBJECT_ID('dbo.RefundCases','U') IS NULL
BEGIN
 CREATE TABLE dbo.RefundCases (
 Id INT IDENTITY PRIMARY KEY, SourceType VARCHAR(10) NOT NULL CHECK(SourceType IN('order','sample')),SourceId INT NOT NULL,
 OrderId INT NULL REFERENCES dbo.Orders(Id),SampleRequestId INT NULL REFERENCES dbo.SampleRequests(Id),
 BuyerCompanyId INT NOT NULL REFERENCES dbo.Companies(Id),SellerCompanyId INT NOT NULL REFERENCES dbo.Companies(Id),
 PaymentIntentId VARCHAR(200) NOT NULL,PlatformAccountId VARCHAR(200) NOT NULL,Livemode BIT NOT NULL,
 AmountCents INT NOT NULL CHECK(AmountCents>0),PaidCents INT NOT NULL CHECK(PaidCents>0),CurrencyCode CHAR(3) NOT NULL,
 Status VARCHAR(30) NOT NULL DEFAULT 'requested' CHECK(Status IN('requested','awaiting_buyer','awaiting_seller','approved','provider_pending','provider_failed','refunded','declined')),
 Active BIT NOT NULL DEFAULT 1,Reason NVARCHAR(2000) NOT NULL,RequiredAction NVARCHAR(2000) NULL,ActionDueAt DATETIME2 NULL,
 ActionVersion INT NOT NULL DEFAULT 0,LastReminderAt DATETIME2 NULL,
 ProviderRefundId VARCHAR(200) NULL,ProviderStatus VARCHAR(80) NULL,
 RequestKey VARCHAR(100) NOT NULL,CreatedByUserId INT NULL REFERENCES dbo.Users(Id),
 CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT CK_RefundCases_Source CHECK((SourceType='order' AND OrderId=SourceId AND SampleRequestId IS NULL) OR (SourceType='sample' AND SampleRequestId=SourceId AND OrderId IS NULL)),
 CONSTRAINT CK_RefundCases_Amount CHECK(AmountCents<=PaidCents)
 );
 CREATE UNIQUE INDEX UX_RefundCases_ActiveSource ON dbo.RefundCases(SourceType,SourceId) WHERE Active=1;
 CREATE UNIQUE INDEX UX_RefundCases_Request ON dbo.RefundCases(BuyerCompanyId,RequestKey);
 CREATE UNIQUE INDEX UX_RefundCases_Provider ON dbo.RefundCases(PlatformAccountId,Livemode,ProviderRefundId) WHERE ProviderRefundId IS NOT NULL;
END;
GO
IF OBJECT_ID('dbo.RefundCaseEvents','U') IS NULL
 CREATE TABLE dbo.RefundCaseEvents (
 Id INT IDENTITY PRIMARY KEY,RefundCaseId INT NOT NULL REFERENCES dbo.RefundCases(Id),
 EventType VARCHAR(50) NOT NULL,Visibility VARCHAR(10) NOT NULL DEFAULT 'all',ActorUserId INT NULL REFERENCES dbo.Users(Id),Message NVARCHAR(2000) NOT NULL,
 CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
 );
GO
IF OBJECT_ID('dbo.RefundEmailOutbox','U') IS NULL
BEGIN
 CREATE TABLE dbo.RefundEmailOutbox (
 Id INT IDENTITY PRIMARY KEY,RefundCaseId INT NOT NULL REFERENCES dbo.RefundCases(Id),RecipientRole VARCHAR(10) NOT NULL CHECK(RecipientRole IN('buyer','seller')),
 Kind VARCHAR(10) NOT NULL CHECK(Kind IN('notice','reminder')),ActionVersion INT NOT NULL,JobKey VARCHAR(200) NOT NULL UNIQUE,
 Recipient NVARCHAR(320) NULL,PayloadJson NVARCHAR(MAX) NULL,
 State VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK(State IN('queued','sending','sent','failed','cancelled','needs_review')),
 Attempts INT NOT NULL DEFAULT 0,LeaseToken UNIQUEIDENTIFIER NULL,LeaseUntil DATETIME2 NULL,
 NextAttemptAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),FirstAttemptAt DATETIME2 NULL,
 LastError NVARCHAR(500) NULL,ProviderEmailId VARCHAR(200) NULL,
 CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),SentAt DATETIME2 NULL
 );
 CREATE INDEX IX_RefundEmailOutbox_Work ON dbo.RefundEmailOutbox(State,NextAttemptAt);
END;
GO

-- Extend the existing sample refund state without resetting or rewriting sample records.
DECLARE @constraint SYSNAME;
SELECT @constraint=name FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('dbo.SampleShipping') AND definition LIKE '%RefundState%';
IF @constraint IS NOT NULL BEGIN
 DECLARE @drop NVARCHAR(500)='ALTER TABLE dbo.SampleShipping DROP CONSTRAINT '+QUOTENAME(@constraint);
 EXEC sys.sp_executesql @drop;
END;
ALTER TABLE dbo.SampleShipping ADD CONSTRAINT CK_SampleShipping_ManualRefundState CHECK(RefundState IN('none','pending','manual_review','succeeded','failed'));
GO

IF COL_LENGTH('dbo.RefundCaseEvents','Visibility') IS NULL ALTER TABLE dbo.RefundCaseEvents ADD Visibility VARCHAR(10) NOT NULL DEFAULT 'all';
GO
IF OBJECT_ID('dbo.RefundProviderReferences','U') IS NULL
 CREATE TABLE dbo.RefundProviderReferences (
 PlatformAccountId VARCHAR(200) NOT NULL,Livemode BIT NOT NULL,RefundId VARCHAR(200) NOT NULL,
 RefundCaseId INT NOT NULL REFERENCES dbo.RefundCases(Id),CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT PK_RefundProviderReferences PRIMARY KEY(PlatformAccountId,Livemode,RefundId)
 );
GO
