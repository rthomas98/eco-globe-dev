-- Immutable, admin-only research PDFs. No listing/company documents or review status changes.
IF OBJECT_ID(N'dbo.MarketReferences', N'U') IS NULL
BEGIN
 CREATE TABLE dbo.MarketReferences (
  Id INT IDENTITY PRIMARY KEY,
  Title NVARCHAR(240) NOT NULL, Material NVARCHAR(500) NOT NULL, Notes NVARCHAR(4000) NULL,
  FileName NVARCHAR(240) NOT NULL, Sha256 BINARY(32) NOT NULL,
  Content VARBINARY(MAX) NOT NULL, SizeBytes INT NOT NULL,
  UploadedByUserId INT NOT NULL REFERENCES dbo.Users(Id),
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_MarketReferences_Sha256 UNIQUE(Sha256),
  CONSTRAINT CK_MarketReferences_Size CHECK(SizeBytes > 0 AND SizeBytes <= 5242880 AND DATALENGTH(Content)=SizeBytes)
 );
END;
GO
IF OBJECT_ID(N'dbo.MarketReferenceRecords', N'U') IS NULL
BEGIN
 CREATE TABLE dbo.MarketReferenceRecords (
  ReferenceId INT NOT NULL REFERENCES dbo.MarketReferences(Id),
  MarketRecordId INT NOT NULL REFERENCES dbo.MarketRecords(Id),
  PRIMARY KEY(ReferenceId,MarketRecordId)
 );
 CREATE INDEX IX_MarketReferenceRecords_Record ON dbo.MarketReferenceRecords(MarketRecordId,ReferenceId);
END;
GO
IF NOT EXISTS(SELECT 1 FROM dbo.RecordTypes WHERE Code='market_reference')
 INSERT dbo.RecordTypes(Code,Name,Description,SortOrder) VALUES('market_reference','Market reference','Internal material reference, not supplier SDS approval.',204);
GO
