-- Additive migration: persistent send reservation survives timeouts and process restarts.
IF COL_LENGTH('dbo.Contracts', 'ProviderSendAttemptId') IS NULL
  ALTER TABLE dbo.Contracts ADD ProviderSendAttemptId VARCHAR(36) NULL;
GO
