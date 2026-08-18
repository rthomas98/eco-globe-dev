SET NOCOUNT ON;
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

MERGE dbo.ContractStatuses AS target
USING (
    VALUES
        ('declined', 'Declined', 'A required signer declined the contract.', 80),
        ('voided', 'Voided', 'The signature envelope was voided.', 85)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO
