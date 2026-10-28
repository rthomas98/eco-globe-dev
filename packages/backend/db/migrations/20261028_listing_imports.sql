-- Additive, re-runnable storage for actor/company-bound listing import previews.
IF OBJECT_ID(N'dbo.ListingImportPreviews', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ListingImportPreviews (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ListingImportPreviews PRIMARY KEY,
        SellerCompanyId INT NOT NULL CONSTRAINT FK_ListingImportPreviews_Companies REFERENCES dbo.Companies(Id),
        CreatedByUserId INT NOT NULL CONSTRAINT FK_ListingImportPreviews_Users REFERENCES dbo.Users(Id),
        FileSha256 CHAR(64) NOT NULL,
        RowsJson NVARCHAR(MAX) NOT NULL CONSTRAINT CK_ListingImportPreviews_RowsJson CHECK(ISJSON(RowsJson)=1),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ListingImportPreviews_CreatedAt DEFAULT(SYSUTCDATETIME()),
        ExpiresAt DATETIME2 NOT NULL,
        CommittedAt DATETIME2 NULL,
        IdempotencyKey UNIQUEIDENTIFIER NULL,
        ResultJson NVARCHAR(MAX) NULL CONSTRAINT CK_ListingImportPreviews_ResultJson CHECK(ResultJson IS NULL OR ISJSON(ResultJson)=1),
        CONSTRAINT CK_ListingImportPreviews_Commit CHECK(
            (CommittedAt IS NULL AND IdempotencyKey IS NULL AND ResultJson IS NULL) OR
            (CommittedAt IS NOT NULL AND IdempotencyKey IS NOT NULL AND ResultJson IS NOT NULL))
    );
    CREATE INDEX IX_ListingImportPreviews_OwnerExpiry ON dbo.ListingImportPreviews(CreatedByUserId,SellerCompanyId,ExpiresAt);
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_ListingImportPreviews_PendingExpiry' AND object_id=OBJECT_ID(N'dbo.ListingImportPreviews'))
    -- Supports the expired-preview cleanup that runs on every preview upload.
    CREATE INDEX IX_ListingImportPreviews_PendingExpiry ON dbo.ListingImportPreviews(ExpiresAt) WHERE CommittedAt IS NULL;
GO
IF NOT EXISTS(SELECT 1 FROM dbo.RecordTypes WHERE Code='listing_import')
    INSERT dbo.RecordTypes(Code,Name,Description,SortOrder)
    VALUES('listing_import','Listing import','Bulk draft listing import batch.',160);
GO
