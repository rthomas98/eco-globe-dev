IF COL_LENGTH('dbo.Quotes','WantedListingId') IS NULL
 ALTER TABLE dbo.Quotes ADD WantedListingId INT NULL REFERENCES dbo.WantedListings(Id);
GO
