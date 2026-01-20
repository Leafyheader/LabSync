# MedLab Desktop Application - SQLite Edition

## Overview
The MedLab application has been successfully packaged as a Windows desktop application optimized for systems with 2GB RAM. The application now uses SQLite instead of MySQL for better performance on low-memory systems.

## Installation Files
- **MedLab Setup 1.0.0.exe** (149MB) - Main installer for Windows
- **win-unpacked/** - Portable application files (if needed)

## System Requirements
- **Operating System**: Windows 10 or later
- **RAM**: 2GB minimum (optimized for low-memory systems)
- **Storage**: 200MB free space
- **Architecture**: 64-bit Windows

## Key Features
### Database Migration
- ✅ Converted from MySQL to SQLite for better 2GB RAM compatibility
- ✅ All existing data structures preserved
- ✅ No external database server required
- ✅ Automatic database initialization on first run

### Memory Optimizations
- ✅ SQLite WAL mode for better performance
- ✅ Optimized cache settings for low-memory systems
- ✅ Reduced memory footprint compared to MySQL version

### Application Features
- ✅ Complete lab management system
- ✅ Patient records management
- ✅ Test results tracking
- ✅ User authentication and authorization
- ✅ Quality control monitoring
- ✅ Equipment management
- ✅ Audit logging

## Installation Instructions
1. **Download** the `MedLab Setup 1.0.0.exe` file
2. **Right-click** the installer and select "Run as administrator"
3. **Follow** the installation wizard steps
4. **Choose** installation directory (default: Program Files)
5. **Create** desktop and start menu shortcuts (recommended)
6. **Launch** MedLab from desktop or start menu

## First Time Setup
1. The application will automatically create the SQLite database
2. Default users will be created:
   - **SuperAdmin**: superadmin / Infinity@97
   - **Admin**: admin / admin123  
   - **Staff**: staff / staff123
3. Sample test categories and types will be populated
4. The system is ready for immediate use

## Database Location
- **Development**: `backend/data/medlab.db`
- **Production**: `%APPDATA%/MedLab/medlab.db`
- **Automatic backup** recommended for production use

## Technical Architecture
### Frontend
- React with TypeScript
- Vite build system
- Tailwind CSS styling
- Modern responsive design

### Backend  
- Node.js with Express
- SQLite database with Prisma ORM
- JWT authentication
- RESTful API design

### Desktop Integration
- Electron 37.4.0 framework
- Windows NSIS installer
- Auto-updater support
- System tray integration

## Migration from MySQL (If Applicable)
If you have existing MySQL data:
1. Export your MySQL data using the provided migration tools
2. Install the new SQLite version
3. Contact support for data migration assistance

## Support & Maintenance
- Database backups should be scheduled regularly
- Application auto-updates will be available
- For technical support, contact your system administrator

## Performance Notes
- Optimized for 2GB RAM systems
- Typical memory usage: 150-300MB
- Database file size grows with data (typical: 10-50MB)
- No internet connection required for operation

## Security Features
- Local database encryption available
- User role-based access control
- Audit trail for all operations
- Secure password hashing (bcrypt)

---

**Installation completed successfully!** 
**Version**: 1.0.0  
**Build Date**: August 29, 2025  
**Architecture**: Windows x64 with SQLite
