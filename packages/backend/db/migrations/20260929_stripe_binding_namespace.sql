IF COL_LENGTH('dbo.StripeCompanyBindings','BindingId') IS NULL
 ALTER TABLE dbo.StripeCompanyBindings ADD BindingId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID();
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_StripeCompanyBindings_Binding' AND object_id=OBJECT_ID('dbo.StripeCompanyBindings'))
 CREATE UNIQUE INDEX UX_StripeCompanyBindings_Binding ON dbo.StripeCompanyBindings(BindingId);
GO
