IF OBJECT_ID('dbo.FedExSandboxShipments','U') IS NULL
BEGIN
 CREATE TABLE dbo.FedExSandboxShipments (
 Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
 CreatedByUserId INT NOT NULL REFERENCES dbo.Users(Id),
 IdempotencyKey NVARCHAR(100) NOT NULL,
 RequestHash VARCHAR(64) NOT NULL,
 ProviderScope VARCHAR(64) NOT NULL,
 State VARCHAR(30) NOT NULL,
 InputJson NVARCHAR(MAX) NOT NULL CHECK(ISJSON(InputJson)=1),
 QuoteJson NVARCHAR(MAX) NOT NULL CHECK(ISJSON(QuoteJson)=1),
 TrackingNumber VARCHAR(30) NULL,
 LabelBytes VARBINARY(MAX) NULL,
 TrackingJson NVARCHAR(MAX) NULL,
 LastError NVARCHAR(500) NULL,
 CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
 UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
 BookedAt DATETIME2 NULL,
 CancelledAt DATETIME2 NULL,
 CONSTRAINT UQ_FedExSandbox_Idempotency UNIQUE(CreatedByUserId,IdempotencyKey),
 CONSTRAINT CK_FedExSandbox_State CHECK(State IN ('quoted','booking','booking_unknown','booking_failed','booked','cancelling','cancel_failed','cancelled'))
 );
END;
