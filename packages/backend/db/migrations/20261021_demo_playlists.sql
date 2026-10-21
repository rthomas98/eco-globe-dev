-- Presentation-only publication history. No source/account/stock rows are inserted or changed.
IF OBJECT_ID(N'dbo.DemoPlaylists', N'U') IS NULL
BEGIN
 CREATE TABLE dbo.DemoPlaylists (
  Slug VARCHAR(40) NOT NULL PRIMARY KEY CHECK(Slug IN ('fuel-lsu','all')),
  Name NVARCHAR(240) NOT NULL, IsPublic BIT NOT NULL DEFAULT 1, IsEnabled BIT NOT NULL DEFAULT 1,
  CurrentRevision INT NOT NULL DEFAULT 0 CHECK(CurrentRevision>=0), Version ROWVERSION NOT NULL
 );
END;
GO
IF OBJECT_ID(N'dbo.DemoPlaylistRevisions', N'U') IS NULL
 CREATE TABLE dbo.DemoPlaylistRevisions (
  PlaylistSlug VARCHAR(40) NOT NULL REFERENCES dbo.DemoPlaylists(Slug), Revision INT NOT NULL,
  PayloadJson NVARCHAR(MAX) NOT NULL CHECK(ISJSON(PayloadJson)=1),
  ProvenanceJson NVARCHAR(MAX) NOT NULL CHECK(ISJSON(ProvenanceJson)=1),
  Digest CHAR(64) NOT NULL, ApprovedByUserId INT NOT NULL REFERENCES dbo.Users(Id),
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), PRIMARY KEY(PlaylistSlug,Revision)
 );
GO
IF OBJECT_ID(N'dbo.DemoPlaylistSources', N'U') IS NULL
BEGIN
 CREATE TABLE dbo.DemoPlaylistSources (
  PlaylistSlug VARCHAR(40) NOT NULL, Revision INT NOT NULL, EntryId UNIQUEIDENTIFIER NOT NULL,
  Kind VARCHAR(20) NOT NULL CHECK(Kind IN ('listing','wanted','market_record')),
  SourceListingId INT NULL REFERENCES dbo.Listings(Id),
  SourceWantedListingId INT NULL REFERENCES dbo.WantedListings(Id),
  SourceMarketRecordId INT NULL REFERENCES dbo.MarketRecords(Id),
  SourceVersion VARCHAR(64) NOT NULL, IsEnabled BIT NOT NULL DEFAULT 1,
  PRIMARY KEY(PlaylistSlug,Revision,EntryId),
  FOREIGN KEY(PlaylistSlug,Revision) REFERENCES dbo.DemoPlaylistRevisions(PlaylistSlug,Revision),
  CONSTRAINT CK_DemoPlaylistSources_Source CHECK(
   (Kind='listing' AND SourceListingId IS NOT NULL AND SourceWantedListingId IS NULL AND SourceMarketRecordId IS NULL) OR
   (Kind='wanted' AND SourceListingId IS NULL AND SourceWantedListingId IS NOT NULL AND SourceMarketRecordId IS NULL) OR
   (Kind='market_record' AND SourceListingId IS NULL AND SourceWantedListingId IS NULL AND SourceMarketRecordId IS NOT NULL))
 );
 CREATE UNIQUE INDEX UX_DemoPlaylistSources_Listing ON dbo.DemoPlaylistSources(PlaylistSlug,Revision,SourceListingId) WHERE SourceListingId IS NOT NULL;
 CREATE UNIQUE INDEX UX_DemoPlaylistSources_Wanted ON dbo.DemoPlaylistSources(PlaylistSlug,Revision,SourceWantedListingId) WHERE SourceWantedListingId IS NOT NULL;
 CREATE UNIQUE INDEX UX_DemoPlaylistSources_Market ON dbo.DemoPlaylistSources(PlaylistSlug,Revision,SourceMarketRecordId) WHERE SourceMarketRecordId IS NOT NULL;
END;
GO
IF OBJECT_ID(N'dbo.DemoPlaylistMemberships', N'U') IS NULL
 CREATE TABLE dbo.DemoPlaylistMemberships (
  PlaylistSlug VARCHAR(40) NOT NULL REFERENCES dbo.DemoPlaylists(Slug), EntryId UNIQUEIDENTIFIER NOT NULL,
  IsEnabled BIT NOT NULL DEFAULT 1, IsPublic BIT NOT NULL DEFAULT 1, Version ROWVERSION NOT NULL,
  PRIMARY KEY(PlaylistSlug,EntryId)
 );
GO
IF OBJECT_ID(N'dbo.DemoPlaylistProfiles', N'U') IS NULL
 CREATE TABLE dbo.DemoPlaylistProfiles (
  PlaylistSlug VARCHAR(40) NOT NULL REFERENCES dbo.DemoPlaylists(Slug), CompanyId UNIQUEIDENTIFIER NOT NULL,
  IsEnabled BIT NOT NULL DEFAULT 1, Version ROWVERSION NOT NULL,
  PRIMARY KEY(PlaylistSlug,CompanyId)
 );
GO
IF OBJECT_ID(N'dbo.DemoPlaylistPreviews', N'U') IS NULL
BEGIN
 CREATE TABLE dbo.DemoPlaylistPreviews (
  Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY, PlaylistSlug VARCHAR(40) NOT NULL,
  ApprovedByUserId INT NOT NULL REFERENCES dbo.Users(Id), Digest CHAR(64) NOT NULL,
  PayloadJson NVARCHAR(MAX) NOT NULL CHECK(ISJSON(PayloadJson)=1),
  ExpiresAt DATETIME2 NOT NULL, CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CommitKey UNIQUEIDENTIFIER NULL, CommitHash CHAR(64) NULL,
  ResultJson NVARCHAR(MAX) NULL CHECK(ResultJson IS NULL OR ISJSON(ResultJson)=1),
  CommittedAt DATETIME2 NULL,
  CONSTRAINT CK_DemoPlaylistPreviews_Commit CHECK(
   (CommitKey IS NULL AND CommitHash IS NULL AND ResultJson IS NULL AND CommittedAt IS NULL) OR
   (CommitKey IS NOT NULL AND CommitHash IS NOT NULL AND ResultJson IS NOT NULL AND CommittedAt IS NOT NULL))
 );
 CREATE UNIQUE INDEX UX_DemoPlaylistPreviews_CommitKey ON dbo.DemoPlaylistPreviews(ApprovedByUserId,CommitKey) WHERE CommitKey IS NOT NULL;
END;
GO
