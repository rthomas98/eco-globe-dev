-- Dedicated technical documentation types for listing attachments.
MERGE dbo.DocumentTypes AS target
USING (
    VALUES
        ('tds', 'TDS', 'Technical data sheet.', 12),
        ('coa', 'COA', 'Certificate of analysis.', 14),
        ('other', 'Other', 'Other supporting document.', 90)
) AS source (Code, Name, Description, SortOrder)
ON target.Code = source.Code
WHEN MATCHED THEN UPDATE SET Name = source.Name, Description = source.Description, SortOrder = source.SortOrder
WHEN NOT MATCHED THEN INSERT (Code, Name, Description, SortOrder)
VALUES (source.Code, source.Name, source.Description, source.SortOrder);
