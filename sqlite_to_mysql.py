import re
import sys

def convert_sqlite_to_mysql(input_file, output_file):
    """Convert SQLite dump to MySQL-compatible SQL"""
    
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove SQLite-specific pragmas
    content = re.sub(r'PRAGMA.*?;', '', content, flags=re.MULTILINE)
    
    # Fix transactions
    content = content.replace('BEGIN TRANSACTION;', 
        'SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\nSET SQL_MODE = \'NO_AUTO_VALUE_ON_ZERO\';\nSTART TRANSACTION;\n')
    content = content.replace('COMMIT;', '\nCOMMIT;\nSET FOREIGN_KEY_CHECKS=1;')
    
    # Convert table creation
    content = re.sub(r'CREATE TABLE (?:IF NOT EXISTS )?"(\w+)"', 
                     r'DROP TABLE IF EXISTS `\1`;\nCREATE TABLE `\1`', content)
    
    # Convert identifiers from double quotes to backticks
    content = re.sub(r'"([^"]+)"', r'`\1`', content)
    
    # Convert data types
    type_conversions = {
        r'TEXT NOT NULL PRIMARY KEY': 'VARCHAR(191) NOT NULL PRIMARY KEY',
        r'TEXT PRIMARY KEY': 'VARCHAR(191) PRIMARY KEY',
        r'TEXT NOT NULL': 'VARCHAR(191) NOT NULL',
        r'TEXT,': 'TEXT,',  # Keep TEXT for description fields (no comma after)
        r'TEXT\)': 'TEXT)',  # Keep TEXT for last column in table
        r'BOOLEAN NOT NULL': 'TINYINT(1) NOT NULL',
        r'BOOLEAN': 'TINYINT(1)',
        r'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP': 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)',
        r'DATETIME NOT NULL': 'DATETIME(3) NOT NULL',
        r'DATETIME,': 'DATETIME(3),',
        r'DATETIME\)': 'DATETIME(3))',
        r'DECIMAL NOT NULL': 'DECIMAL(10,2) NOT NULL',
        r'DECIMAL,': 'DECIMAL(10,2),',
        r'DECIMAL\)': 'DECIMAL(10,2))',
        r'INTEGER PRIMARY KEY AUTOINCREMENT': 'INT AUTO_INCREMENT PRIMARY KEY',
        r'AUTOINCREMENT': 'AUTO_INCREMENT',
    }
    
    # First pass: convert TEXT to VARCHAR for non-description fields
    # Look for phone, email patterns and convert to VARCHAR
    content = re.sub(r'`phone` TEXT', '`phone` VARCHAR(20)', content)
    content = re.sub(r'`email` TEXT', '`email` VARCHAR(191)', content)
    
    for pattern, replacement in type_conversions.items():
        content = re.sub(pattern, replacement, content)
    
    # Add ENGINE and CHARSET to CREATE TABLE statements only
    # This needs to handle multi-line CREATE TABLE statements
    # Replace ); that comes after CREATE TABLE with ENGINE clause
    lines = content.split('\n')
    result_lines = []
    in_create_table = False
    
    for line in lines:
        if 'CREATE TABLE' in line:
            in_create_table = True
            result_lines.append(line)
        elif in_create_table and line.strip() == ');':
            result_lines.append('              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;')
            in_create_table = False
        else:
            result_lines.append(line)
    
    content = '\n'.join(result_lines)
    
    # Add header
    header = """-- MySQL Database Dump
-- Converted from SQLite database: medlab.db
-- Conversion Tool: Python SQLite to MySQL Converter
-- Date: """ + str(sys.version_info[:2]) + """
--
-- Instructions:
--   1. Create database: CREATE DATABASE IF NOT EXISTS labs;
--   2. Import: mysql -u root -proot labs < medlab_mysql_final.sql
--

"""
    
    content = header + content
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Conversion complete!")
    print(f"📄 Output file: {output_file}")
    print(f"📏 File size: {len(content) / 1024:.2f} KB")
    print(f"\n🚀 To import into MySQL:")
    print(f"   mysql -u root -proot labs < \"{output_file}\"")

if __name__ == "__main__":
    input_file = r"C:\Users\Leafyhead\Documents\MedLab\project\medlab_sqlite_dump.sql"
    output_file = r"C:\Users\Leafyhead\Documents\MedLab\project\medlab_backup_mysql.sql"
    
    convert_sqlite_to_mysql(input_file, output_file)
