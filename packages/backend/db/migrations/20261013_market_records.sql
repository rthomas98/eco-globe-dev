-- Internal research registry. No marketplace/account data is changed.
IF OBJECT_ID(N'dbo.MarketRecords', N'U') IS NULL
BEGIN
 CREATE TABLE dbo.MarketRecords (
  Id INT IDENTITY PRIMARY KEY,
  Role VARCHAR(10) NOT NULL CHECK(Role IN ('seller','buyer')),
  CompanyName NVARCHAR(240) NOT NULL, FacilityName NVARCHAR(160) NULL,
  Feedstock NVARCHAR(500) NOT NULL, FeedstockGroup NVARCHAR(160) NULL, BuyerNeed NVARCHAR(4000) NULL,
  SourceRecordType VARCHAR(40) NOT NULL CHECK(SourceRecordType IN ('confirmed_stream','identified_stream','estimate','prospect','buyer_need')),
  SourceChecked BIT NULL, SourceCitation NVARCHAR(2000) NULL, AddressSource NVARCHAR(2000) NULL,
  SourceCheckedBy NVARCHAR(240) NULL, SourceCheckedAt DATETIME2 NULL,
  Street NVARCHAR(240) NULL, City NVARCHAR(120) NULL, StateProvince NVARCHAR(120) NULL,
  PostalCode NVARCHAR(40) NULL, CountryCode CHAR(2) NULL,
  AddressPurpose VARCHAR(20) NOT NULL CHECK(AddressPurpose IN ('unknown','headquarters','office','facility','pickup')),
  PriceValue DECIMAL(18,2) NULL, PriceCurrency CHAR(3) NULL, PricePerUnit VARCHAR(40) NULL,
  VolumeValue DECIMAL(18,3) NULL CHECK(VolumeValue >= 0), VolumeUnit VARCHAR(40) NULL,
  VolumePeriod VARCHAR(20) NOT NULL CHECK(VolumePeriod IN ('annual','unspecified')),
  PriceStatus VARCHAR(20) NOT NULL CHECK(PriceStatus IN ('unknown','estimated','confirmed')),
  PriceCitation NVARCHAR(2000) NULL, PriceReviewedBy INT NULL REFERENCES dbo.Users(Id), PriceReviewedAt DATETIME2 NULL,
  VolumeStatus VARCHAR(20) NOT NULL CHECK(VolumeStatus IN ('unknown','estimated','confirmed')),
  VolumeCitation NVARCHAR(2000) NULL, VolumeReviewedBy INT NULL REFERENCES dbo.Users(Id), VolumeReviewedAt DATETIME2 NULL,
  AddressStatus VARCHAR(20) NOT NULL CHECK(AddressStatus IN ('unknown','estimated','confirmed')),
  AddressCitation NVARCHAR(2000) NULL, AddressReviewedBy INT NULL REFERENCES dbo.Users(Id), AddressReviewedAt DATETIME2 NULL,
  Status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK(Status IN ('active','archived')),
  ArchivedAt DATETIME2 NULL, ArchivedByUserId INT NULL REFERENCES dbo.Users(Id), ArchiveReason NVARCHAR(1000) NULL,
  ImportBatchId UNIQUEIDENTIFIER NULL, SourceRowRef NVARCHAR(120) NULL,
  CreatedByUserId INT NOT NULL REFERENCES dbo.Users(Id), UpdatedByUserId INT NOT NULL REFERENCES dbo.Users(Id),
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  Version ROWVERSION NOT NULL,
  CONSTRAINT CK_MarketRecords_RoleType CHECK((Role='seller' AND SourceRecordType<>'buyer_need' AND BuyerNeed IS NULL) OR (Role='buyer' AND SourceRecordType IN ('buyer_need','prospect'))),
  CONSTRAINT CK_MarketRecords_Price CHECK(PriceValue IS NULL OR (PriceCurrency IS NOT NULL AND PricePerUnit IS NOT NULL)),
  CONSTRAINT CK_MarketRecords_Volume CHECK(VolumeValue IS NULL OR VolumeUnit IS NOT NULL),
  CONSTRAINT CK_MarketRecords_PriceReview CHECK((PriceReviewedBy IS NULL AND PriceReviewedAt IS NULL AND PriceStatus<>'confirmed') OR (PriceReviewedBy IS NOT NULL AND PriceReviewedAt IS NOT NULL AND PriceStatus<>'unknown' AND PriceCitation IS NOT NULL)),
  CONSTRAINT CK_MarketRecords_VolumeReview CHECK((VolumeReviewedBy IS NULL AND VolumeReviewedAt IS NULL AND VolumeStatus<>'confirmed') OR (VolumeReviewedBy IS NOT NULL AND VolumeReviewedAt IS NOT NULL AND VolumeStatus<>'unknown' AND VolumeCitation IS NOT NULL)),
  CONSTRAINT CK_MarketRecords_AddressReview CHECK((AddressReviewedBy IS NULL AND AddressReviewedAt IS NULL AND AddressStatus<>'confirmed') OR (AddressReviewedBy IS NOT NULL AND AddressReviewedAt IS NOT NULL AND AddressStatus<>'unknown' AND AddressCitation IS NOT NULL)),
  CONSTRAINT CK_MarketRecords_Confirmed CHECK((PriceStatus<>'confirmed' OR PriceValue IS NOT NULL) AND (VolumeStatus<>'confirmed' OR VolumeValue IS NOT NULL) AND (AddressStatus<>'confirmed' OR (Street IS NOT NULL AND City IS NOT NULL AND PostalCode IS NOT NULL AND CountryCode IS NOT NULL))),
  CONSTRAINT CK_MarketRecords_Archived CHECK((Status='active' AND ArchivedAt IS NULL AND ArchivedByUserId IS NULL AND ArchiveReason IS NULL) OR (Status='archived' AND ArchivedAt IS NOT NULL AND ArchivedByUserId IS NOT NULL AND ArchiveReason IS NOT NULL))
 );
 CREATE INDEX IX_MarketRecords_StatusRoleId ON dbo.MarketRecords(Status,Role,Id);
END;
GO
IF OBJECT_ID(N'dbo.MarketRecordIdentities', N'U') IS NULL
 CREATE TABLE dbo.MarketRecordIdentities (
  Fingerprint BINARY(32) NOT NULL PRIMARY KEY,
  MarketRecordId INT NOT NULL REFERENCES dbo.MarketRecords(Id),
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
 );
GO
IF OBJECT_ID(N'dbo.MarketRecordImports', N'U') IS NULL
BEGIN
 CREATE TABLE dbo.MarketRecordImports (
  PreviewId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  ActorUserId INT NOT NULL REFERENCES dbo.Users(Id), FileSha256 BINARY(32) NOT NULL,
  ParserVersion VARCHAR(40) NOT NULL, PayloadJson NVARCHAR(MAX) NOT NULL CHECK(ISJSON(PayloadJson)=1 AND DATALENGTH(PayloadJson)<=16777216),
  ExpiresAt DATETIME2 NOT NULL, State VARCHAR(20) NOT NULL DEFAULT 'preview' CHECK(State IN ('preview','committed')),
  CommitKey UNIQUEIDENTIFIER NULL, CommitRequestHash BINARY(32) NULL,
  ResultJson NVARCHAR(MAX) NULL CHECK(ResultJson IS NULL OR ISJSON(ResultJson)=1),
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), CommittedAt DATETIME2 NULL,
  CONSTRAINT CK_MarketRecordImports_State CHECK((State='preview' AND CommitKey IS NULL AND CommitRequestHash IS NULL AND ResultJson IS NULL AND CommittedAt IS NULL) OR (State='committed' AND CommitKey IS NOT NULL AND CommitRequestHash IS NOT NULL AND ResultJson IS NOT NULL AND CommittedAt IS NOT NULL))
 );
 CREATE UNIQUE INDEX UX_MarketRecordImports_CommitKey ON dbo.MarketRecordImports(ActorUserId,CommitKey) WHERE CommitKey IS NOT NULL;
END;
GO
IF OBJECT_ID(N'dbo.MarketRecordImportRows', N'U') IS NULL
 CREATE TABLE dbo.MarketRecordImportRows (
  ImportId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.MarketRecordImports(PreviewId),
  SheetName NVARCHAR(40) NOT NULL, RowNumber INT NOT NULL, RowHash BINARY(32) NOT NULL,
  MarketRecordId INT NULL REFERENCES dbo.MarketRecords(Id), Decision VARCHAR(20) NOT NULL,
  DiagnosticsJson NVARCHAR(MAX) NOT NULL CHECK(ISJSON(DiagnosticsJson)=1),
  PRIMARY KEY(ImportId,SheetName,RowNumber)
 );
GO
IF NOT EXISTS(SELECT 1 FROM dbo.RecordTypes WHERE Code='market_record')
 INSERT dbo.RecordTypes(Code,Name,Description,SortOrder) VALUES('market_record','Market record','Internal research registry.',200);
IF NOT EXISTS(SELECT 1 FROM dbo.RecordTypes WHERE Code='market_record_import')
 INSERT dbo.RecordTypes(Code,Name,Description,SortOrder) VALUES('market_record_import','Market record import','Internal research import.',201);
IF NOT EXISTS(SELECT 1 FROM dbo.AuditActionTypes WHERE Code='archive')
 INSERT dbo.AuditActionTypes(Code,Name,Description,SortOrder) VALUES('archive','Archive','Archive internal record.',200);
IF NOT EXISTS(SELECT 1 FROM dbo.AuditActionTypes WHERE Code='restore')
 INSERT dbo.AuditActionTypes(Code,Name,Description,SortOrder) VALUES('restore','Restore','Restore internal record.',201);
IF NOT EXISTS(SELECT 1 FROM dbo.AuditActionTypes WHERE Code='review')
 INSERT dbo.AuditActionTypes(Code,Name,Description,SortOrder) VALUES('review','Review','Review research field.',202);
IF NOT EXISTS(SELECT 1 FROM dbo.AuditActionTypes WHERE Code='import')
 INSERT dbo.AuditActionTypes(Code,Name,Description,SortOrder) VALUES('import','Import','Commit internal research import.',203);
GO
