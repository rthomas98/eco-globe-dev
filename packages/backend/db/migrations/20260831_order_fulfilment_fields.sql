-- Order fulfilment details captured at checkout: quantity and the buyer's
-- delivery/pickup preference, previously collected in the UI and discarded.
IF COL_LENGTH('dbo.Orders', 'Quantity') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD
        Quantity DECIMAL(18,3) NULL,
        QuantityUnit VARCHAR(40) NULL,
        DeliveryMethod VARCHAR(20) NULL,
        DeliveryAddress NVARCHAR(400) NULL,
        PickupRequestedAt DATETIME2 NULL;
END;
