IF COL_LENGTH('dbo.SampleRequests','IdempotencyKey') IS NULL ALTER TABLE dbo.SampleRequests ADD IdempotencyKey VARCHAR(100) NULL,PayloadHash CHAR(64) NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_SampleRequests_Retry' AND object_id=OBJECT_ID('dbo.SampleRequests')) CREATE UNIQUE INDEX UX_SampleRequests_Retry ON dbo.SampleRequests(BuyerCompanyId,IdempotencyKey) WHERE IdempotencyKey IS NOT NULL;
GO
-- Additive only; internal authorization reuses admin_override tier.
IF OBJECT_ID('dbo.LabPanels','U') IS NULL
BEGIN
CREATE TABLE dbo.LabPanels (
 Id INT IDENTITY PRIMARY KEY, FamilyCode VARCHAR(80) NOT NULL, Version INT NOT NULL,
 Name NVARCHAR(200) NOT NULL, MaterialTypeCodesJson NVARCHAR(MAX) NOT NULL CHECK (ISJSON(MaterialTypeCodesJson)=1),
 TestsJson NVARCHAR(MAX) NOT NULL CHECK (ISJSON(TestsJson)=1), OptionalTestsJson NVARCHAR(MAX) NOT NULL CHECK (ISJSON(OptionalTestsJson)=1),
 Status VARCHAR(20) NOT NULL CHECK (Status IN ('draft','published','retired')),
 ReviewJson NVARCHAR(MAX) NULL CHECK (ReviewJson IS NULL OR ISJSON(ReviewJson)=1),
 ReviewedByUserId INT NULL REFERENCES dbo.Users(Id), CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT UQ_LabPanels_Version UNIQUE(FamilyCode,Version),
 CONSTRAINT CK_LabPanels_Publication CHECK (Status <> 'published' OR (ReviewJson IS NOT NULL AND ReviewedByUserId IS NOT NULL))
);
CREATE UNIQUE INDEX UX_LabPanels_Published ON dbo.LabPanels(FamilyCode) WHERE Status='published';
END;
GO
IF OBJECT_ID('dbo.LabRequests','U') IS NULL
BEGIN
CREATE TABLE dbo.LabRequests (
 Id INT IDENTITY PRIMARY KEY, ListingId INT NOT NULL REFERENCES dbo.Listings(Id),
 CompanyId INT NOT NULL REFERENCES dbo.Companies(Id), RequestedByUserId INT NOT NULL REFERENCES dbo.Users(Id),
 SampleRequestId INT NULL REFERENCES dbo.SampleRequests(Id), IdempotencyKey VARCHAR(100) NOT NULL, PayloadHash CHAR(64) NOT NULL,
 CategoryCode VARCHAR(80) NOT NULL, PanelId INT NULL REFERENCES dbo.LabPanels(Id), PanelVersion INT NULL,
 ScopeJson NVARCHAR(MAX) NOT NULL CHECK(ISJSON(ScopeJson)=1), OptionalTestIdsJson NVARCHAR(MAX) NOT NULL CHECK(ISJSON(OptionalTestIdsJson)=1),
 Concerns NVARCHAR(4000) NOT NULL DEFAULT '', Turnaround VARCHAR(20) NOT NULL CHECK(Turnaround IN ('standard','expedited','not_urgent')),
 Sharing VARCHAR(10) NOT NULL DEFAULT 'private' CHECK(Sharing IN ('private','shared')),
 Status VARCHAR(30) NOT NULL DEFAULT 'requested' CHECK(Status IN ('requested','reviewing','awaiting_sample','testing','completed','cancelled')),
 OwnerUserId INT NULL REFERENCES dbo.Users(Id), Notes NVARCHAR(MAX) NOT NULL DEFAULT '',
 CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT UQ_LabRequests_Retry UNIQUE(CompanyId,IdempotencyKey)
);
CREATE INDEX IX_LabRequests_Listing ON dbo.LabRequests(ListingId,Sharing);
END;
GO
IF OBJECT_ID('dbo.LabReports','U') IS NULL
BEGIN
CREATE TABLE dbo.LabReports (
 Id INT IDENTITY PRIMARY KEY, RequestId INT NOT NULL REFERENCES dbo.LabRequests(Id),
 LaboratoryName NVARCHAR(200) NOT NULL, BatchReference NVARCHAR(200) NOT NULL, SampleDate DATE NOT NULL, ReportDate DATE NOT NULL,
 ResultsJson NVARCHAR(MAX) NOT NULL CHECK(ISJSON(ResultsJson)=1), FileName NVARCHAR(200) NOT NULL,
 FileBytes VARBINARY(MAX) NOT NULL, ByteLength INT NOT NULL CHECK(ByteLength>0 AND ByteLength<=5242880), Sha256 CHAR(64) NOT NULL,
 Published BIT NOT NULL DEFAULT 0, UploadedByUserId INT NOT NULL REFERENCES dbo.Users(Id),
 CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), CHECK(ReportDate>=SampleDate)
);
CREATE INDEX IX_LabReports_Request ON dbo.LabReports(RequestId);
END;
GO
IF OBJECT_ID('dbo.LabEvents','U') IS NULL
CREATE TABLE dbo.LabEvents (
 Id INT IDENTITY PRIMARY KEY, RequestId INT NOT NULL REFERENCES dbo.LabRequests(Id), ActorUserId INT NOT NULL REFERENCES dbo.Users(Id),
 EventType VARCHAR(40) NOT NULL, Detail NVARCHAR(4000) NOT NULL, CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
IF NOT EXISTS(SELECT 1 FROM dbo.LabPanels WHERE FamilyCode='biomass-wood')
INSERT dbo.LabPanels(FamilyCode,Version,Name,MaterialTypeCodesJson,TestsJson,OptionalTestsJson,Status) VALUES('biomass-wood',1,N'Biomass and wood',N'[]',N'["Moisture", "Ash", "Calorific value", "Volatile matter", "Particle size", "Chlorine and sulphur", "Bulk density"]',N'[{"id": "processing-1", "group": "processing", "label": "Alkali metals / slagging"}, {"id": "processing-2", "group": "processing", "label": "Ash fusion temperature"}, {"id": "processing-3", "group": "processing", "label": "Grindability"}, {"id": "processing-4", "group": "processing", "label": "Thermal stability"}, {"id": "processing-5", "group": "processing", "label": "Durability / fines"}, {"id": "safety-1", "group": "safety", "label": "Heavy metals"}, {"id": "safety-2", "group": "safety", "label": "Halogens"}, {"id": "safety-3", "group": "safety", "label": "PAH"}, {"id": "safety-4", "group": "safety", "label": "PCB"}, {"id": "safety-5", "group": "safety", "label": "Pesticide residues"}, {"id": "safety-6", "group": "safety", "label": "Microbiological"}, {"id": "compliance-1", "group": "compliance", "label": "TCLP leachate"}, {"id": "compliance-2", "group": "compliance", "label": "Waste classification"}, {"id": "compliance-3", "group": "compliance", "label": "Food-contact suitability"}, {"id": "compliance-4", "group": "compliance", "label": "Recycled-content verification"}, {"id": "compliance-5", "group": "compliance", "label": "Biogenic carbon content"}, {"id": "consistency-1", "group": "consistency", "label": "Three samples, same panel"}, {"id": "consistency-2", "group": "consistency", "label": "Variance report"}, {"id": "consistency-3", "group": "consistency", "label": "Sampling by the lab on site"}]','draft');
GO
IF NOT EXISTS(SELECT 1 FROM dbo.LabPanels WHERE FamilyCode='recovered-polymers')
INSERT dbo.LabPanels(FamilyCode,Version,Name,MaterialTypeCodesJson,TestsJson,OptionalTestsJson,Status) VALUES('recovered-polymers',1,N'Recovered polymers',N'[]',N'["Melt flow index", "Density", "Polymer identification", "Contamination", "Moisture", "Colour / yellowness", "Filler content"]',N'[{"id": "processing-1", "group": "processing", "label": "Alkali metals / slagging"}, {"id": "processing-2", "group": "processing", "label": "Ash fusion temperature"}, {"id": "processing-3", "group": "processing", "label": "Grindability"}, {"id": "processing-4", "group": "processing", "label": "Thermal stability"}, {"id": "processing-5", "group": "processing", "label": "Durability / fines"}, {"id": "safety-1", "group": "safety", "label": "Heavy metals"}, {"id": "safety-2", "group": "safety", "label": "Halogens"}, {"id": "safety-3", "group": "safety", "label": "PAH"}, {"id": "safety-4", "group": "safety", "label": "PCB"}, {"id": "safety-5", "group": "safety", "label": "Pesticide residues"}, {"id": "safety-6", "group": "safety", "label": "Microbiological"}, {"id": "compliance-1", "group": "compliance", "label": "TCLP leachate"}, {"id": "compliance-2", "group": "compliance", "label": "Waste classification"}, {"id": "compliance-3", "group": "compliance", "label": "Food-contact suitability"}, {"id": "compliance-4", "group": "compliance", "label": "Recycled-content verification"}, {"id": "compliance-5", "group": "compliance", "label": "Biogenic carbon content"}, {"id": "consistency-1", "group": "consistency", "label": "Three samples, same panel"}, {"id": "consistency-2", "group": "consistency", "label": "Variance report"}, {"id": "consistency-3", "group": "consistency", "label": "Sampling by the lab on site"}]','draft');
GO
IF NOT EXISTS(SELECT 1 FROM dbo.LabPanels WHERE FamilyCode='oils-liquids')
INSERT dbo.LabPanels(FamilyCode,Version,Name,MaterialTypeCodesJson,TestsJson,OptionalTestsJson,Status) VALUES('oils-liquids',1,N'Oils and liquids',N'[]',N'["Free fatty acids", "Water and sediment", "Sulphur", "Viscosity", "Flash point", "Metals", "Acid number"]',N'[{"id": "processing-1", "group": "processing", "label": "Alkali metals / slagging"}, {"id": "processing-2", "group": "processing", "label": "Ash fusion temperature"}, {"id": "processing-3", "group": "processing", "label": "Grindability"}, {"id": "processing-4", "group": "processing", "label": "Thermal stability"}, {"id": "processing-5", "group": "processing", "label": "Durability / fines"}, {"id": "safety-1", "group": "safety", "label": "Heavy metals"}, {"id": "safety-2", "group": "safety", "label": "Halogens"}, {"id": "safety-3", "group": "safety", "label": "PAH"}, {"id": "safety-4", "group": "safety", "label": "PCB"}, {"id": "safety-5", "group": "safety", "label": "Pesticide residues"}, {"id": "safety-6", "group": "safety", "label": "Microbiological"}, {"id": "compliance-1", "group": "compliance", "label": "TCLP leachate"}, {"id": "compliance-2", "group": "compliance", "label": "Waste classification"}, {"id": "compliance-3", "group": "compliance", "label": "Food-contact suitability"}, {"id": "compliance-4", "group": "compliance", "label": "Recycled-content verification"}, {"id": "compliance-5", "group": "compliance", "label": "Biogenic carbon content"}, {"id": "consistency-1", "group": "consistency", "label": "Three samples, same panel"}, {"id": "consistency-2", "group": "consistency", "label": "Variance report"}, {"id": "consistency-3", "group": "consistency", "label": "Sampling by the lab on site"}]','draft');
GO
IF NOT EXISTS(SELECT 1 FROM dbo.LabPanels WHERE FamilyCode='mineral-industrial-solids')
INSERT dbo.LabPanels(FamilyCode,Version,Name,MaterialTypeCodesJson,TestsJson,OptionalTestsJson,Status) VALUES('mineral-industrial-solids',1,N'Mineral and industrial solids',N'[]',N'["Elemental composition", "Moisture", "Particle size", "Heavy metals", "pH", "Loss on ignition", "Leachability"]',N'[{"id": "processing-1", "group": "processing", "label": "Alkali metals / slagging"}, {"id": "processing-2", "group": "processing", "label": "Ash fusion temperature"}, {"id": "processing-3", "group": "processing", "label": "Grindability"}, {"id": "processing-4", "group": "processing", "label": "Thermal stability"}, {"id": "processing-5", "group": "processing", "label": "Durability / fines"}, {"id": "safety-1", "group": "safety", "label": "Heavy metals"}, {"id": "safety-2", "group": "safety", "label": "Halogens"}, {"id": "safety-3", "group": "safety", "label": "PAH"}, {"id": "safety-4", "group": "safety", "label": "PCB"}, {"id": "safety-5", "group": "safety", "label": "Pesticide residues"}, {"id": "safety-6", "group": "safety", "label": "Microbiological"}, {"id": "compliance-1", "group": "compliance", "label": "TCLP leachate"}, {"id": "compliance-2", "group": "compliance", "label": "Waste classification"}, {"id": "compliance-3", "group": "compliance", "label": "Food-contact suitability"}, {"id": "compliance-4", "group": "compliance", "label": "Recycled-content verification"}, {"id": "compliance-5", "group": "compliance", "label": "Biogenic carbon content"}, {"id": "consistency-1", "group": "consistency", "label": "Three samples, same panel"}, {"id": "consistency-2", "group": "consistency", "label": "Variance report"}, {"id": "consistency-3", "group": "consistency", "label": "Sampling by the lab on site"}]','draft');
GO
