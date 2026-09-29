IF OBJECT_ID('dbo.CompanyDocuments','U') IS NULL
CREATE TABLE dbo.CompanyDocuments (
 Id INT IDENTITY PRIMARY KEY, CompanyId INT NOT NULL REFERENCES dbo.Companies(Id),
 FileName NVARCHAR(240) NOT NULL, ContentType VARCHAR(100) NOT NULL, Content VARBINARY(MAX) NOT NULL,
 Category VARCHAR(60) NOT NULL, Status VARCHAR(30) NOT NULL DEFAULT 'pending', SizeBytes INT NOT NULL,
 UploadedByUserId INT NOT NULL REFERENCES dbo.Users(Id), ReviewNote NVARCHAR(2000) NULL,
 ReviewedByUserId INT NULL REFERENCES dbo.Users(Id), ReviewedAt DATETIME2 NULL,
 CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), DeletedAt DATETIME2 NULL,
 CONSTRAINT CK_CompanyDocuments_Status CHECK(Status IN ('pending','approved','rejected'))
);
GO
IF OBJECT_ID('dbo.CompanyVerificationReviews','U') IS NULL
CREATE TABLE dbo.CompanyVerificationReviews (
 Id INT IDENTITY PRIMARY KEY, CompanyId INT NOT NULL REFERENCES dbo.Companies(Id),
 Decision VARCHAR(30) NOT NULL, Note NVARCHAR(2000) NOT NULL,
 ReviewedByUserId INT NOT NULL REFERENCES dbo.Users(Id), CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
IF OBJECT_ID('dbo.ContactRequests','U') IS NULL
CREATE TABLE dbo.ContactRequests (
 Id INT IDENTITY PRIMARY KEY, Name NVARCHAR(200) NOT NULL, Email NVARCHAR(320) NOT NULL,
 Company NVARCHAR(240) NULL, Topic NVARCHAR(120) NOT NULL, Message NVARCHAR(4000) NOT NULL,
 CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
IF NOT EXISTS(SELECT 1 FROM dbo.OrderStatuses WHERE Code='awaiting_payment')
 INSERT dbo.OrderStatuses(Code,Name,Description,SortOrder) VALUES('awaiting_payment','Awaiting payment','Payment has not been confirmed by the provider.',15);
GO
IF OBJECT_ID('dbo.CheckoutAttempts','U') IS NULL
CREATE TABLE dbo.CheckoutAttempts (
 Id INT IDENTITY PRIMARY KEY, BuyerCompanyId INT NOT NULL REFERENCES dbo.Companies(Id),
 IdempotencyKey VARCHAR(100) NOT NULL, RequestHash CHAR(64) NOT NULL,
 OrderId INT NOT NULL REFERENCES dbo.Orders(Id), ListingId INT NOT NULL REFERENCES dbo.Listings(Id),
 Quantity DECIMAL(18,3) NOT NULL, AmountCents BIGINT NOT NULL, CurrencyCode CHAR(3) NOT NULL,
 ProviderSessionId VARCHAR(200) NULL, CheckoutUrl NVARCHAR(2000) NULL,
 State VARCHAR(30) NOT NULL DEFAULT 'pending', PlatformAccountId VARCHAR(100) NOT NULL, Livemode BIT NOT NULL,
 CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), ExpiresAt DATETIME2 NOT NULL,
 CONSTRAINT UQ_CheckoutAttempts_Key UNIQUE(BuyerCompanyId,IdempotencyKey),
 CONSTRAINT CK_CheckoutAttempts_State CHECK(State IN ('pending','paid','expired','refunded'))
);
GO
IF OBJECT_ID('dbo.StripePaymentEvents','U') IS NULL
CREATE TABLE dbo.StripePaymentEvents (
 EventId VARCHAR(200) PRIMARY KEY, EventType VARCHAR(120) NOT NULL, CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
