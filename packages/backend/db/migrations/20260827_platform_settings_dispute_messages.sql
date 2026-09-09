-- Platform settings: admin-managed marketplace configuration as JSON values.
IF OBJECT_ID(N'dbo.PlatformSettings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PlatformSettings (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PlatformSettings PRIMARY KEY,
        SettingKey VARCHAR(120) NOT NULL CONSTRAINT UQ_PlatformSettings_Key UNIQUE,
        SettingValue NVARCHAR(MAX) NOT NULL,
        UpdatedByUserId INT NULL CONSTRAINT FK_PlatformSettings_UpdatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_PlatformSettings_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_PlatformSettings_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

-- Dispute messages: the buyer/seller/admin conversation on a dispute.
IF OBJECT_ID(N'dbo.DisputeMessages', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DisputeMessages (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DisputeMessages PRIMARY KEY,
        DisputeId INT NOT NULL CONSTRAINT FK_DisputeMessages_Disputes REFERENCES dbo.Disputes(Id),
        SenderUserId INT NOT NULL CONSTRAINT FK_DisputeMessages_Users REFERENCES dbo.Users(Id),
        SenderRole VARCHAR(20) NOT NULL,
        Body NVARCHAR(2000) NOT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_DisputeMessages_CreatedAt DEFAULT (SYSUTCDATETIME())
    );
    CREATE INDEX IX_DisputeMessages_Dispute ON dbo.DisputeMessages(DisputeId);
END;
