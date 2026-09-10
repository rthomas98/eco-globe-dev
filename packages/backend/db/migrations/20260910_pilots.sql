IF OBJECT_ID(N'dbo.PilotRequests', N'U') IS NULL
BEGIN
 CREATE TABLE dbo.PilotRequests (
 Id INT IDENTITY PRIMARY KEY, ListingId INT NOT NULL REFERENCES dbo.Listings(Id),
 BuyerCompanyId INT NOT NULL REFERENCES dbo.Companies(Id), SellerCompanyId INT NOT NULL REFERENCES dbo.Companies(Id),
 OriginLocationId INT NOT NULL REFERENCES dbo.Locations(Id), DeliveryLocationId INT NOT NULL REFERENCES dbo.Locations(Id),
 ListingTitle NVARCHAR(200) NOT NULL, OriginLabel NVARCHAR(300) NOT NULL, DestinationLabel NVARCHAR(300) NOT NULL,
 DestinationRegion NVARCHAR(200) NOT NULL,
 LoadChoice VARCHAR(10) NOT NULL, LoadCount INT NOT NULL CHECK(LoadCount BETWEEN 1 AND 100),
 ApproximateTonnage DECIMAL(18,3) NOT NULL CHECK(ApproximateTonnage>0), NeededBy NVARCHAR(240) NOT NULL,
 ConstraintsJson NVARCHAR(MAX) NOT NULL, Objective NVARCHAR(4000) NOT NULL,
 Status VARCHAR(30) NOT NULL DEFAULT 'new' CHECK(Status IN ('new','call_booked','call_held','working_lane','offer_sent','won','lost')),
 ContactPreference VARCHAR(10) NOT NULL DEFAULT 'call', OwnerUserId INT NULL REFERENCES dbo.Users(Id),
 NextAction NVARCHAR(2000) NOT NULL DEFAULT '', BuyerConsentedAt DATETIME2 NULL,
 ClientRequestId VARCHAR(80) NOT NULL, RequestHash VARCHAR(64) NOT NULL,
 CreatedByUserId INT NOT NULL REFERENCES dbo.Users(Id), CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT UQ_PilotRequest_Client UNIQUE(BuyerCompanyId,ClientRequestId)
 );
 CREATE TABLE dbo.PilotSlots (
 Id INT IDENTITY PRIMARY KEY, OwnerUserId INT NOT NULL REFERENCES dbo.Users(Id),
 StartsAt DATETIME2 NOT NULL, EndsAt DATETIME2 NOT NULL,
 RequestId INT NULL REFERENCES dbo.PilotRequests(Id),
 CreatedByUserId INT NOT NULL REFERENCES dbo.Users(Id),
 CONSTRAINT CK_PilotSlot_Duration CHECK(DATEDIFF(minute,StartsAt,EndsAt)=15),
 CONSTRAINT UQ_PilotSlot_OwnerStart UNIQUE(OwnerUserId,StartsAt)
 );
 CREATE UNIQUE INDEX UX_PilotSlot_Request ON dbo.PilotSlots(RequestId) WHERE RequestId IS NOT NULL;
 CREATE TABLE dbo.PilotNotes (
 Id INT IDENTITY PRIMARY KEY, RequestId INT NOT NULL REFERENCES dbo.PilotRequests(Id), Body NVARCHAR(4000) NOT NULL,
 CreatedByUserId INT NOT NULL REFERENCES dbo.Users(Id), CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
 );
 CREATE TABLE dbo.PilotSteps (
 RequestId INT NOT NULL REFERENCES dbo.PilotRequests(Id), StepKey VARCHAR(40) NOT NULL,
 Completed BIT NOT NULL DEFAULT 0, CompletedByUserId INT NULL REFERENCES dbo.Users(Id), CompletedAt DATETIME2 NULL,
 PRIMARY KEY(RequestId,StepKey)
 );
END;
GO
IF COL_LENGTH('dbo.Shipments','PilotRequestId') IS NULL
BEGIN
 ALTER TABLE dbo.Shipments ALTER COLUMN OrderId INT NULL;
 ALTER TABLE dbo.Shipments ADD PilotRequestId INT NULL REFERENCES dbo.PilotRequests(Id);
END;
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_Shipment_Pilot' AND object_id=OBJECT_ID('dbo.Shipments'))
 CREATE UNIQUE INDEX UX_Shipment_Pilot ON dbo.Shipments(PilotRequestId) WHERE PilotRequestId IS NOT NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_Shipment_Source')
 ALTER TABLE dbo.Shipments ADD CONSTRAINT CK_Shipment_Source CHECK((OrderId IS NOT NULL AND PilotRequestId IS NULL) OR (OrderId IS NULL AND PilotRequestId IS NOT NULL));
GO
