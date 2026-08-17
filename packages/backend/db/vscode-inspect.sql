-- EcoGlobe Azure SQL quick inspection.
-- Connect with the "EcoGlobe Azure SQL Dev" profile in the VS Code SQL extension.

SELECT
  DB_NAME() AS database_name,
  SUSER_SNAME() AS login_name,
  SYSUTCDATETIME() AS checked_at_utc;

SELECT
  s.name AS schema_name,
  t.name AS table_name,
  SUM(p.rows) AS row_count
FROM sys.tables AS t
INNER JOIN sys.schemas AS s
  ON s.schema_id = t.schema_id
INNER JOIN sys.partitions AS p
  ON p.object_id = t.object_id
  AND p.index_id IN (0, 1)
GROUP BY
  s.name,
  t.name
ORDER BY
  s.name,
  t.name;

SELECT TOP 25
  l.Id,
  l.Title,
  l.Slug,
  l.Quantity,
  l.QuantityUnit,
  l.MinimumOrderQuantity,
  l.PricePerUnit,
  l.CurrencyCode,
  l.ListingStatusId,
  l.CreatedAt
FROM dbo.Listings AS l
ORDER BY l.CreatedAt DESC;

SELECT TOP 25
  c.Id,
  c.LegalName,
  c.CompanyTypeId,
  c.VerificationStatusId,
  c.CreatedAt
FROM dbo.Companies AS c
ORDER BY c.CreatedAt DESC;
