-- One retained SDS request per buyer company and listing; no existing data changes.
IF OBJECT_ID(N'dbo.ListingSdsRequests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ListingSdsRequests (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ListingSdsRequests PRIMARY KEY,
        ListingId INT NOT NULL CONSTRAINT FK_ListingSdsRequests_Listings REFERENCES dbo.Listings(Id),
        BuyerCompanyId INT NOT NULL CONSTRAINT FK_ListingSdsRequests_BuyerCompanies REFERENCES dbo.Companies(Id),
        RequestedByUserId INT NOT NULL CONSTRAINT FK_ListingSdsRequests_Users REFERENCES dbo.Users(Id),
        NotificationId INT NOT NULL CONSTRAINT FK_ListingSdsRequests_Notifications REFERENCES dbo.Notifications(Id),
        RequestedAt DATETIME2 NOT NULL CONSTRAINT DF_ListingSdsRequests_RequestedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_ListingSdsRequests_ListingBuyer UNIQUE (ListingId, BuyerCompanyId),
        CONSTRAINT UQ_ListingSdsRequests_Notification UNIQUE (NotificationId)
    );
END;
GO
