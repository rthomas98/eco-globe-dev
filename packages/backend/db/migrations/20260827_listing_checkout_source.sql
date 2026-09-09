SET NOCOUNT ON;
GO

MERGE dbo.OrderCreationSources AS target
USING (
    VALUES
        ('listing_checkout', 'Listing checkout', 'Buyer purchased directly from a published listing at the listed price.', 15)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder) VALUES (source.Code, source.Name, source.Description, source.SortOrder);
GO
