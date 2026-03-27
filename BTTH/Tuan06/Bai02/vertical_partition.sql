
IF OBJECT_ID('dbo.user_details', 'U') IS NOT NULL DROP TABLE dbo.user_details;
IF OBJECT_ID('dbo.user_core', 'U') IS NOT NULL DROP TABLE dbo.user_core;
GO

CREATE TABLE dbo.user_core (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL
);

CREATE TABLE dbo.user_details (
    user_id INT NOT NULL PRIMARY KEY,
    bio NVARCHAR(200) NULL,
    address NVARCHAR(200) NULL,
    CONSTRAINT FK_user_details_user_core FOREIGN KEY (user_id) REFERENCES dbo.user_core(id)
);
GO

INSERT INTO dbo.user_core(name) VALUES (N'An'), (N'Binh');
INSERT INTO dbo.user_details(user_id, bio, address)
VALUES (1, N'Student', N'HCM'),
       (2, N'Dev',     N'HN');
GO

SELECT c.id, c.name, d.bio, d.address
FROM dbo.user_core c
JOIN dbo.user_details d ON d.user_id = c.id;
