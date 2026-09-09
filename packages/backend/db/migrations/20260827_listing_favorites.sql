-- Listing favorites: per-user saved listings.
IF OBJECT_ID(N'dbo.ListingFavorites', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ListingFavorites (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ListingFavorites PRIMARY KEY,
        UserId INT NOT NULL CONSTRAINT FK_ListingFavorites_Users REFERENCES dbo.Users(Id),
        ListingId INT NOT NULL CONSTRAINT FK_ListingFavorites_Listings REFERENCES dbo.Listings(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ListingFavorites_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_ListingFavorites_UserListing UNIQUE (UserId, ListingId)
    );
END;
