MedLab Desktop - Database URL Configuration
=========================================

To configure the database connection after installation, create a plain text file named:

  database.url

Place it in the MedLab user data directory:

Windows:
  %AppData%/MedLab/database.url
  (Example full path: C:\\Users\\<YourUser>\\AppData\\Roaming\\MedLab\\database.url)

File contents: a single line DATABASE URL (no quotes, no key=). Example for your labs DB:

mysql://USERNAME:PASSWORD@localhost:3306/labs

Replace USERNAME and PASSWORD accordingly.

Then (re)start the MedLab app. The backend will read this value at launch.

Troubleshooting:
- If the file is empty or missing you will see a warning in the console log (run MedLab.exe from a command prompt to view logs).
- If credentials are wrong the backend will log a Prisma connection error.

Advanced:
You may alternatively set an environment variable named DATABASE_URL before launching the app; that overrides the file.

