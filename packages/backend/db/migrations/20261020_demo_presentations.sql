-- Reviewed public snapshots only. No source records are published or seeded.
IF OBJECT_ID(N'dbo.DemoPresentations', N'U') IS NULL
BEGIN
 CREATE TABLE dbo.DemoPresentations (
  Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  Kind VARCHAR(6) NOT NULL CHECK(Kind IN ('seller','buyer')),
  SourceListingId INT NULL REFERENCES dbo.Listings(Id),
  SourceWantedListingId INT NULL REFERENCES dbo.WantedListings(Id),
  CompanyName NVARCHAR(240) NOT NULL CHECK(LEN(LTRIM(RTRIM(CompanyName)))>0),
  Title NVARCHAR(240) NOT NULL CHECK(LEN(LTRIM(RTRIM(Title)))>0),
  MaterialTypeCode VARCHAR(80) NOT NULL REFERENCES dbo.MaterialTypes(Code),
  Quantity DECIMAL(18,3) NULL CHECK(Quantity>=0),
  QuantityUnitCode VARCHAR(40) NULL,
  Price DECIMAL(18,3) NULL CHECK(Price>=0),
  CurrencyCode CHAR(3) NULL,
  PriceUnitCode VARCHAR(40) NULL,
  PriceEstimated BIT NOT NULL,
  QuantityEstimated BIT NOT NULL,
  IsEnabled BIT NOT NULL DEFAULT 1,
  ApprovedByUserId INT NOT NULL REFERENCES dbo.Users(Id),
  ApprovedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_DemoPresentations_Source CHECK(
   (Kind='seller' AND SourceListingId IS NOT NULL AND SourceWantedListingId IS NULL) OR
   (Kind='buyer' AND SourceListingId IS NULL AND SourceWantedListingId IS NOT NULL)),
  CONSTRAINT CK_DemoPresentations_QuantityUnit CHECK(Quantity IS NULL OR QuantityUnitCode IS NOT NULL),
  CONSTRAINT CK_DemoPresentations_PriceUnit CHECK(Price IS NULL OR (CurrencyCode IS NOT NULL AND PriceUnitCode IS NOT NULL))
 );
 CREATE UNIQUE INDEX UX_DemoPresentations_Listing ON dbo.DemoPresentations(SourceListingId) WHERE SourceListingId IS NOT NULL;
 CREATE UNIQUE INDEX UX_DemoPresentations_Wanted ON dbo.DemoPresentations(SourceWantedListingId) WHERE SourceWantedListingId IS NOT NULL;
END;
GO
