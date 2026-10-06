-- Additive only: historic pickup details remain NULL when they were not saved.
IF COL_LENGTH('dbo.Orders', 'PickupContactName') IS NULL
    ALTER TABLE dbo.Orders ADD PickupContactName NVARCHAR(160) NULL;
IF COL_LENGTH('dbo.Orders', 'PickupContactPhone') IS NULL
    ALTER TABLE dbo.Orders ADD PickupContactPhone NVARCHAR(80) NULL;
IF COL_LENGTH('dbo.Orders', 'PickupVehicleDetails') IS NULL
    ALTER TABLE dbo.Orders ADD PickupVehicleDetails NVARCHAR(400) NULL;
