/* eslint-disable no-console */
// Sample data for development, Postman testing and the online demo.
//   npm run seed      -> WIPES the collections below, then inserts the sample data
// The server can also call seedDemoData() on first start when SEED_DEMO_DATA=true and the database is empty.
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Visit = require('../models/Visit');
const InventoryItem = require('../models/InventoryItem');
const StockMovement = require('../models/StockMovement');
const Counter = require('../models/Counter');
const AuditLog = require('../models/AuditLog');
const { localDateKey, addDays } = require('../utils/dates');
const { nodeEnv } = require('../config/env');

const daysFromNow = (n) => addDays(new Date(), n);

// Inserts the sample data. Does not delete anything — call on an empty database.
async function seedDemoData() {

  // ---------- staff ----------
  const admin = await User.create({ fullName: 'Clinic Administrator', username: 'admin', password: 'Admin@12345', role: 'admin', position: 'Clinic Head' });
  const nurse = await User.create({ fullName: 'Maria Santos, RN', username: 'nurse', password: 'Nurse@12345', role: 'nurse', position: 'School Nurse' });

  // ---------- patients ----------
  const patients = await Patient.insertMany([
    { studentNumber: '20230001', firstName: 'Juan', middleName: 'Reyes', lastName: 'Dela Cruz', sex: 'male', birthDate: new Date('2004-03-14'), department: 'School of Computing', program: 'BSIT', yearLevel: 3, section: 'WD-301', contactNumber: '09171234567', email: 'jdelacruz@student.hau.edu.ph', bloodType: 'O+', allergies: ['Penicillin'], emergencyContact: { name: 'Rosa Dela Cruz', relationship: 'Mother', contactNumber: '09181234567' } },
    { studentNumber: '20230002', firstName: 'Andrea', lastName: 'Manalo', sex: 'female', birthDate: new Date('2005-07-02'), department: 'School of Computing', program: 'BSCS', yearLevel: 2, section: 'CS-201', contactNumber: '09179876543', bloodType: 'A+', medicalConditions: ['Asthma'], currentMedications: ['Salbutamol inhaler (as needed)'] },
    { studentNumber: '20220145', firstName: 'Paolo', lastName: 'Garcia', sex: 'male', birthDate: new Date('2003-11-21'), department: 'School of Engineering and Architecture', program: 'BSCE', yearLevel: 4, section: 'CE-401', bloodType: 'B+' },
    { studentNumber: '20240310', firstName: 'Bea', lastName: 'Lacson', sex: 'female', birthDate: new Date('2006-01-09'), department: 'School of Nursing and Allied Medical Sciences', program: 'BSN', yearLevel: 1, section: 'N-101', bloodType: 'unknown' },
    { studentNumber: '20210077', firstName: 'Carlo', lastName: 'Tiongson', sex: 'male', birthDate: new Date('2002-05-30'), department: 'School of Business and Accountancy', program: 'BSA', yearLevel: 4, section: 'A-402', allergies: ['Seafood'] },
    { studentNumber: 'EMP-0042', patientType: 'faculty', firstName: 'Liza', lastName: 'Mercado', sex: 'female', department: 'School of Computing' },
  ]);
  const P = Object.fromEntries(patients.map((p) => [p.studentNumber, p]));

  // ---------- inventory ----------
  const itemDefs = [
    { name: 'Paracetamol 500 mg', genericName: 'Paracetamol', brandName: 'Biogesic', category: 'medicine', dosageForm: 'tablet', strength: '500 mg', unit: 'tablet', reorderLevel: 50,
      batches: [{ lotNumber: 'PCM-2501', quantity: 120, expirationDate: daysFromNow(20), supplier: 'Unilab' }, { lotNumber: 'PCM-2507', quantity: 300, expirationDate: daysFromNow(400), supplier: 'Unilab' }] },
    { name: 'Ibuprofen 200 mg', genericName: 'Ibuprofen', brandName: 'Advil', category: 'medicine', dosageForm: 'capsule', strength: '200 mg', unit: 'capsule', reorderLevel: 30,
      batches: [{ lotNumber: 'IBU-2412', quantity: 25, expirationDate: daysFromNow(200) }] }, // low stock
    { name: 'Mefenamic Acid 500 mg', genericName: 'Mefenamic Acid', brandName: 'Dolfenal', category: 'medicine', dosageForm: 'capsule', strength: '500 mg', unit: 'capsule', reorderLevel: 30,
      batches: [{ lotNumber: 'MEF-2503', quantity: 150, expirationDate: daysFromNow(300) }] },
    { name: 'Cetirizine 10 mg', genericName: 'Cetirizine', brandName: 'Virlix', category: 'medicine', dosageForm: 'tablet', strength: '10 mg', unit: 'tablet', reorderLevel: 20,
      batches: [{ lotNumber: 'CET-2309', quantity: 15, expirationDate: daysFromNow(-10) }, { lotNumber: 'CET-2506', quantity: 80, expirationDate: daysFromNow(250) }] }, // has expired batch
    { name: 'Loperamide 2 mg', genericName: 'Loperamide', brandName: 'Imodium', category: 'medicine', dosageForm: 'capsule', strength: '2 mg', unit: 'capsule', reorderLevel: 20,
      batches: [{ lotNumber: 'LOP-2502', quantity: 60, expirationDate: daysFromNow(180) }] },
    { name: 'Antacid (Aluminum + Magnesium Hydroxide)', brandName: 'Kremil-S', category: 'medicine', dosageForm: 'tablet', unit: 'tablet', reorderLevel: 30,
      batches: [{ lotNumber: 'ANT-2504', quantity: 90, expirationDate: daysFromNow(15) }] }, // expiring soon
    { name: 'Oral Rehydration Salts', category: 'medicine', dosageForm: 'sachet', unit: 'sachet', reorderLevel: 20, batches: [] }, // out of stock
    { name: 'Adhesive Bandage', category: 'supply', unit: 'pc', reorderLevel: 50, batches: [{ lotNumber: 'BND-01', quantity: 400 }] },
    { name: 'Sterile Gauze Pad 4x4', category: 'supply', unit: 'pc', reorderLevel: 30, batches: [{ lotNumber: 'GZ-2501', quantity: 100, expirationDate: daysFromNow(700) }] },
    { name: 'Instant Cold Pack', category: 'supply', unit: 'pc', reorderLevel: 10, batches: [{ lotNumber: 'ICP-01', quantity: 24 }] },
    { name: 'Sanitary Napkin', category: 'supply', unit: 'pc', reorderLevel: 20, batches: [{ lotNumber: 'SN-01', quantity: 60 }] },
    { name: 'Digital Thermometer', category: 'equipment', unit: 'pc', reorderLevel: 2, isRequestable: false, batches: [{ lotNumber: 'EQ-THERM', quantity: 4 }] },
  ];
  const items = [];
  for (const def of itemDefs) items.push(await InventoryItem.create(def));
  const I = Object.fromEntries(items.map((i) => [i.name.split(' ')[0], i]));

  await StockMovement.insertMany(items.flatMap((item) => item.batches.map((b) => ({
    item: item._id, itemName: item.name, type: 'restock', quantity: b.quantity, lotNumber: b.lotNumber,
    expirationDate: b.expirationDate, balanceAfter: item.totalQuantity, reason: 'Initial stock (seed)', performedBy: admin._id,
  }))));

  // ---------- past consultations (patient history) ----------
  const past = (days, hour) => { const d = daysFromNow(-days); d.setHours(hour, 0, 0, 0); return d; };
  const history = [
    { p: '20230001', days: 40, type: 'checkup', reason: 'Fever and body aches since last night', vitals: { bloodPressure: '110/70', temperature: 38.4, pulseRate: 96 }, assessment: 'Viral fever', treatment: 'Advised rest and oral fluids', dispensed: [{ item: I.Paracetamol, quantity: 4, instructions: '1 tablet every 4 hours as needed for fever' }] },
    { p: '20230001', days: 12, type: 'medical_supply', reason: 'Scraped knee during PE class', assessment: 'Superficial abrasion, right knee', treatment: 'Wound cleaned with NSS, dressing applied', dispensed: [{ item: I.Sterile, quantity: 2 }, { item: I.Adhesive, quantity: 3 }] },
    { p: '20230002', days: 25, type: 'checkup', reason: 'Shortness of breath after climbing stairs', vitals: { bloodPressure: '100/70', pulseRate: 104, respiratoryRate: 24, oxygenSaturation: 95 }, assessment: 'Mild asthma exacerbation', treatment: 'Used own inhaler, observed for 30 mins, symptoms resolved', remarks: 'Advised to always carry inhaler' },
    { p: '20230002', days: 3, type: 'medicine', reason: 'Dysmenorrhea', assessment: 'Primary dysmenorrhea', dispensed: [{ item: I.Mefenamic, quantity: 2, instructions: '1 capsule every 8 hours after meals' }] },
    { p: '20220145', days: 8, type: 'certificate', reason: 'Medical clearance for intramurals', vitals: { bloodPressure: '120/80', temperature: 36.6, pulseRate: 72, weight: 68, height: 172 }, assessment: 'Physically fit to participate', remarks: 'Clearance issued' },
    { p: '20210077', days: 5, type: 'medicine', reason: 'Itchy rashes after lunch', assessment: 'Allergic urticaria (seafood)', dispensed: [{ item: I.Cetirizine, quantity: 1, instructions: '1 tablet once a day' }] },
  ];

  for (const h of history) {
    const createdAt = past(h.days, 9);
    const patient = P[h.p];
    const dispensed = [];
    for (const d of h.dispensed || []) {
      const fresh = await InventoryItem.findById(d.item._id);
      const { plan } = fresh.planDeduction(d.quantity);
      fresh.applyDeduction(plan);
      await fresh.save();
      dispensed.push({ item: fresh._id, name: fresh.name, unit: fresh.unit, quantity: d.quantity, instructions: d.instructions, batches: plan.map((x) => ({ lotNumber: x.lotNumber, expirationDate: x.expirationDate, quantity: x.quantity })) });
    }
    const visit = await Visit.create({
      patient: patient._id, studentNumber: patient.studentNumber, queueNumber: `${h.type[0].toUpperCase()}-001`, queueDate: localDateKey(createdAt),
      source: 'kiosk', requestType: h.type, reason: h.reason, status: 'completed', vitals: h.vitals, assessment: h.assessment,
      treatment: h.treatment, remarks: h.remarks, dispensed, handledBy: nurse._id, calledAt: new Date(createdAt.getTime() + 10 * 60000),
      completedAt: new Date(createdAt.getTime() + 25 * 60000), createdAt,
    });
    for (const d of dispensed) {
      const it = await InventoryItem.findById(d.item);
      await StockMovement.create(d.batches.map((b) => ({ item: d.item, itemName: d.name, type: 'dispense', quantity: -b.quantity, lotNumber: b.lotNumber, expirationDate: b.expirationDate, balanceAfter: it.totalQuantity, reason: `Dispensed to ${patient.studentNumber}`, visit: visit._id, performedBy: nurse._id })));
    }
    await Patient.updateOne({ _id: patient._id }, { lastVisitAt: visit.completedAt });
  }

  return { patients: patients.length, items: items.length, visits: history.length };
}

async function run() {
  if (nodeEnv === 'production' && !process.argv.includes('--force')) {
    console.error('Refusing to wipe and seed in production. Pass --force if you really mean it.');
    process.exit(1);
  }
  await connectDB();
  await Promise.all([
    User.deleteMany({}), Patient.deleteMany({}), Visit.deleteMany({}), InventoryItem.deleteMany({}),
    StockMovement.deleteMany({}), Counter.deleteMany({}), AuditLog.deleteMany({}),
  ]);
  const result = await seedDemoData();

  console.log('\nSeed complete');
  console.log('  Admin login : admin / Admin@12345');
  console.log('  Nurse login : nurse / Nurse@12345');
  console.log(`  Patients    : ${result.patients}  (try student number 20230001)`);
  console.log(`  Items       : ${result.items}`);
  console.log(`  Past visits : ${result.visits}\n`);
  await mongoose.disconnect();
}

if (require.main === module) {
  run().catch(async (err) => {
    console.error(err);
    await mongoose.disconnect();
    process.exit(1);
  });
}

module.exports = { seedDemoData };
