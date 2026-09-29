IF COL_LENGTH('dbo.CheckoutAttempts','BindingId') IS NULL
 ALTER TABLE dbo.CheckoutAttempts ADD BindingId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID();
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_CheckoutAttempts_Binding' AND object_id=OBJECT_ID('dbo.CheckoutAttempts'))
 CREATE UNIQUE INDEX UX_CheckoutAttempts_Binding ON dbo.CheckoutAttempts(BindingId);
GO
