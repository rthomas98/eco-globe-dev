/* Additive only: enqueue at creation, never backfill historical requests. */
IF OBJECT_ID(N'dbo.PilotAcknowledgementOutbox', N'U') IS NULL
BEGIN
 CREATE TABLE dbo.PilotAcknowledgementOutbox (
  Id INT IDENTITY PRIMARY KEY,
  RequestId INT NOT NULL UNIQUE REFERENCES dbo.PilotRequests(Id),
  CreatorUserId INT NOT NULL REFERENCES dbo.Users(Id),
  IntendedRecipient NVARCHAR(320) NULL,
  RecipientVerified BIT NOT NULL,
  IsTest BIT NOT NULL,
  EventKey UNIQUEIDENTIFIER NOT NULL UNIQUE,
  PayloadJson NVARCHAR(MAX) NULL CHECK(PayloadJson IS NULL OR ISJSON(PayloadJson)=1),
  State VARCHAR(20) NOT NULL CHECK(State IN ('queued','sending','retry','sent','needs_review')),
  Attempts INT NOT NULL DEFAULT 0 CHECK(Attempts BETWEEN 0 AND 3),
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  FirstAttemptAt DATETIME2 NULL,
  NextAttemptAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  LeaseToken UNIQUEIDENTIFIER NULL,
  LeaseUntil DATETIME2 NULL,
  LastError NVARCHAR(500) NULL,
  ProviderEmailId NVARCHAR(240) NULL,
  SentAt DATETIME2 NULL
 );
 CREATE INDEX IX_PilotAcknowledgementOutbox_Work ON dbo.PilotAcknowledgementOutbox(State,NextAttemptAt,Id);
END;
GO
