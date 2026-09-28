IF OBJECT_ID('dbo.LogisticsQuotes','U') IS NULL
CREATE TABLE dbo.LogisticsQuotes (
 Id INT IDENTITY PRIMARY KEY, OrderId INT NOT NULL REFERENCES dbo.Orders(Id),
 CarrierId INT NOT NULL REFERENCES dbo.Carriers(Id), Amount DECIMAL(18,2) NOT NULL CHECK(Amount>=0),
 CurrencyCode CHAR(3) NOT NULL, PickupScheduledAt DATETIME2 NOT NULL, EstimatedDeliveryAt DATETIME2 NULL,
 Note NVARCHAR(1000) NULL, Status VARCHAR(20) NOT NULL CHECK(Status IN ('offered','accepted','superseded')),
 CreatedByUserId INT NOT NULL REFERENCES dbo.Users(Id), CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
 AcceptedByUserId INT NULL REFERENCES dbo.Users(Id), AcceptedAt DATETIME2 NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UX_LogisticsQuotes_Current' AND object_id=OBJECT_ID('dbo.LogisticsQuotes'))
CREATE UNIQUE INDEX UX_LogisticsQuotes_Current ON dbo.LogisticsQuotes(OrderId) WHERE Status = 'accepted';
GO
IF OBJECT_ID('dbo.LogisticsShipmentDetails','U') IS NULL
CREATE TABLE dbo.LogisticsShipmentDetails (
 ShipmentId INT NOT NULL PRIMARY KEY REFERENCES dbo.Shipments(Id),
 BolFileName NVARCHAR(240) NULL, BolContent VARBINARY(MAX) NULL, BolUploadedAt DATETIME2 NULL,
 BolUploadedByUserId INT NULL REFERENCES dbo.Users(Id),
 ReceiverName NVARCHAR(200) NULL, DeliveryNotes NVARCHAR(1000) NULL,
 ConfirmedByUserId INT NULL REFERENCES dbo.Users(Id)
);
GO
IF OBJECT_ID('dbo.LogisticsEvents','U') IS NULL
CREATE TABLE dbo.LogisticsEvents (
 Id BIGINT IDENTITY PRIMARY KEY,OrderId INT NOT NULL REFERENCES dbo.Orders(Id),
 ActorUserId INT NOT NULL REFERENCES dbo.Users(Id), Action VARCHAR(40) NOT NULL,
 CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_LogisticsQuotes_Order' AND object_id=OBJECT_ID('dbo.LogisticsQuotes'))
CREATE INDEX IX_LogisticsQuotes_Order ON dbo.LogisticsQuotes(OrderId,Status,Id DESC) INCLUDE(CarrierId,Amount,CurrencyCode,PickupScheduledAt,EstimatedDeliveryAt);
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_LogisticsEvents_Order' AND object_id=OBJECT_ID('dbo.LogisticsEvents'))
CREATE INDEX IX_LogisticsEvents_Order ON dbo.LogisticsEvents(OrderId,Id);
