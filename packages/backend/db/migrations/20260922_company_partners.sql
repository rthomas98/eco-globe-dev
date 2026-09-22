IF OBJECT_ID('dbo.CompanyPartners', 'U') IS NULL
BEGIN
 CREATE TABLE dbo.CompanyPartners (
  CompanyId INT NOT NULL REFERENCES dbo.Companies(Id),
  PartnerCompanyId INT NOT NULL REFERENCES dbo.Companies(Id),
  Approved BIT NOT NULL DEFAULT 0,
  UpdatedByUserId INT NOT NULL REFERENCES dbo.Users(Id),
  UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_CompanyPartners PRIMARY KEY (CompanyId,PartnerCompanyId),
  CONSTRAINT CK_CompanyPartners_Different CHECK (CompanyId <> PartnerCompanyId)
 );
END;
GO
