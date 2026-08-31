-- Sample-to-order conversion: links a received sample to the bulk order it led to.
IF COL_LENGTH('dbo.SampleRequests', 'ConvertedOrderId') IS NULL
BEGIN
    ALTER TABLE dbo.SampleRequests
        ADD ConvertedOrderId INT NULL
            CONSTRAINT FK_SampleRequests_ConvertedOrder REFERENCES dbo.Orders(Id);
END;
GO
