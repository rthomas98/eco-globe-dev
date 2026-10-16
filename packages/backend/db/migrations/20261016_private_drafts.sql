-- Preserve existing IDs, request closure, commercial records, and foreign keys.
IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.Listings') AND name='LocationId' AND is_nullable=0)
 ALTER TABLE dbo.Listings ALTER COLUMN LocationId INT NULL;
IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.Listings') AND name='QuantityUnit' AND is_nullable=0)
 ALTER TABLE dbo.Listings ALTER COLUMN QuantityUnit VARCHAR(40) NULL;
IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.Listings') AND name='CurrencyCode' AND is_nullable=0)
 ALTER TABLE dbo.Listings ALTER COLUMN CurrencyCode CHAR(3) NULL;
GO
IF COL_LENGTH('dbo.WantedListings','IsDraft') IS NULL
 ALTER TABLE dbo.WantedListings ADD IsDraft BIT NOT NULL CONSTRAINT DF_WantedListings_IsDraft DEFAULT(0) WITH VALUES;
IF COL_LENGTH('dbo.WantedListings','NeedByDate') IS NULL
 ALTER TABLE dbo.WantedListings ADD NeedByDate DATE NULL;
GO
IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.WantedListings') AND name='Quantity' AND is_nullable=0)
 ALTER TABLE dbo.WantedListings ALTER COLUMN Quantity DECIMAL(18,3) NULL;
IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.WantedListings') AND name='QuantityUnit' AND is_nullable=0)
 ALTER TABLE dbo.WantedListings ALTER COLUMN QuantityUnit VARCHAR(40) NULL;
IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.WantedListings') AND name='CurrencyCode' AND is_nullable=0)
 ALTER TABLE dbo.WantedListings ALTER COLUMN CurrencyCode CHAR(3) NULL;
IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.WantedListings') AND name='CountryCode' AND is_nullable=0)
 ALTER TABLE dbo.WantedListings ALTER COLUMN CountryCode CHAR(2) NULL;
GO
IF OBJECT_ID('dbo.CK_WantedListings_PrivateDraft','C') IS NULL
 ALTER TABLE dbo.WantedListings WITH CHECK ADD CONSTRAINT CK_WantedListings_PrivateDraft CHECK(IsDraft=0 OR IsOpen=0);
IF OBJECT_ID('dbo.CK_WantedListings_PublishedFields','C') IS NULL
 ALTER TABLE dbo.WantedListings WITH CHECK ADD CONSTRAINT CK_WantedListings_PublishedFields CHECK(IsDraft=1 OR (Quantity IS NOT NULL AND QuantityUnit IS NOT NULL AND CurrencyCode IS NOT NULL AND CountryCode IS NOT NULL));
GO
