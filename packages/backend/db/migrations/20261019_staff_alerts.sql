/* Additive: capture staff work, never customer acknowledgement or outbound delivery. */
IF OBJECT_ID(N'dbo.StaffNotificationOutbox', N'U') IS NULL
BEGIN
 CREATE TABLE dbo.StaffNotificationOutbox (
  Id INT IDENTITY PRIMARY KEY,
  EventKey UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() UNIQUE,
  Kind VARCHAR(40) NOT NULL CHECK(Kind IN ('pilot_created','pilot_email_follow_up','listing_pending_review')),
  RecordId INT NOT NULL,
  EventJson NVARCHAR(1000) NOT NULL CHECK(ISJSON(EventJson)=1),
  PayloadJson NVARCHAR(MAX) NULL CHECK(PayloadJson IS NULL OR ISJSON(PayloadJson)=1),
  State VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK(State IN ('queued','sending','retry','sent','needs_review')),
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
 CREATE INDEX IX_StaffNotificationOutbox_Work ON dbo.StaffNotificationOutbox(State,NextAttemptAt,Id);
END;
GO
