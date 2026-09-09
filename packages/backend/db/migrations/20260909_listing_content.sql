-- Additive migration: existing rows and document references remain intact.
ALTER TABLE dbo.Listings ALTER COLUMN Quantity DECIMAL(18,3) NULL;
ALTER TABLE dbo.Listings ALTER COLUMN MinimumOrderQuantity DECIMAL(18,3) NULL;
ALTER TABLE dbo.Listings ALTER COLUMN PricePerUnit DECIMAL(18,2) NULL;
GO
IF COL_LENGTH('dbo.Listings','SpecificationsJson') IS NULL
 ALTER TABLE dbo.Listings ADD SpecificationsJson NVARCHAR(MAX) NULL CONSTRAINT CK_Listings_SpecificationsJson CHECK (SpecificationsJson IS NULL OR ISJSON(SpecificationsJson)=1);
GO
IF COL_LENGTH('dbo.ListingDocuments','Content') IS NULL
 ALTER TABLE dbo.ListingDocuments ADD Content VARBINARY(MAX) NULL, ContentType VARCHAR(100) NULL, ByteLength INT NULL, Sha256 CHAR(64) NULL, DeletedAt DATETIME2 NULL;
GO
IF OBJECT_ID('dbo.CompanyOnboardingPreferences','U') IS NULL
 CREATE TABLE dbo.CompanyOnboardingPreferences (
 CompanyId INT PRIMARY KEY REFERENCES dbo.Companies(Id),
 Industry NVARCHAR(240) NULL, JobTitle NVARCHAR(240) NULL, Website NVARCHAR(1000) NULL,
 FeedstockInterestsJson NVARCHAR(MAX) NOT NULL DEFAULT ('[]') CHECK(ISJSON(FeedstockInterestsJson)=1),
 OtherFeedstockInterest NVARCHAR(1000) NULL,
 UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME());
GO
IF NOT EXISTS (SELECT 1 FROM dbo.MaterialTypes WHERE Code='other')
 INSERT dbo.MaterialTypes(Code,Name,Description,SortOrder) VALUES('other','Others','Other feedstock material.',50);
GO
