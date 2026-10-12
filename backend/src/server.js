const { port, seedDemoData: shouldSeed } = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');
const User = require('./models/User');

(async () => {
  try {
    await connectDB();

    // Online demo: fill an empty database with the sample data on first start
    if (shouldSeed && (await User.estimatedDocumentCount()) === 0) {
      const { seedDemoData } = require('./scripts/seed');
      const result = await seedDemoData();
      console.log(`Empty database — loaded demo data (${result.patients} patients, ${result.items} items). Logins: admin / Admin@12345, nurse / Nurse@12345`);
    }

    app.listen(port, () => console.log(`AngeliteCare running on http://localhost:${port}`));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
})();
