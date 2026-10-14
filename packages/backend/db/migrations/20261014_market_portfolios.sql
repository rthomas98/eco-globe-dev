-- Internal grouping only. Existing records, listings, companies and references are untouched.
IF OBJECT_ID(N'dbo.MarketPortfolios', N'U') IS NULL
BEGIN
 CREATE TABLE dbo.MarketPortfolios (
  Id INT IDENTITY PRIMARY KEY,
  Name NVARCHAR(120) NOT NULL CHECK(LEN(LTRIM(RTRIM(Name)))>0),
  Description NVARCHAR(2000) NULL,
  Status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK(Status IN ('active','archived')),
  CreatedByUserId INT NOT NULL REFERENCES dbo.Users(Id),
  UpdatedByUserId INT NOT NULL REFERENCES dbo.Users(Id),
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  Version ROWVERSION NOT NULL
 );
 CREATE INDEX IX_MarketPortfolios_StatusId ON dbo.MarketPortfolios(Status,Id);
END;
GO
IF OBJECT_ID(N'dbo.MarketPortfolioRecords', N'U') IS NULL
 CREATE TABLE dbo.MarketPortfolioRecords (
  PortfolioId INT NOT NULL REFERENCES dbo.MarketPortfolios(Id),
  RecordId INT NOT NULL REFERENCES dbo.MarketRecords(Id),
  PRIMARY KEY(PortfolioId,RecordId)
 );
IF OBJECT_ID(N'dbo.MarketPortfolioListings', N'U') IS NULL
 CREATE TABLE dbo.MarketPortfolioListings (
  PortfolioId INT NOT NULL REFERENCES dbo.MarketPortfolios(Id),
  ListingId INT NOT NULL REFERENCES dbo.Listings(Id),
  PRIMARY KEY(PortfolioId,ListingId)
 );
IF OBJECT_ID(N'dbo.MarketPortfolioCompanies', N'U') IS NULL
BEGIN
 CREATE TABLE dbo.MarketPortfolioCompanies (
  PortfolioId INT NOT NULL REFERENCES dbo.MarketPortfolios(Id),
  CompanyId INT NOT NULL REFERENCES dbo.Companies(Id),
  PRIMARY KEY(PortfolioId,CompanyId)
 );
 CREATE INDEX IX_MarketPortfolioCompanies_Company ON dbo.MarketPortfolioCompanies(CompanyId,PortfolioId);
END;
GO
IF NOT EXISTS(SELECT 1 FROM dbo.RecordTypes WHERE Code='market_portfolio')
 INSERT dbo.RecordTypes(Code,Name,Description,SortOrder) VALUES('market_portfolio','Market portfolio','Internal research grouping and assigned demo listing selection.',204);
IF NOT EXISTS(SELECT 1 FROM dbo.AuditActionTypes WHERE Code='archive')
 INSERT dbo.AuditActionTypes(Code,Name,Description,SortOrder) VALUES('archive','Archive','Reversible archive.',200);
IF NOT EXISTS(SELECT 1 FROM dbo.AuditActionTypes WHERE Code='restore')
 INSERT dbo.AuditActionTypes(Code,Name,Description,SortOrder) VALUES('restore','Restore','Reversible restore.',201);
GO
