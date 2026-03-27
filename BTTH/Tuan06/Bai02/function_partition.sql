
IF OBJECT_ID('dbo.user_shard_01', 'U') IS NOT NULL DROP TABLE dbo.user_shard_01;
IF OBJECT_ID('dbo.user_shard_02', 'U') IS NOT NULL DROP TABLE dbo.user_shard_02;
GO

CREATE TABLE dbo.user_shard_01 (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL
);

CREATE TABLE dbo.user_shard_02 (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL
);
GO

INSERT INTO dbo.user_shard_01(name) VALUES (N'An');
INSERT INTO dbo.user_shard_02(name) VALUES (N'Binh');
INSERT INTO dbo.user_shard_01(name) VALUES (N'Cuong');
GO

SELECT 'user_shard_01' AS shard, * FROM dbo.user_shard_01
UNION ALL
SELECT 'user_shard_02' AS shard, * FROM dbo.user_shard_02;
