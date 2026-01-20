# SQLite to MySQL Converter Script
# Converts medlab.db SQLite export to MySQL-compatible SQL

$inputFile = "C:\Users\Leafyhead\Documents\MedLab\project\medlab_sqlite_dump.sql"
$outputFile = "C:\Users\Leafyhead\Documents\MedLab\project\medlab_mysql_converted.sql"

Write-Host "Reading SQLite dump file..." -ForegroundColor Cyan
$content = Get-Content $inputFile -Raw

Write-Host "Converting to MySQL format..." -ForegroundColor Cyan

# Remove SQLite-specific pragmas
$content = $content -replace 'PRAGMA.*?;', ''

# Fix transactions
$content = $content -replace 'BEGIN TRANSACTION;', "SET NAMES utf8mb4;`nSET FOREIGN_KEY_CHECKS=0;`nSET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';`nSTART TRANSACTION;"
$content = $content -replace 'COMMIT;', "COMMIT;`nSET FOREIGN_KEY_CHECKS=1;"

# Convert table names with DROP TABLE
$content = $content -replace 'CREATE TABLE IF NOT EXISTS "(\w+)"', 'DROP TABLE IF EXISTS `$1`;`nCREATE TABLE `$1`'
$content = $content -replace 'CREATE TABLE "(\w+)"', 'DROP TABLE IF EXISTS `$1`;`nCREATE TABLE `$1`'

# Convert double quotes to backticks for identifiers
$content = $content -replace '"([^"]+)"', '`$1`'

# Fix data types
$content = $content -replace 'TEXT NOT NULL PRIMARY KEY', 'VARCHAR(191) NOT NULL PRIMARY KEY'
$content = $content -replace 'TEXT PRIMARY KEY', 'VARCHAR(191) PRIMARY KEY'
$content = $content -replace 'TEXT NOT NULL', 'VARCHAR(191) NOT NULL'
$content = $content -replace 'BOOLEAN NOT NULL', 'TINYINT(1) NOT NULL'
$content = $content -replace 'BOOLEAN', 'TINYINT(1)'
$content = $content -replace 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP', 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)'
$content = $content -replace 'DATETIME NOT NULL', 'DATETIME(3) NOT NULL'
$content = $content -replace 'DATETIME,', 'DATETIME(3),'
$content = $content -replace 'DECIMAL NOT NULL', 'DECIMAL(10,2) NOT NULL'
$content = $content -replace 'DECIMAL,', 'DECIMAL(10,2),'
$content = $content -replace 'INTEGER PRIMARY KEY AUTOINCREMENT', 'INT AUTO_INCREMENT PRIMARY KEY'
$content = $content -replace 'AUTOINCREMENT', 'AUTO_INCREMENT'

# Fix constraints
$content = $content -replace 'CONSTRAINT "(\w+)"', 'CONSTRAINT `$1`'
$content = $content -replace 'FOREIGN KEY \("(\w+)"\)', 'FOREIGN KEY (`$1`)'
$content = $content -replace 'REFERENCES "(\w+)"', 'REFERENCES `$1`'

# Fix indexes
$content = $content -replace 'CREATE INDEX "(\w+)"', 'CREATE INDEX `$1`'
$content = $content -replace 'CREATE UNIQUE INDEX "(\w+)"', 'CREATE UNIQUE INDEX `$1`'
$content = $content -replace 'ON "(\w+)"', 'ON `$1`'

# Add ENGINE and CHARSET
$content = $content -replace '(\);)(?!\s*CREATE)', '$1 ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;'

# Fix INSERT statements - convert INSERT INTO "table" to INSERT INTO `table`
$content = $content -replace "INSERT INTO ""(\w+)""", 'INSERT INTO `$1`'

# Add header
$header = @"
-- MySQL Database Dump
-- Converted from SQLite database: medlab.db
-- Conversion Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
-- Source: C:\Users\Leafyhead\Documents\MedLab\project\medlab.db
--
-- WARNING: This is an automated conversion. Please review before importing!
--

"@

$content = $header + $content

Write-Host "Saving converted file..." -ForegroundColor Cyan
Set-Content -Path $outputFile -Value $content -Encoding UTF8

$fileInfo = Get-Item $outputFile
Write-Host "`nConversion Complete!" -ForegroundColor Green
Write-Host "Output file: $outputFile" -ForegroundColor Yellow
Write-Host "File size: $([math]::Round($fileInfo.Length / 1KB, 2)) KB" -ForegroundColor Yellow
Write-Host "`nTo import into MySQL, run:" -ForegroundColor Cyan
Write-Host "mysql -u root -proot labs < `"$outputFile`"" -ForegroundColor White
