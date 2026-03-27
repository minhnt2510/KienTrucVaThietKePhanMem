CREATE PROCEDURE sp_SearchItem
    @Keyword NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT id, name, description 
    FROM Items
    WHERE name LIKE '%' + @Keyword + '%' OR description LIKE '%' + @Keyword + '%';
END;
