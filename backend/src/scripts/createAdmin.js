/* eslint-disable no-console */
// Creates the first admin account on a fresh (e.g. production) database without seeding sample data.
//   npm run create-admin -- --username headnurse --password "S0mething-Strong" --name "Jane Doe, RN"
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

(async () => {
  const username = arg('username');
  const password = arg('password');
  const fullName = arg('name') || 'Clinic Administrator';
  if (!username || !password) {
    console.error('Usage: npm run create-admin -- --username <username> --password <password> [--name "Full Name"]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters');
    process.exit(1);
  }

  await connectDB();
  if (await User.findOne({ username: username.toLowerCase() })) {
    console.error(`User "${username}" already exists`);
  } else {
    await User.create({ username, password, fullName, role: 'admin' });
    console.log(`Admin "${username}" created`);
  }
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect();
  process.exit(1);
});
