-- EcoGlobe Azure SQL baseline schema
-- Internal primary keys use integer identity columns.
-- External provider identifiers are stored separately and do not act as primary keys.
-- This script is idempotent for dev/demo environments.

IF OBJECT_ID(N'dbo.AccountStatuses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AccountStatuses (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AccountStatuses PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_AccountStatuses_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_AccountStatuses_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_AccountStatuses_SortOrder DEFAULT (0),
        CreatedByUserId INT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_AccountStatuses_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL,
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_AccountStatuses_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF COL_LENGTH('dbo.AccountStatuses', 'CreatedByUserId') IS NULL
BEGIN
    ALTER TABLE dbo.AccountStatuses ADD CreatedByUserId INT NULL;
    ALTER TABLE dbo.AccountStatuses ADD CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_AccountStatuses_CreatedAt DEFAULT (SYSUTCDATETIME());
    ALTER TABLE dbo.AccountStatuses ADD UpdatedByUserId INT NULL;
    ALTER TABLE dbo.AccountStatuses ADD UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_AccountStatuses_UpdatedAt DEFAULT (SYSUTCDATETIME());
END;
GO

IF OBJECT_ID(N'dbo.CompanyTypes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CompanyTypes (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CompanyTypes PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_CompanyTypes_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_CompanyTypes_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_CompanyTypes_SortOrder DEFAULT (0),
        CreatedByUserId INT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_CompanyTypes_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL,
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_CompanyTypes_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF COL_LENGTH('dbo.CompanyTypes', 'CreatedByUserId') IS NULL
BEGIN
    ALTER TABLE dbo.CompanyTypes ADD CreatedByUserId INT NULL;
    ALTER TABLE dbo.CompanyTypes ADD CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_CompanyTypes_CreatedAt DEFAULT (SYSUTCDATETIME());
    ALTER TABLE dbo.CompanyTypes ADD UpdatedByUserId INT NULL;
    ALTER TABLE dbo.CompanyTypes ADD UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_CompanyTypes_UpdatedAt DEFAULT (SYSUTCDATETIME());
END;
GO

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
        AuthProviderUserId VARCHAR(200) NULL,
        Name NVARCHAR(200) NOT NULL,
        Email NVARCHAR(320) NOT NULL CONSTRAINT UQ_Users_Email UNIQUE,
        AccountStatusId INT NOT NULL,
        EmailVerifiedAt DATETIME2 NULL,
        EmailVerificationTokenHash VARBINARY(32) NULL,
        EmailVerificationTokenExpiresAt DATETIME2 NULL,
        PasswordResetTokenHash VARBINARY(32) NULL,
        PasswordResetTokenExpiresAt DATETIME2 NULL,
        CreatedByUserId INT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL,
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Users_AccountStatuses FOREIGN KEY (AccountStatusId) REFERENCES dbo.AccountStatuses(Id),
        CONSTRAINT FK_Users_CreatedBy FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(Id),
        CONSTRAINT FK_Users_UpdatedBy FOREIGN KEY (UpdatedByUserId) REFERENCES dbo.Users(Id)
    );
END;
GO

-- Email verification and password recovery are additive to preserve existing data.
IF COL_LENGTH('dbo.Users', 'EmailVerifiedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD EmailVerifiedAt DATETIME2 NULL;
END;
GO

IF COL_LENGTH('dbo.Users', 'EmailVerificationTokenHash') IS NULL ALTER TABLE dbo.Users ADD EmailVerificationTokenHash VARBINARY(32) NULL;
IF COL_LENGTH('dbo.Users', 'EmailVerificationTokenExpiresAt') IS NULL ALTER TABLE dbo.Users ADD EmailVerificationTokenExpiresAt DATETIME2 NULL;
IF COL_LENGTH('dbo.Users', 'PasswordResetTokenHash') IS NULL ALTER TABLE dbo.Users ADD PasswordResetTokenHash VARBINARY(32) NULL;
IF COL_LENGTH('dbo.Users', 'PasswordResetTokenExpiresAt') IS NULL ALTER TABLE dbo.Users ADD PasswordResetTokenExpiresAt DATETIME2 NULL;
GO

-- Existing accounts predate the verification gate; preserve their access.
EXEC sp_executesql N'UPDATE dbo.Users SET EmailVerifiedAt = CreatedAt WHERE EmailVerifiedAt IS NULL;';
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_AccountStatuses_CreatedBy')
BEGIN
    ALTER TABLE dbo.AccountStatuses
        ADD CONSTRAINT FK_AccountStatuses_CreatedBy FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(Id);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_AccountStatuses_UpdatedBy')
BEGIN
    ALTER TABLE dbo.AccountStatuses
        ADD CONSTRAINT FK_AccountStatuses_UpdatedBy FOREIGN KEY (UpdatedByUserId) REFERENCES dbo.Users(Id);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_CompanyTypes_CreatedBy')
BEGIN
    ALTER TABLE dbo.CompanyTypes
        ADD CONSTRAINT FK_CompanyTypes_CreatedBy FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(Id);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_CompanyTypes_UpdatedBy')
BEGIN
    ALTER TABLE dbo.CompanyTypes
        ADD CONSTRAINT FK_CompanyTypes_UpdatedBy FOREIGN KEY (UpdatedByUserId) REFERENCES dbo.Users(Id);
END;
GO

IF OBJECT_ID(N'dbo.MemberRoles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MemberRoles (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_MemberRoles PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_MemberRoles_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_MemberRoles_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_MemberRoles_SortOrder DEFAULT (0),
        CreatedByUserId INT NULL CONSTRAINT FK_MemberRoles_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_MemberRoles_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_MemberRoles_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_MemberRoles_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF OBJECT_ID(N'dbo.PermissionTiers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PermissionTiers (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PermissionTiers PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_PermissionTiers_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_PermissionTiers_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_PermissionTiers_SortOrder DEFAULT (0),
        CreatedByUserId INT NULL CONSTRAINT FK_PermissionTiers_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_PermissionTiers_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_PermissionTiers_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_PermissionTiers_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF OBJECT_ID(N'dbo.LocationTypes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LocationTypes (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_LocationTypes PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_LocationTypes_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_LocationTypes_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_LocationTypes_SortOrder DEFAULT (0),
        CreatedByUserId INT NULL CONSTRAINT FK_LocationTypes_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_LocationTypes_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_LocationTypes_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_LocationTypes_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF OBJECT_ID(N'dbo.MaterialTypes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MaterialTypes (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_MaterialTypes PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_MaterialTypes_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_MaterialTypes_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_MaterialTypes_SortOrder DEFAULT (0),
        CreatedByUserId INT NULL CONSTRAINT FK_MaterialTypes_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_MaterialTypes_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_MaterialTypes_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_MaterialTypes_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF OBJECT_ID(N'dbo.DocumentTypes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DocumentTypes (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DocumentTypes PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_DocumentTypes_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_DocumentTypes_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_DocumentTypes_SortOrder DEFAULT (0),
        CreatedByUserId INT NULL CONSTRAINT FK_DocumentTypes_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_DocumentTypes_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_DocumentTypes_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_DocumentTypes_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF OBJECT_ID(N'dbo.Carriers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Carriers (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Carriers PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_Carriers_Code UNIQUE,
        Name VARCHAR(160) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Carriers_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_Carriers_SortOrder DEFAULT (0),
        CreatedByUserId INT NULL CONSTRAINT FK_Carriers_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Carriers_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_Carriers_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Carriers_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF OBJECT_ID(N'dbo.QuoteStatuses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.QuoteStatuses (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QuoteStatuses PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_QuoteStatuses_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_QuoteStatuses_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_QuoteStatuses_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.OrderStatuses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderStatuses (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_OrderStatuses PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_OrderStatuses_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_OrderStatuses_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_OrderStatuses_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.OrderCreationSources', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderCreationSources (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_OrderCreationSources PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_OrderCreationSources_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_OrderCreationSources_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_OrderCreationSources_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.ShipmentStatuses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ShipmentStatuses (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ShipmentStatuses PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_ShipmentStatuses_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_ShipmentStatuses_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_ShipmentStatuses_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.EscrowProviders', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EscrowProviders (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_EscrowProviders PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_EscrowProviders_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_EscrowProviders_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_EscrowProviders_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.EscrowStatuses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EscrowStatuses (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_EscrowStatuses PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_EscrowStatuses_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_EscrowStatuses_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_EscrowStatuses_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.EscrowReleaseRules', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EscrowReleaseRules (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_EscrowReleaseRules PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_EscrowReleaseRules_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_EscrowReleaseRules_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_EscrowReleaseRules_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.PaymentStatuses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PaymentStatuses (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PaymentStatuses PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_PaymentStatuses_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_PaymentStatuses_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_PaymentStatuses_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.PaymentTypes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PaymentTypes (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PaymentTypes PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_PaymentTypes_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_PaymentTypes_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_PaymentTypes_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.PayoutStatuses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PayoutStatuses (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PayoutStatuses PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_PayoutStatuses_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_PayoutStatuses_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_PayoutStatuses_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.LicenceTiers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LicenceTiers (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_LicenceTiers PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_LicenceTiers_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_LicenceTiers_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_LicenceTiers_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.ContractSources', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ContractSources (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ContractSources PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_ContractSources_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_ContractSources_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_ContractSources_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.ContractStatuses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ContractStatuses (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ContractStatuses PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_ContractStatuses_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_ContractStatuses_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_ContractStatuses_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.SignatureStatuses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SignatureStatuses (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SignatureStatuses PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_SignatureStatuses_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_SignatureStatuses_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_SignatureStatuses_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.NotificationChannels', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.NotificationChannels (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_NotificationChannels PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_NotificationChannels_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_NotificationChannels_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_NotificationChannels_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.NotificationCategories', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.NotificationCategories (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_NotificationCategories PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_NotificationCategories_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_NotificationCategories_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_NotificationCategories_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.NotificationStatuses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.NotificationStatuses (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_NotificationStatuses PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_NotificationStatuses_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_NotificationStatuses_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_NotificationStatuses_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.DisputeIssueTypes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DisputeIssueTypes (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DisputeIssueTypes PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_DisputeIssueTypes_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_DisputeIssueTypes_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_DisputeIssueTypes_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.DisputeStatuses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DisputeStatuses (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DisputeStatuses PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_DisputeStatuses_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_DisputeStatuses_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_DisputeStatuses_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.AuditActionTypes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditActionTypes (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditActionTypes PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_AuditActionTypes_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_AuditActionTypes_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_AuditActionTypes_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.RecordTypes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RecordTypes (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RecordTypes PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_RecordTypes_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_RecordTypes_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_RecordTypes_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.ActorTypes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ActorTypes (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ActorTypes PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_ActorTypes_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_ActorTypes_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_ActorTypes_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.ListingStatuses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ListingStatuses (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ListingStatuses PRIMARY KEY,
        Code VARCHAR(80) NOT NULL CONSTRAINT UQ_ListingStatuses_Code UNIQUE,
        Name VARCHAR(120) NOT NULL,
        Description VARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_ListingStatuses_IsActive DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_ListingStatuses_SortOrder DEFAULT (0)
    );
END;
GO

IF OBJECT_ID(N'dbo.Companies', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Companies (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Companies PRIMARY KEY,
        LegalName NVARCHAR(240) NOT NULL,
        CompanyTypeId INT NOT NULL,
        VerificationStatusId INT NOT NULL,
        CreatedByUserId INT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Companies_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL,
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Companies_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Companies_CompanyTypes FOREIGN KEY (CompanyTypeId) REFERENCES dbo.CompanyTypes(Id),
        CONSTRAINT FK_Companies_VerificationStatuses FOREIGN KEY (VerificationStatusId) REFERENCES dbo.AccountStatuses(Id),
        CONSTRAINT FK_Companies_CreatedBy FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(Id),
        CONSTRAINT FK_Companies_UpdatedBy FOREIGN KEY (UpdatedByUserId) REFERENCES dbo.Users(Id)
    );
END;
GO

IF OBJECT_ID(N'dbo.UserPasswords', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserPasswords (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_UserPasswords PRIMARY KEY,
        UserId INT NOT NULL CONSTRAINT FK_UserPasswords_Users REFERENCES dbo.Users(Id),
        PasswordHash VARBINARY(64) NOT NULL,
        PasswordSalt VARBINARY(32) NOT NULL,
        Iterations INT NOT NULL,
        PasswordUpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserPasswords_PasswordUpdatedAt DEFAULT (SYSUTCDATETIME()),
        CreatedByUserId INT NULL CONSTRAINT FK_UserPasswords_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserPasswords_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_UserPasswords_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserPasswords_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_UserPasswords_User UNIQUE (UserId)
    );
END;
GO

IF OBJECT_ID(N'dbo.UserSessions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserSessions (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_UserSessions PRIMARY KEY,
        UserId INT NOT NULL CONSTRAINT FK_UserSessions_Users REFERENCES dbo.Users(Id),
        TokenHash VARBINARY(32) NOT NULL CONSTRAINT UQ_UserSessions_TokenHash UNIQUE,
        ActiveCompanyId INT NULL CONSTRAINT FK_UserSessions_ActiveCompanies REFERENCES dbo.Companies(Id),
        ActiveRoleCode VARCHAR(40) NOT NULL,
        ExpiresAt DATETIME2 NOT NULL,
        RevokedAt DATETIME2 NULL,
        LastSeenAt DATETIME2 NULL,
        CreatedByUserId INT NULL CONSTRAINT FK_UserSessions_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserSessions_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_UserSessions_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserSessions_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF OBJECT_ID(N'dbo.CompanyMembers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CompanyMembers (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CompanyMembers PRIMARY KEY,
        UserId INT NOT NULL CONSTRAINT FK_CompanyMembers_Users REFERENCES dbo.Users(Id),
        CompanyId INT NOT NULL CONSTRAINT FK_CompanyMembers_Companies REFERENCES dbo.Companies(Id),
        MemberRoleId INT NOT NULL CONSTRAINT FK_CompanyMembers_MemberRoles REFERENCES dbo.MemberRoles(Id),
        PermissionTierId INT NOT NULL CONSTRAINT FK_CompanyMembers_PermissionTiers REFERENCES dbo.PermissionTiers(Id),
        MemberStatusId INT NOT NULL CONSTRAINT FK_CompanyMembers_Statuses REFERENCES dbo.AccountStatuses(Id),
        TransactionApprovalLimit DECIMAL(18,2) NULL,
        CanApproveTransactions BIT NOT NULL CONSTRAINT DF_CompanyMembers_CanApproveTransactions DEFAULT (0),
        CanExecuteTransactions BIT NOT NULL CONSTRAINT DF_CompanyMembers_CanExecuteTransactions DEFAULT (0),
        CreatedByUserId INT NULL CONSTRAINT FK_CompanyMembers_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_CompanyMembers_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_CompanyMembers_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_CompanyMembers_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_CompanyMembers_UserCompany UNIQUE (UserId, CompanyId)
    );
END;
GO

IF OBJECT_ID(N'dbo.BuyerProfiles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BuyerProfiles (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BuyerProfiles PRIMARY KEY,
        CompanyId INT NOT NULL CONSTRAINT FK_BuyerProfiles_Companies REFERENCES dbo.Companies(Id),
        OnboardingStatusId INT NOT NULL CONSTRAINT FK_BuyerProfiles_OnboardingStatuses REFERENCES dbo.AccountStatuses(Id),
        SubscriptionStatusId INT NOT NULL CONSTRAINT FK_BuyerProfiles_SubscriptionStatuses REFERENCES dbo.AccountStatuses(Id),
        BillingStatusId INT NOT NULL CONSTRAINT FK_BuyerProfiles_BillingStatuses REFERENCES dbo.AccountStatuses(Id),
        ApprovalStatusId INT NOT NULL CONSTRAINT FK_BuyerProfiles_ApprovalStatuses REFERENCES dbo.AccountStatuses(Id),
        CreatedByUserId INT NULL CONSTRAINT FK_BuyerProfiles_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_BuyerProfiles_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_BuyerProfiles_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_BuyerProfiles_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_BuyerProfiles_Company UNIQUE (CompanyId)
    );
END;
GO

IF OBJECT_ID(N'dbo.SellerProfiles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SellerProfiles (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SellerProfiles PRIMARY KEY,
        CompanyId INT NOT NULL CONSTRAINT FK_SellerProfiles_Companies REFERENCES dbo.Companies(Id),
        OnboardingStatusId INT NOT NULL CONSTRAINT FK_SellerProfiles_OnboardingStatuses REFERENCES dbo.AccountStatuses(Id),
        SubscriptionStatusId INT NOT NULL CONSTRAINT FK_SellerProfiles_SubscriptionStatuses REFERENCES dbo.AccountStatuses(Id),
        PayoutStatusId INT NOT NULL CONSTRAINT FK_SellerProfiles_PayoutStatuses REFERENCES dbo.PayoutStatuses(Id),
        LicenceTierId INT NULL CONSTRAINT FK_SellerProfiles_LicenceTiers REFERENCES dbo.LicenceTiers(Id),
        ApprovalStatusId INT NOT NULL CONSTRAINT FK_SellerProfiles_ApprovalStatuses REFERENCES dbo.AccountStatuses(Id),
        CreatedByUserId INT NULL CONSTRAINT FK_SellerProfiles_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_SellerProfiles_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_SellerProfiles_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_SellerProfiles_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_SellerProfiles_Company UNIQUE (CompanyId)
    );
END;
GO

IF EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_SellerProfiles_PayoutStatuses'
      AND parent_object_id = OBJECT_ID(N'dbo.SellerProfiles')
      AND referenced_object_id <> OBJECT_ID(N'dbo.PayoutStatuses')
)
BEGIN
    ALTER TABLE dbo.SellerProfiles DROP CONSTRAINT FK_SellerProfiles_PayoutStatuses;
END;
GO

IF OBJECT_ID(N'dbo.SellerProfiles', N'U') IS NOT NULL
   AND NOT EXISTS (
       SELECT 1
       FROM sys.foreign_keys
       WHERE name = N'FK_SellerProfiles_PayoutStatuses'
         AND parent_object_id = OBJECT_ID(N'dbo.SellerProfiles')
   )
BEGIN
    ALTER TABLE dbo.SellerProfiles
    ADD CONSTRAINT FK_SellerProfiles_PayoutStatuses
    FOREIGN KEY (PayoutStatusId) REFERENCES dbo.PayoutStatuses(Id);
END;
GO

IF OBJECT_ID(N'dbo.Locations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Locations (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Locations PRIMARY KEY,
        CompanyId INT NOT NULL CONSTRAINT FK_Locations_Companies REFERENCES dbo.Companies(Id),
        LocationTypeId INT NOT NULL CONSTRAINT FK_Locations_LocationTypes REFERENCES dbo.LocationTypes(Id),
        Name NVARCHAR(160) NOT NULL,
        AddressLine1 NVARCHAR(240) NOT NULL,
        AddressLine2 NVARCHAR(240) NULL,
        City NVARCHAR(120) NOT NULL,
        StateProvince NVARCHAR(120) NULL,
        PostalCode NVARCHAR(40) NULL,
        CountryCode CHAR(2) NOT NULL,
        Latitude DECIMAL(9,6) NULL,
        Longitude DECIMAL(9,6) NULL,
        IsDefault BIT NOT NULL CONSTRAINT DF_Locations_IsDefault DEFAULT (0),
        CreatedByUserId INT NULL CONSTRAINT FK_Locations_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Locations_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_Locations_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Locations_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF OBJECT_ID(N'dbo.Listings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Listings (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Listings PRIMARY KEY,
        SellerCompanyId INT NOT NULL CONSTRAINT FK_Listings_SellerCompanies REFERENCES dbo.Companies(Id),
        LocationId INT NOT NULL CONSTRAINT FK_Listings_Locations REFERENCES dbo.Locations(Id),
        Title NVARCHAR(200) NOT NULL,
        Slug VARCHAR(180) NOT NULL CONSTRAINT UQ_Listings_Slug UNIQUE,
        MaterialTypeId INT NOT NULL CONSTRAINT FK_Listings_MaterialTypes REFERENCES dbo.MaterialTypes(Id),
        Quantity DECIMAL(18,3) NOT NULL,
        QuantityUnit VARCHAR(40) NOT NULL,
        MinimumOrderQuantity DECIMAL(18,3) NOT NULL,
        PricePerUnit DECIMAL(18,2) NOT NULL,
        CurrencyCode CHAR(3) NOT NULL CONSTRAINT DF_Listings_CurrencyCode DEFAULT ('USD'),
        ListingStatusId INT NOT NULL CONSTRAINT FK_Listings_ListingStatuses REFERENCES dbo.ListingStatuses(Id),
        CarbonIntensityKgCo2e DECIMAL(18,3) NULL,
        Description NVARCHAR(MAX) NULL,
        CreatedByUserId INT NULL CONSTRAINT FK_Listings_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Listings_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_Listings_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Listings_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF OBJECT_ID(N'dbo.ListingDocuments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ListingDocuments (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ListingDocuments PRIMARY KEY,
        ListingId INT NOT NULL CONSTRAINT FK_ListingDocuments_Listings REFERENCES dbo.Listings(Id),
        DocumentTypeId INT NOT NULL CONSTRAINT FK_ListingDocuments_DocumentTypes REFERENCES dbo.DocumentTypes(Id),
        FileName NVARCHAR(240) NOT NULL,
        FileUrl NVARCHAR(1000) NOT NULL,
        VerificationStatusId INT NOT NULL CONSTRAINT FK_ListingDocuments_VerificationStatuses REFERENCES dbo.AccountStatuses(Id),
        UploadedByUserId INT NULL CONSTRAINT FK_ListingDocuments_UploadedBy REFERENCES dbo.Users(Id),
        CreatedByUserId INT NULL CONSTRAINT FK_ListingDocuments_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ListingDocuments_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_ListingDocuments_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_ListingDocuments_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF OBJECT_ID(N'dbo.Quotes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Quotes (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Quotes PRIMARY KEY,
        ListingId INT NOT NULL CONSTRAINT FK_Quotes_Listings REFERENCES dbo.Listings(Id),
        BuyerCompanyId INT NOT NULL CONSTRAINT FK_Quotes_BuyerCompanies REFERENCES dbo.Companies(Id),
        SellerCompanyId INT NOT NULL CONSTRAINT FK_Quotes_SellerCompanies REFERENCES dbo.Companies(Id),
        Quantity DECIMAL(18,3) NOT NULL,
        QuantityUnit VARCHAR(40) NOT NULL,
        UnitPrice DECIMAL(18,2) NOT NULL,
        CurrencyCode CHAR(3) NOT NULL CONSTRAINT DF_Quotes_CurrencyCode DEFAULT ('USD'),
        DeliveryTerms NVARCHAR(500) NULL,
        QuoteStatusId INT NOT NULL CONSTRAINT FK_Quotes_QuoteStatuses REFERENCES dbo.QuoteStatuses(Id),
        ExpiresAt DATETIME2 NULL,
        CreatedByUserId INT NULL CONSTRAINT FK_Quotes_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Quotes_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_Quotes_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Quotes_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF OBJECT_ID(N'dbo.Orders', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Orders (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Orders PRIMARY KEY,
        QuoteId INT NULL CONSTRAINT FK_Orders_Quotes REFERENCES dbo.Quotes(Id),
        ListingId INT NULL CONSTRAINT FK_Orders_Listings REFERENCES dbo.Listings(Id),
        BuyerCompanyId INT NOT NULL CONSTRAINT FK_Orders_BuyerCompanies REFERENCES dbo.Companies(Id),
        SellerCompanyId INT NOT NULL CONSTRAINT FK_Orders_SellerCompanies REFERENCES dbo.Companies(Id),
        CreationSourceId INT NOT NULL CONSTRAINT FK_Orders_OrderCreationSources REFERENCES dbo.OrderCreationSources(Id),
        OrderStatusId INT NOT NULL CONSTRAINT FK_Orders_OrderStatuses REFERENCES dbo.OrderStatuses(Id),
        TotalAmount DECIMAL(18,2) NOT NULL,
        CurrencyCode CHAR(3) NOT NULL CONSTRAINT DF_Orders_CurrencyCode DEFAULT ('USD'),
        EscrowRequired BIT NOT NULL,
        DirectOrderReason NVARCHAR(1000) NULL,
        CreatedByUserId INT NULL CONSTRAINT FK_Orders_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Orders_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_Orders_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Orders_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF OBJECT_ID(N'dbo.Shipments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Shipments (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Shipments PRIMARY KEY,
        OrderId INT NOT NULL CONSTRAINT FK_Shipments_Orders REFERENCES dbo.Orders(Id),
        CarrierId INT NULL CONSTRAINT FK_Shipments_Carriers REFERENCES dbo.Carriers(Id),
        TrackingNumber VARCHAR(160) NULL,
        OriginLocationId INT NULL CONSTRAINT FK_Shipments_OriginLocations REFERENCES dbo.Locations(Id),
        DestinationLocationId INT NULL CONSTRAINT FK_Shipments_DestinationLocations REFERENCES dbo.Locations(Id),
        ShipmentStatusId INT NOT NULL CONSTRAINT FK_Shipments_ShipmentStatuses REFERENCES dbo.ShipmentStatuses(Id),
        ShippingCost DECIMAL(18,2) NULL,
        CarbonImpactKgCo2e DECIMAL(18,3) NULL,
        PickupScheduledAt DATETIME2 NULL,
        DeliveryConfirmedAt DATETIME2 NULL,
        CreatedByUserId INT NULL CONSTRAINT FK_Shipments_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Shipments_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_Shipments_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Shipments_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF OBJECT_ID(N'dbo.Escrows', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Escrows (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Escrows PRIMARY KEY,
        OrderId INT NOT NULL CONSTRAINT FK_Escrows_Orders REFERENCES dbo.Orders(Id),
        EscrowProviderId INT NOT NULL CONSTRAINT FK_Escrows_EscrowProviders REFERENCES dbo.EscrowProviders(Id),
        ProviderEscrowId VARCHAR(200) NULL,
        Amount DECIMAL(18,2) NOT NULL,
        CurrencyCode CHAR(3) NOT NULL CONSTRAINT DF_Escrows_CurrencyCode DEFAULT ('USD'),
        EscrowStatusId INT NOT NULL CONSTRAINT FK_Escrows_EscrowStatuses REFERENCES dbo.EscrowStatuses(Id),
        ThresholdAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_Escrows_ThresholdAmount DEFAULT (1000),
        ReleaseRuleId INT NOT NULL CONSTRAINT FK_Escrows_EscrowReleaseRules REFERENCES dbo.EscrowReleaseRules(Id),
        DisputeLocked BIT NOT NULL CONSTRAINT DF_Escrows_DisputeLocked DEFAULT (0),
        CreatedByUserId INT NULL CONSTRAINT FK_Escrows_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Escrows_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_Escrows_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Escrows_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_Escrows_Order UNIQUE (OrderId)
    );
END;
GO

IF OBJECT_ID(N'dbo.Payments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Payments (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Payments PRIMARY KEY,
        OrderId INT NOT NULL CONSTRAINT FK_Payments_Orders REFERENCES dbo.Orders(Id),
        EscrowId INT NULL CONSTRAINT FK_Payments_Escrows REFERENCES dbo.Escrows(Id),
        PayerCompanyId INT NOT NULL CONSTRAINT FK_Payments_PayerCompanies REFERENCES dbo.Companies(Id),
        ProviderPaymentId VARCHAR(200) NULL,
        Amount DECIMAL(18,2) NOT NULL,
        CurrencyCode CHAR(3) NOT NULL CONSTRAINT DF_Payments_CurrencyCode DEFAULT ('USD'),
        PaymentStatusId INT NOT NULL CONSTRAINT FK_Payments_PaymentStatuses REFERENCES dbo.PaymentStatuses(Id),
        PaymentTypeId INT NOT NULL CONSTRAINT FK_Payments_PaymentTypes REFERENCES dbo.PaymentTypes(Id),
        CreatedByUserId INT NULL CONSTRAINT FK_Payments_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Payments_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_Payments_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Payments_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF OBJECT_ID(N'dbo.Payouts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Payouts (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Payouts PRIMARY KEY,
        OrderId INT NOT NULL CONSTRAINT FK_Payouts_Orders REFERENCES dbo.Orders(Id),
        EscrowId INT NULL CONSTRAINT FK_Payouts_Escrows REFERENCES dbo.Escrows(Id),
        SellerCompanyId INT NOT NULL CONSTRAINT FK_Payouts_SellerCompanies REFERENCES dbo.Companies(Id),
        ProviderPayoutId VARCHAR(200) NULL,
        Amount DECIMAL(18,2) NOT NULL,
        CurrencyCode CHAR(3) NOT NULL CONSTRAINT DF_Payouts_CurrencyCode DEFAULT ('USD'),
        PayoutStatusId INT NOT NULL CONSTRAINT FK_Payouts_PayoutStatuses REFERENCES dbo.PayoutStatuses(Id),
        CreatedByUserId INT NULL CONSTRAINT FK_Payouts_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Payouts_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_Payouts_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Payouts_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF OBJECT_ID(N'dbo.Contracts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Contracts (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Contracts PRIMARY KEY,
        BuyerCompanyId INT NOT NULL CONSTRAINT FK_Contracts_BuyerCompanies REFERENCES dbo.Companies(Id),
        SellerCompanyId INT NOT NULL CONSTRAINT FK_Contracts_SellerCompanies REFERENCES dbo.Companies(Id),
        ListingId INT NULL CONSTRAINT FK_Contracts_Listings REFERENCES dbo.Listings(Id),
        ContractSourceId INT NOT NULL CONSTRAINT FK_Contracts_ContractSources REFERENCES dbo.ContractSources(Id),
        ContractStatusId INT NOT NULL CONSTRAINT FK_Contracts_ContractStatuses REFERENCES dbo.ContractStatuses(Id),
        Title NVARCHAR(220) NOT NULL,
        RenewalTerms NVARCHAR(1000) NULL,
        RenewalDate DATE NULL,
        ProviderName VARCHAR(80) NULL,
        ProviderEnvelopeId VARCHAR(200) NULL,
        ProviderTemplateId VARCHAR(200) NULL,
        SignedDocumentUrl NVARCHAR(1000) NULL,
        CompletionCertificateUrl NVARCHAR(1000) NULL,
        CompletedAt DATETIME2 NULL,
        CreatedByUserId INT NULL CONSTRAINT FK_Contracts_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Contracts_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_Contracts_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Contracts_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF COL_LENGTH(N'dbo.Contracts', N'ProviderName') IS NULL ALTER TABLE dbo.Contracts ADD ProviderName VARCHAR(80) NULL;
IF COL_LENGTH(N'dbo.Contracts', N'ProviderEnvelopeId') IS NULL ALTER TABLE dbo.Contracts ADD ProviderEnvelopeId VARCHAR(200) NULL;
IF COL_LENGTH(N'dbo.Contracts', N'ProviderTemplateId') IS NULL ALTER TABLE dbo.Contracts ADD ProviderTemplateId VARCHAR(200) NULL;
IF COL_LENGTH(N'dbo.Contracts', N'CompletionCertificateUrl') IS NULL ALTER TABLE dbo.Contracts ADD CompletionCertificateUrl NVARCHAR(1000) NULL;
IF COL_LENGTH(N'dbo.Contracts', N'CompletedAt') IS NULL ALTER TABLE dbo.Contracts ADD CompletedAt DATETIME2 NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Contracts_ProviderEnvelopeId' AND object_id = OBJECT_ID(N'dbo.Contracts'))
    CREATE UNIQUE INDEX UX_Contracts_ProviderEnvelopeId ON dbo.Contracts(ProviderEnvelopeId) WHERE ProviderEnvelopeId IS NOT NULL;
GO

IF OBJECT_ID(N'dbo.Signatures', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Signatures (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Signatures PRIMARY KEY,
        ContractId INT NOT NULL CONSTRAINT FK_Signatures_Contracts REFERENCES dbo.Contracts(Id),
        SignerUserId INT NOT NULL CONSTRAINT FK_Signatures_SignerUsers REFERENCES dbo.Users(Id),
        SignerCompanyId INT NOT NULL CONSTRAINT FK_Signatures_SignerCompanies REFERENCES dbo.Companies(Id),
        ProviderName VARCHAR(80) NULL,
        ProviderEnvelopeId VARCHAR(200) NULL,
        ProviderSignatureId VARCHAR(200) NULL,
        ProviderRecipientId VARCHAR(200) NULL,
        ProviderClientUserId VARCHAR(200) NULL,
        SignatureStatusId INT NOT NULL CONSTRAINT FK_Signatures_SignatureStatuses REFERENCES dbo.SignatureStatuses(Id),
        SignedDocumentUrl NVARCHAR(1000) NULL,
        SentAt DATETIME2 NULL,
        DeliveredAt DATETIME2 NULL,
        SignedAt DATETIME2 NULL,
        DeclinedAt DATETIME2 NULL,
        CreatedByUserId INT NULL CONSTRAINT FK_Signatures_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Signatures_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_Signatures_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Signatures_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF COL_LENGTH(N'dbo.Signatures', N'ProviderName') IS NULL ALTER TABLE dbo.Signatures ADD ProviderName VARCHAR(80) NULL;
IF COL_LENGTH(N'dbo.Signatures', N'ProviderEnvelopeId') IS NULL ALTER TABLE dbo.Signatures ADD ProviderEnvelopeId VARCHAR(200) NULL;
IF COL_LENGTH(N'dbo.Signatures', N'ProviderRecipientId') IS NULL ALTER TABLE dbo.Signatures ADD ProviderRecipientId VARCHAR(200) NULL;
IF COL_LENGTH(N'dbo.Signatures', N'ProviderClientUserId') IS NULL ALTER TABLE dbo.Signatures ADD ProviderClientUserId VARCHAR(200) NULL;
IF COL_LENGTH(N'dbo.Signatures', N'SentAt') IS NULL ALTER TABLE dbo.Signatures ADD SentAt DATETIME2 NULL;
IF COL_LENGTH(N'dbo.Signatures', N'DeliveredAt') IS NULL ALTER TABLE dbo.Signatures ADD DeliveredAt DATETIME2 NULL;
IF COL_LENGTH(N'dbo.Signatures', N'DeclinedAt') IS NULL ALTER TABLE dbo.Signatures ADD DeclinedAt DATETIME2 NULL;
GO

IF OBJECT_ID(N'dbo.SignatureWebhookEvents', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SignatureWebhookEvents (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SignatureWebhookEvents PRIMARY KEY,
        ProviderName VARCHAR(80) NOT NULL,
        ProviderEventId VARCHAR(64) NOT NULL CONSTRAINT UQ_SignatureWebhookEvents_ProviderEventId UNIQUE,
        ProviderEnvelopeId VARCHAR(200) NOT NULL,
        EventType VARCHAR(120) NOT NULL,
        PayloadHash VARCHAR(64) NOT NULL,
        ProcessingStatus VARCHAR(40) NOT NULL CONSTRAINT DF_SignatureWebhookEvents_ProcessingStatus DEFAULT ('received'),
        ProcessingError NVARCHAR(2000) NULL,
        ReceivedAt DATETIME2 NOT NULL CONSTRAINT DF_SignatureWebhookEvents_ReceivedAt DEFAULT (SYSUTCDATETIME()),
        ProcessedAt DATETIME2 NULL
    );
END;
GO

IF OBJECT_ID(N'dbo.Notifications', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Notifications (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Notifications PRIMARY KEY,
        UserId INT NULL CONSTRAINT FK_Notifications_Users REFERENCES dbo.Users(Id),
        CompanyId INT NULL CONSTRAINT FK_Notifications_Companies REFERENCES dbo.Companies(Id),
        RelatedRecordTypeId INT NULL CONSTRAINT FK_Notifications_RecordTypes REFERENCES dbo.RecordTypes(Id),
        RelatedRecordId INT NULL,
        NotificationChannelId INT NOT NULL CONSTRAINT FK_Notifications_Channels REFERENCES dbo.NotificationChannels(Id),
        NotificationCategoryId INT NOT NULL CONSTRAINT FK_Notifications_Categories REFERENCES dbo.NotificationCategories(Id),
        NotificationStatusId INT NOT NULL CONSTRAINT FK_Notifications_Statuses REFERENCES dbo.NotificationStatuses(Id),
        Subject NVARCHAR(240) NOT NULL,
        Body NVARCHAR(MAX) NOT NULL,
        SentAt DATETIME2 NULL,
        ReadAt DATETIME2 NULL,
        CreatedByUserId INT NULL CONSTRAINT FK_Notifications_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Notifications_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_Notifications_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Notifications_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF OBJECT_ID(N'dbo.NotificationPreferences', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.NotificationPreferences (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_NotificationPreferences PRIMARY KEY,
        UserId INT NULL CONSTRAINT FK_NotificationPreferences_Users REFERENCES dbo.Users(Id),
        CompanyId INT NULL CONSTRAINT FK_NotificationPreferences_Companies REFERENCES dbo.Companies(Id),
        NotificationChannelId INT NOT NULL CONSTRAINT FK_NotificationPreferences_Channels REFERENCES dbo.NotificationChannels(Id),
        NotificationCategoryId INT NOT NULL CONSTRAINT FK_NotificationPreferences_Categories REFERENCES dbo.NotificationCategories(Id),
        Enabled BIT NOT NULL CONSTRAINT DF_NotificationPreferences_Enabled DEFAULT (1),
        IsCompanyDefault BIT NOT NULL CONSTRAINT DF_NotificationPreferences_IsCompanyDefault DEFAULT (0),
        CreatedByUserId INT NULL CONSTRAINT FK_NotificationPreferences_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_NotificationPreferences_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_NotificationPreferences_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_NotificationPreferences_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF OBJECT_ID(N'dbo.Disputes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Disputes (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Disputes PRIMARY KEY,
        OrderId INT NULL CONSTRAINT FK_Disputes_Orders REFERENCES dbo.Orders(Id),
        EscrowId INT NULL CONSTRAINT FK_Disputes_Escrows REFERENCES dbo.Escrows(Id),
        ShipmentId INT NULL CONSTRAINT FK_Disputes_Shipments REFERENCES dbo.Shipments(Id),
        OpenedByUserId INT NULL CONSTRAINT FK_Disputes_OpenedBy REFERENCES dbo.Users(Id),
        IssueTypeId INT NOT NULL CONSTRAINT FK_Disputes_IssueTypes REFERENCES dbo.DisputeIssueTypes(Id),
        DisputeStatusId INT NOT NULL CONSTRAINT FK_Disputes_Statuses REFERENCES dbo.DisputeStatuses(Id),
        Summary NVARCHAR(500) NOT NULL,
        ResolutionNotes NVARCHAR(MAX) NULL,
        CreatedByUserId INT NULL CONSTRAINT FK_Disputes_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Disputes_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_Disputes_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Disputes_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF OBJECT_ID(N'dbo.AuditLogs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditLogs (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditLogs PRIMARY KEY,
        ActorUserId INT NULL CONSTRAINT FK_AuditLogs_ActorUsers REFERENCES dbo.Users(Id),
        ActorCompanyId INT NULL CONSTRAINT FK_AuditLogs_ActorCompanies REFERENCES dbo.Companies(Id),
        ActorTypeId INT NOT NULL CONSTRAINT FK_AuditLogs_ActorTypes REFERENCES dbo.ActorTypes(Id),
        ActionTypeId INT NOT NULL CONSTRAINT FK_AuditLogs_ActionTypes REFERENCES dbo.AuditActionTypes(Id),
        RecordTypeId INT NOT NULL CONSTRAINT FK_AuditLogs_RecordTypes REFERENCES dbo.RecordTypes(Id),
        RecordId INT NULL,
        PreviousValue NVARCHAR(MAX) NULL,
        NewValue NVARCHAR(MAX) NULL,
        Reason NVARCHAR(1000) NULL,
        IpAddress VARCHAR(64) NULL,
        UserAgent NVARCHAR(500) NULL,
        CreatedByUserId INT NULL CONSTRAINT FK_AuditLogs_CreatedBy REFERENCES dbo.Users(Id),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_AuditLogs_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL CONSTRAINT FK_AuditLogs_UpdatedBy REFERENCES dbo.Users(Id),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_AuditLogs_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );
END;
GO

MERGE dbo.AccountStatuses AS target
USING (
    VALUES
        ('unsubscribed', 'Unsubscribed', 'General account without an active buyer or seller subscription.', 10),
        ('subscribed_buyer', 'Subscribed buyer', 'Buyer account with active marketplace subscription.', 20),
        ('subscribed_seller', 'Subscribed seller', 'Seller account with active marketplace subscription.', 30),
        ('pending_verification', 'Pending verification', 'Profile or company is waiting on verification review.', 40),
        ('verified', 'Verified', 'Profile or company has passed verification.', 50),
        ('active', 'Active', 'Record is active and usable.', 60),
        ('inactive', 'Inactive', 'Record is inactive.', 70),
        ('suspended', 'Suspended', 'Account is restricted from standard marketplace activity.', 90)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN
    UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder, UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.CompanyTypes AS target
USING (
    VALUES
        ('buyer', 'Buyer', 'Company sources feedstocks through EcoGlobe.', 10),
        ('seller', 'Seller', 'Company lists and sells material streams through EcoGlobe.', 20),
        ('both', 'Buyer and seller', 'Company can buy and sell through one EcoGlobe account.', 30)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN
    UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder, UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.MemberRoles AS target
USING (
    VALUES
        ('owner', 'Owner', 'Primary company administrator.', 10),
        ('admin', 'Admin', 'Company administrator.', 20),
        ('buyer_operator', 'Buyer operator', 'Can source and manage buyer-side workflows.', 30),
        ('seller_operator', 'Seller operator', 'Can list and manage seller-side workflows.', 40),
        ('viewer', 'Viewer', 'Read-only company access.', 90)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder, UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.PermissionTiers AS target
USING (
    VALUES
        ('view_only', 'View only', 'Can view records but cannot transact.', 10),
        ('requester', 'Requester', 'Can request quotes and prepare orders.', 20),
        ('approver', 'Approver', 'Can approve transactions up to assigned limits.', 30),
        ('executor', 'Executor', 'Can execute approved transactions.', 40),
        ('admin_override', 'Admin override', 'Internal admin permissions for supported workflows.', 90)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder, UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.LocationTypes AS target
USING (
    VALUES
        ('headquarters', 'Headquarters', 'Company headquarters.', 10),
        ('pickup', 'Pickup site', 'Seller material pickup site.', 20),
        ('delivery', 'Delivery site', 'Buyer delivery destination.', 30),
        ('billing', 'Billing address', 'Billing address.', 40)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder, UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.MaterialTypes AS target
USING (
    VALUES
        ('industrial_byproduct', 'Industrial byproduct', 'Industrial byproduct streams.', 10),
        ('low_co2_feedstock', 'Low CO2 feedstock', 'Lower-carbon feedstock materials.', 20),
        ('certified_feedstock', 'Certified feedstock', 'Feedstocks with supporting certifications.', 30),
        ('used_product', 'Used product', 'Reusable or recoverable used products.', 40)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder, UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.DocumentTypes AS target
USING (
    VALUES
        ('sds', 'SDS', 'Safety data sheet.', 10),
        ('certification', 'Certification', 'Feedstock or sustainability certification.', 20),
        ('lab_report', 'Lab report', 'Material lab report.', 30),
        ('photo', 'Photo', 'Listing or delivery photo.', 40),
        ('contract', 'Contract', 'Contract document.', 50)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder, UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.ListingStatuses AS target
USING (
    VALUES
        ('draft', 'Draft', 'Listing is being prepared.', 10),
        ('pending_review', 'Pending review', 'Listing is waiting for admin or compliance review.', 20),
        ('published', 'Published', 'Listing is visible to buyers.', 30),
        ('paused', 'Paused', 'Listing is temporarily hidden.', 40),
        ('closed', 'Closed', 'Listing is no longer available.', 90)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.QuoteStatuses AS target
USING (
    VALUES
        ('requested', 'Requested', 'Buyer requested quote.', 10),
        ('sent', 'Sent', 'Seller sent quote.', 20),
        ('accepted', 'Accepted', 'Buyer accepted quote.', 30),
        ('expired', 'Expired', 'Quote expired.', 80),
        ('declined', 'Declined', 'Quote declined.', 90)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.OrderStatuses AS target
USING (
    VALUES
        ('draft', 'Draft', 'Order is being prepared.', 10),
        ('approval_required', 'Approval required', 'Order needs buyer approval.', 20),
        ('escrow_required', 'Escrow required', 'Order requires escrow funding.', 30),
        ('in_progress', 'In progress', 'Order is active.', 40),
        ('completed', 'Completed', 'Order completed.', 80),
        ('cancelled', 'Cancelled', 'Order cancelled.', 90)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.OrderCreationSources AS target
USING (
    VALUES
        ('quote_acceptance', 'Quote acceptance', 'Order created from accepted quote.', 10),
        ('listing_checkout', 'Listing checkout', 'Buyer purchased directly from a published listing at the listed price.', 15),
        ('admin_direct', 'Admin direct', 'Order created directly by an admin.', 20),
        ('contract_milestone', 'Contract milestone', 'Order created from recurring contract milestone.', 30)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.ShipmentStatuses AS target
USING (
    VALUES
        ('quote_pending', 'Quote pending', 'Shipping quote is pending.', 10),
        ('scheduled', 'Scheduled', 'Shipment scheduled.', 20),
        ('in_transit', 'In transit', 'Shipment is in transit.', 30),
        ('delivered', 'Delivered', 'Shipment delivered.', 80),
        ('exception', 'Exception', 'Shipment needs attention.', 90)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.Carriers AS target
USING (
    VALUES
        ('ecofreight', 'EcoFreight', 'US, EU, and port drayage.', 10),
        ('greenline_logistics', 'GreenLine Logistics', 'US bulk and regional carrier.', 20),
        ('rapidhaul', 'RapidHaul', 'US expedited logistics.', 30)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder, UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.EscrowProviders AS target
USING (VALUES ('demo_escrow', 'Demo escrow provider', 'Placeholder escrow provider for dev/demo.', 10)) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.EscrowStatuses AS target
USING (
    VALUES
        ('not_required', 'Not required', 'Escrow is not required for this order.', 10),
        ('funding_required', 'Funding required', 'Escrow funding is required.', 20),
        ('funded', 'Funded', 'Escrow has been funded.', 30),
        ('release_pending', 'Release pending', 'Escrow is ready for release review.', 40),
        ('released', 'Released', 'Funds released.', 80),
        ('dispute_locked', 'Dispute locked', 'Funds locked due to dispute.', 90)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.EscrowReleaseRules AS target
USING (
    VALUES
        ('delivery_confirmation', 'Delivery confirmation', 'Release after buyer delivery confirmation.', 10),
        ('admin_approval', 'Admin approval', 'Release after admin approval.', 20),
        ('contract_milestone', 'Contract milestone', 'Release according to contract milestone.', 30)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.PaymentStatuses AS target
USING (
    VALUES
        ('pending', 'Pending', 'Payment pending.', 10),
        ('authorized', 'Authorized', 'Payment authorized.', 20),
        ('captured', 'Captured', 'Payment captured.', 30),
        ('failed', 'Failed', 'Payment failed.', 90),
        ('refunded', 'Refunded', 'Payment refunded.', 95)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.PaymentTypes AS target
USING (
    VALUES
        ('buyer_funding', 'Buyer funding', 'Buyer funds order or escrow.', 10),
        ('platform_fee', 'Platform fee', 'EcoGlobe platform fee.', 20),
        ('refund', 'Refund', 'Buyer refund.', 30)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.PayoutStatuses AS target
USING (
    VALUES
        ('pending', 'Pending', 'Payout pending.', 10),
        ('scheduled', 'Scheduled', 'Payout scheduled.', 20),
        ('paid', 'Paid', 'Payout paid.', 80),
        ('failed', 'Failed', 'Payout failed.', 90)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.LicenceTiers AS target
USING (
    VALUES
        ('free', 'Free', 'Permanently free seller tier: publish approved listings with teaser visibility and category/state-level search.', 10),
        ('growth', 'Growth', 'Paid tier (pricing pending): full listing detail, ZIP-radius and feedstock-name search, aggregate buyer-interest data.', 20),
        ('enterprise', 'Enterprise', 'Paid tier (pricing pending): per-facility licensing, multi-site team management, assisted onboarding.', 30)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.ContractSources AS target
USING (
    VALUES
        ('platform_listing', 'Platform listing', 'Contract is tied to an EcoGlobe listing.', 10),
        ('custom_off_platform', 'Custom off-platform', 'Contract is custom or pre-negotiated outside listing flow.', 20)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.ContractStatuses AS target
USING (
    VALUES
        ('draft', 'Draft', 'Contract draft.', 10),
        ('signature_pending', 'Signature pending', 'Contract waiting on signatures.', 20),
        ('active', 'Active', 'Contract active.', 30),
        ('renewal_due', 'Renewal due', 'Contract renewal due.', 70),
        ('declined', 'Declined', 'A required signer declined the contract.', 80),
        ('voided', 'Voided', 'The signature envelope was voided.', 85),
        ('expired', 'Expired', 'Contract expired.', 90)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.SignatureStatuses AS target
USING (
    VALUES
        ('not_sent', 'Not sent', 'Signature packet not sent.', 10),
        ('sent', 'Sent', 'Signature request sent.', 20),
        ('viewed', 'Viewed', 'Signer viewed document.', 30),
        ('signed', 'Signed', 'Signer completed signature.', 80),
        ('declined', 'Declined', 'Signer declined.', 90)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.NotificationChannels AS target
USING (
    VALUES
        ('in_app', 'In-app', 'In-app notification.', 10),
        ('email', 'Email', 'Email notification.', 20),
        ('sms', 'SMS', 'SMS notification.', 30)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.NotificationCategories AS target
USING (
    VALUES
        ('orders', 'Orders', 'Order lifecycle alerts.', 10),
        ('payments', 'Payments', 'Payment and payout alerts.', 20),
        ('logistics', 'Logistics', 'Shipment and delivery alerts.', 30),
        ('compliance', 'Compliance', 'Compliance deadline alerts.', 40),
        ('sustainability', 'Sustainability', 'Sustainability milestone alerts.', 50)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.NotificationStatuses AS target
USING (
    VALUES
        ('queued', 'Queued', 'Notification queued.', 10),
        ('sent', 'Sent', 'Notification sent.', 20),
        ('delivered', 'Delivered', 'Notification delivered.', 30),
        ('read', 'Read', 'Notification read.', 40),
        ('failed', 'Failed', 'Notification failed.', 90)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.DisputeIssueTypes AS target
USING (
    VALUES
        ('quality', 'Quality', 'Material quality issue.', 10),
        ('delivery', 'Delivery', 'Delivery or logistics issue.', 20),
        ('payment', 'Payment', 'Payment or escrow issue.', 30),
        ('documentation', 'Documentation', 'Document or compliance issue.', 40)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.DisputeStatuses AS target
USING (
    VALUES
        ('open', 'Open', 'Dispute opened.', 10),
        ('under_review', 'Under review', 'Admin review in progress.', 20),
        ('resolved_release', 'Resolved release', 'Resolved by releasing funds.', 70),
        ('resolved_refund', 'Resolved refund', 'Resolved by refunding buyer.', 80),
        ('closed', 'Closed', 'Dispute closed.', 90)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.ActorTypes AS target
USING (
    VALUES
        ('user', 'User', 'Platform user.', 10),
        ('admin', 'Admin', 'Platform admin.', 20),
        ('system', 'System', 'System automation.', 30),
        ('provider', 'Provider', 'External provider callback.', 40)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.AuditActionTypes AS target
USING (
    VALUES
        ('created', 'Created', 'Record created.', 10),
        ('updated', 'Updated', 'Record updated.', 20),
        ('status_changed', 'Status changed', 'Record status changed.', 30),
        ('approved', 'Approved', 'Transaction or workflow approved.', 40),
        ('executed', 'Executed', 'Transaction executed.', 50),
        ('escrow_triggered', 'Escrow triggered', 'Escrow requirement triggered.', 60),
        ('escrow_released', 'Escrow released', 'Escrow released.', 70),
        ('exported', 'Exported', 'Compliance data exported.', 90)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

MERGE dbo.RecordTypes AS target
USING (
    VALUES
        ('user', 'User', 'User record.', 10),
        ('company', 'Company', 'Company record.', 20),
        ('listing', 'Listing', 'Listing record.', 30),
        ('quote', 'Quote', 'Quote record.', 40),
        ('order', 'Order', 'Order record.', 50),
        ('shipment', 'Shipment', 'Shipment record.', 60),
        ('escrow', 'Escrow', 'Escrow record.', 70),
        ('payment', 'Payment', 'Payment record.', 80),
        ('contract', 'Contract', 'Contract record.', 90),
        ('notification', 'Notification', 'Notification record.', 100),
        ('dispute', 'Dispute', 'Dispute record.', 110)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO

DECLARE @tableName SYSNAME;
DECLARE @qualifiedTable NVARCHAR(300);
DECLARE @sql NVARCHAR(MAX);

DECLARE support_field_cursor CURSOR FAST_FORWARD FOR
    SELECT QUOTENAME(SCHEMA_NAME(schema_id)) + N'.' + QUOTENAME(name)
    FROM sys.tables
    WHERE is_ms_shipped = 0
      AND SCHEMA_NAME(schema_id) = N'dbo';

OPEN support_field_cursor;
FETCH NEXT FROM support_field_cursor INTO @qualifiedTable;

WHILE @@FETCH_STATUS = 0
BEGIN
    IF COL_LENGTH(@qualifiedTable, 'CreatedByUserId') IS NULL
    BEGIN
        SET @sql = N'ALTER TABLE ' + @qualifiedTable + N' ADD CreatedByUserId INT NULL;';
        EXEC sp_executesql @sql;
    END;

    IF COL_LENGTH(@qualifiedTable, 'CreatedAt') IS NULL
    BEGIN
        SET @tableName = PARSENAME(REPLACE(REPLACE(@qualifiedTable, '[', ''), ']', ''), 1);
        SET @sql = N'ALTER TABLE ' + @qualifiedTable + N' ADD CreatedAt DATETIME2 NOT NULL CONSTRAINT '
            + QUOTENAME(N'DF_' + @tableName + N'_CreatedAt') + N' DEFAULT (SYSUTCDATETIME());';
        EXEC sp_executesql @sql;
    END;

    IF COL_LENGTH(@qualifiedTable, 'UpdatedByUserId') IS NULL
    BEGIN
        SET @sql = N'ALTER TABLE ' + @qualifiedTable + N' ADD UpdatedByUserId INT NULL;';
        EXEC sp_executesql @sql;
    END;

    IF COL_LENGTH(@qualifiedTable, 'UpdatedAt') IS NULL
    BEGIN
        SET @tableName = PARSENAME(REPLACE(REPLACE(@qualifiedTable, '[', ''), ']', ''), 1);
        SET @sql = N'ALTER TABLE ' + @qualifiedTable + N' ADD UpdatedAt DATETIME2 NOT NULL CONSTRAINT '
            + QUOTENAME(N'DF_' + @tableName + N'_UpdatedAt') + N' DEFAULT (SYSUTCDATETIME());';
        EXEC sp_executesql @sql;
    END;

    FETCH NEXT FROM support_field_cursor INTO @qualifiedTable;
END;

CLOSE support_field_cursor;
DEALLOCATE support_field_cursor;
GO
