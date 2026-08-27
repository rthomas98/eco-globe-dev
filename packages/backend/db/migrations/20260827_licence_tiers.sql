SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.LicenceTiers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LicenceTiers (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_LicenceTiers PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_LicenceTiers_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_LicenceTiers_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_LicenceTiers_SortOrder DEFAULT (0),
        CreatedByUserId INT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_LicenceTiers_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL,
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_LicenceTiers_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

MERGE dbo.LicenceTiers AS target
USING (
    VALUES
        ('free', 'Free', 'Permanently free seller tier: publish approved listings with teaser visibility and category/state-level search.', 10),
        ('growth', 'Growth', 'Paid tier (pricing pending): full listing detail, ZIP-radius and feedstock-name search, aggregate buyer-interest data.', 20),
        ('enterprise', 'Enterprise', 'Paid tier (pricing pending): per-facility licensing, multi-site team management, assisted onboarding.', 30)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder, UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

IF COL_LENGTH(N'dbo.SellerProfiles', N'LicenceTierId') IS NULL
BEGIN
    ALTER TABLE dbo.SellerProfiles ADD LicenceTierId INT NULL CONSTRAINT FK_SellerProfiles_LicenceTiers REFERENCES dbo.LicenceTiers(Id);
END;
GO

UPDATE sp
SET sp.LicenceTierId = lt.Id
FROM dbo.SellerProfiles sp
CROSS JOIN dbo.LicenceTiers lt
WHERE lt.Code = 'free' AND sp.LicenceTierId IS NULL;
GO
