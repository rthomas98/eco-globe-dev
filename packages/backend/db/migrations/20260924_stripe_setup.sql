IF OBJECT_ID(N'dbo.StripeCompanyBindings',N'U') IS NULL
CREATE TABLE dbo.StripeCompanyBindings (
 CompanyId INT NOT NULL REFERENCES dbo.Companies(Id),
 PlatformAccountId VARCHAR(100) NOT NULL,
 Livemode BIT NOT NULL,
 CustomerId VARCHAR(100) NULL,
 ConnectedAccountId VARCHAR(100) NULL,
 BillingReady BIT NOT NULL DEFAULT 0,
 PayoutReady BIT NOT NULL DEFAULT 0,
 UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT PK_StripeCompanyBindings PRIMARY KEY(CompanyId,PlatformAccountId,Livemode)
);
GO
IF OBJECT_ID(N'dbo.StripeSetupSessions',N'U') IS NULL
CREATE TABLE dbo.StripeSetupSessions (
 SessionId VARCHAR(200) NOT NULL PRIMARY KEY,
 CompanyId INT NOT NULL REFERENCES dbo.Companies(Id),
 PlatformAccountId VARCHAR(100) NOT NULL,
 Livemode BIT NOT NULL,
 CustomerId VARCHAR(100) NOT NULL,
 CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
