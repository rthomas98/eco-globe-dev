-- Additive domestic parcel shipping. Existing legacy SampleRequests remain unchanged.
IF OBJECT_ID('dbo.SampleListingPolicies','U') IS NULL
CREATE TABLE dbo.SampleListingPolicies (
 ListingId INT NOT NULL PRIMARY KEY REFERENCES dbo.Listings(Id),
 Enabled BIT NOT NULL DEFAULT 0,
 Classification VARCHAR(30) NOT NULL DEFAULT 'unreviewed'
  CHECK (Classification IN ('standard_solid','restricted','liquid','gas','unreviewed')),
 SpecialHandling BIT NOT NULL DEFAULT 0,
 ReviewedByUserId INT NULL REFERENCES dbo.Users(Id),
 ReviewedAt DATETIME2 NULL,
 UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
IF OBJECT_ID('dbo.SampleReceivingSites','U') IS NULL
CREATE TABLE dbo.SampleReceivingSites (
 LocationId INT NOT NULL PRIMARY KEY REFERENCES dbo.Locations(Id),
 AddressHash CHAR(64) NOT NULL,
 ProviderAddressId VARCHAR(160) NULL,
 VerifiedByUserId INT NOT NULL REFERENCES dbo.Users(Id),
 VerifiedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
IF OBJECT_ID('dbo.SampleShippingQuotes','U') IS NULL
CREATE TABLE dbo.SampleShippingQuotes (
 Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
 ListingId INT NOT NULL REFERENCES dbo.Listings(Id),
 BuyerCompanyId INT NOT NULL REFERENCES dbo.Companies(Id),
 LocationId INT NOT NULL REFERENCES dbo.Locations(Id),
 BoxCode VARCHAR(10) NOT NULL CHECK (BoxCode IN ('small','medium','large')),
 Provider VARCHAR(30) NOT NULL,
 ProviderShipmentId VARCHAR(160) NOT NULL,
 OriginJson NVARCHAR(MAX) NOT NULL CHECK(ISJSON(OriginJson)=1),
 DestinationJson NVARCHAR(MAX) NOT NULL CHECK(ISJSON(DestinationJson)=1),
 RatesJson NVARCHAR(MAX) NOT NULL CHECK(ISJSON(RatesJson)=1),
 ExpiresAt DATETIME2 NOT NULL,
 CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
IF OBJECT_ID('dbo.SampleShipping','U') IS NULL
CREATE TABLE dbo.SampleShipping (
 SampleRequestId INT NOT NULL PRIMARY KEY REFERENCES dbo.SampleRequests(Id),
 QuoteId UNIQUEIDENTIFIER NOT NULL UNIQUE REFERENCES dbo.SampleShippingQuotes(Id),
 RateId VARCHAR(160) NOT NULL,
 Carrier VARCHAR(40) NOT NULL,
 Service VARCHAR(80) NOT NULL,
 ShippingCents INT NOT NULL CHECK(ShippingCents > 0),
 Currency CHAR(3) NOT NULL DEFAULT 'USD' CHECK(Currency='USD'),
 State VARCHAR(30) NOT NULL DEFAULT 'payment_pending'
  CHECK(State IN ('payment_pending','paid','awaiting_dispatch','in_transit','delivered','declined','expired','delivery_failed')),
 PaymentSessionId VARCHAR(160) NULL,
 PaymentIntentId VARCHAR(160) NULL,
 LabelUrl NVARCHAR(2000) NULL,
 TrackingNumber VARCHAR(160) NULL,
 DispatchDeadline DATETIME2 NULL,
 DispatchedAt DATETIME2 NULL,
 DeliveredAt DATETIME2 NULL,
 IdentityConsentedAt DATETIME2 NOT NULL,
 ReminderSentAt DATETIME2 NULL,
 RefundState VARCHAR(20) NOT NULL DEFAULT 'none' CHECK(RefundState IN ('none','pending','succeeded','failed')),
 RefundId VARCHAR(160) NULL,
 LabelVoidState VARCHAR(20) NOT NULL DEFAULT 'none' CHECK(LabelVoidState IN ('none','pending','succeeded','failed')),
 LastError NVARCHAR(1000) NULL,
 UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
IF OBJECT_ID('dbo.SampleShippingEvents','U') IS NULL
CREATE TABLE dbo.SampleShippingEvents (
 Id BIGINT IDENTITY PRIMARY KEY,
 SampleRequestId INT NOT NULL REFERENCES dbo.SampleRequests(Id),
 EventKey VARCHAR(200) NOT NULL UNIQUE,
 Kind VARCHAR(40) NOT NULL,
 ActorUserId INT NULL REFERENCES dbo.Users(Id),
 Details NVARCHAR(1000) NULL,
 CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
IF OBJECT_ID('dbo.SampleShippingCredits','U') IS NULL
CREATE TABLE dbo.SampleShippingCredits (
 SampleRequestId INT NOT NULL PRIMARY KEY REFERENCES dbo.SampleRequests(Id),
 BuyerCompanyId INT NOT NULL REFERENCES dbo.Companies(Id),
 ListingId INT NOT NULL REFERENCES dbo.Listings(Id),
 AmountCents INT NOT NULL CHECK(AmountCents > 0),
 RedeemedOrderId INT NULL REFERENCES dbo.Orders(Id),
 CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
 RedeemedAt DATETIME2 NULL
);
GO
IF OBJECT_ID('dbo.SampleShippingReferrals','U') IS NULL
CREATE TABLE dbo.SampleShippingReferrals (
 Id INT IDENTITY PRIMARY KEY,
 ListingId INT NOT NULL REFERENCES dbo.Listings(Id),
 BuyerCompanyId INT NOT NULL REFERENCES dbo.Companies(Id),
 RequestedByUserId INT NOT NULL REFERENCES dbo.Users(Id),
 Reason VARCHAR(30) NOT NULL,
 Note NVARCHAR(1000) NOT NULL,
 Status VARCHAR(20) NOT NULL DEFAULT 'new',
 CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
IF OBJECT_ID('dbo.SampleCreditApplications','U') IS NULL
CREATE TABLE dbo.SampleCreditApplications (
 SampleRequestId INT NOT NULL REFERENCES dbo.SampleShippingCredits(SampleRequestId),
 OrderId INT NOT NULL REFERENCES dbo.Orders(Id),
 AmountCents INT NOT NULL CHECK(AmountCents>0),
 CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
 PRIMARY KEY(SampleRequestId,OrderId)
);
GO
IF COL_LENGTH('dbo.Orders','SampleShippingCreditCents') IS NULL
 ALTER TABLE dbo.Orders ADD SampleShippingCreditCents INT NOT NULL DEFAULT 0;
GO
