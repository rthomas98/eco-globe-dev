SET NOCOUNT ON;
GO

-- Buyer-posted demand (wanted listings) — addresses the cold-start problem.
IF OBJECT_ID(N'dbo.WantedListings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WantedListings (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WantedListings PRIMARY KEY,
        BuyerCompanyId INT NOT NULL CONSTRAINT FK_WantedListings_Companies REFERENCES dbo.Companies(Id),
        Title NVARCHAR(200) NOT NULL,
        MaterialTypeId INT NOT NULL CONSTRAINT FK_WantedListings_MaterialTypes REFERENCES dbo.MaterialTypes(Id),
        Quantity DECIMAL(18,3) NOT NULL,
        QuantityUnit VARCHAR(40) NOT NULL,
        TargetPricePerUnit DECIMAL(18,2) NULL,
        CurrencyCode CHAR(3) NOT NULL CONSTRAINT DF_WantedListings_Currency DEFAULT ('USD'),
        CountryCode CHAR(2) NOT NULL,
        StateProvince NVARCHAR(120) NULL,
        Notes NVARCHAR(2000) NULL,
        IsOpen BIT NOT NULL CONSTRAINT DF_WantedListings_IsOpen DEFAULT (1),
        CreatedByUserId INT NULL CONSTRAINT FK_WantedListings_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_WantedListings_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_WantedListings_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_WantedListings_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

-- Buyer interest events on listings — sellers only ever see aggregates.
IF OBJECT_ID(N'dbo.ListingInterestEvents', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ListingInterestEvents (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ListingInterestEvents PRIMARY KEY,
        ListingId INT NOT NULL CONSTRAINT FK_ListingInterestEvents_Listings REFERENCES dbo.Listings(Id),
        EventType VARCHAR(40) NOT NULL,
        ViewerCompanyId INT NULL CONSTRAINT FK_ListingInterestEvents_Companies REFERENCES dbo.Companies(Id),
        ViewerRegion NVARCHAR(120) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ListingInterestEvents_CreatedAt DEFAULT (SYSUTCDATETIME())
    );
    CREATE INDEX IX_ListingInterestEvents_Listing ON dbo.ListingInterestEvents(ListingId, EventType);
END;
GO

-- Saved searches with alerts — what makes a licence renew.
IF OBJECT_ID(N'dbo.SavedSearches', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SavedSearches (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SavedSearches PRIMARY KEY,
        UserId INT NOT NULL CONSTRAINT FK_SavedSearches_Users REFERENCES dbo.Users(Id),
        Name NVARCHAR(160) NOT NULL,
        SearchQuery NVARCHAR(400) NULL,
        MaterialTypeId INT NULL CONSTRAINT FK_SavedSearches_MaterialTypes REFERENCES dbo.MaterialTypes(Id),
        CountryCode CHAR(2) NULL,
        MaxPricePerUnit DECIMAL(18,2) NULL,
        AlertsEnabled BIT NOT NULL CONSTRAINT DF_SavedSearches_Alerts DEFAULT (1),
        LastNotifiedAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_SavedSearches_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_SavedSearches_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

-- Notification category for marketplace/saved-search alerts.
MERGE dbo.NotificationCategories AS target
USING (
    VALUES ('marketplace', 'Marketplace', 'Saved-search alerts and marketplace matches.', 60)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO
