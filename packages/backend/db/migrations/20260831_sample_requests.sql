-- Pre-purchase sample requests: small lab test batches before bulk escrow.
IF OBJECT_ID(N'dbo.SampleRequests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SampleRequests (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SampleRequests PRIMARY KEY,
        ListingId INT NOT NULL CONSTRAINT FK_SampleRequests_Listings REFERENCES dbo.Listings(Id),
        BuyerCompanyId INT NOT NULL CONSTRAINT FK_SampleRequests_Companies REFERENCES dbo.Companies(Id),
        RequestedByUserId INT NOT NULL CONSTRAINT FK_SampleRequests_Users REFERENCES dbo.Users(Id),
        QuantityLb DECIMAL(10,2) NOT NULL,
        Note NVARCHAR(500) NULL,
        DeliveryAddress NVARCHAR(400) NULL,
        Status VARCHAR(20) NOT NULL CONSTRAINT DF_SampleRequests_Status DEFAULT ('requested'),
        SellerResponse NVARCHAR(500) NULL,
        TrackingNumber VARCHAR(160) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_SampleRequests_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_SampleRequests_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_SampleRequests_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
    CREATE INDEX IX_SampleRequests_Listing ON dbo.SampleRequests(ListingId);
    CREATE INDEX IX_SampleRequests_Buyer ON dbo.SampleRequests(BuyerCompanyId);
END;
