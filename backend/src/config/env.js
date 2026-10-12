require('dotenv').config({ quiet: true });

const required = ['MONGODB_URI', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}. Copy .env.example to .env first.`);
    process.exit(1);
  }
}

// Clean up values pasted into hosting dashboards: stray spaces/newlines, surrounding quotes,
// or the whole "KEY=value" line pasted into the value box.
function clean(key) {
  let value = (process.env[key] || '').trim();
  if (value.startsWith(`${key}=`)) value = value.slice(key.length + 1).trim();
  if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1).trim();
  return value;
}

const mongoUri = clean('MONGODB_URI');
if (!/^mongodb(\+srv)?:\/\//.test(mongoUri)) {
  console.error('MONGODB_URI must start with "mongodb://" or "mongodb+srv://". Check the value in your .env file or hosting dashboard (paste only the connection string).');
  process.exit(1);
}
if (mongoUri.includes('<db_password>') || mongoUri.includes('<password>')) {
  console.error('MONGODB_URI still contains the <db_password> placeholder — replace it with the database user\'s real password.');
  process.exit(1);
}

module.exports = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri,
  jwtSecret: clean('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  expiryWarningDays: Number(process.env.EXPIRY_WARNING_DAYS) || 30,
  timezone: process.env.CLINIC_TIMEZONE || 'Asia/Manila',
  // true = load the sample data when the database is empty (used for the online demo)
  seedDemoData: process.env.SEED_DEMO_DATA === 'true',
};
