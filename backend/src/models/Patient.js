const mongoose = require('mongoose');

// One record per student / employee. Created by staff, or automatically (as an
// incomplete profile) the first time a student submits a request at the kiosk.
const patientSchema = new mongoose.Schema(
  {
    studentNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    patientType: { type: String, enum: ['student', 'faculty', 'staff'], default: 'student' },

    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, required: true, trim: true },
    sex: { type: String, enum: ['male', 'female'] },
    birthDate: Date,

    // Academic info (students) / department (employees)
    department: { type: String, trim: true }, // e.g. "School of Computing"
    program: { type: String, trim: true },    // e.g. "BSIT"
    yearLevel: { type: Number, min: 1, max: 6 },
    section: { type: String, trim: true },    // e.g. "WD-301"

    contactNumber: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    emergencyContact: {
      name: { type: String, trim: true },
      relationship: { type: String, trim: true },
      contactNumber: { type: String, trim: true },
    },

    // Baseline medical information
    bloodType: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'], default: 'unknown' },
    allergies: [{ type: String, trim: true }],
    medicalConditions: [{ type: String, trim: true }],
    currentMedications: [{ type: String, trim: true }],
    notes: { type: String, trim: true },

    // false when auto-created from the kiosk — staff should complete the profile
    isProfileComplete: { type: Boolean, default: true },
    lastVisitAt: Date,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

patientSchema.virtual('fullName').get(function fullName() {
  const middle = this.middleName ? ` ${this.middleName.charAt(0)}.` : '';
  return `${this.firstName}${middle} ${this.lastName}`;
});

patientSchema.index({ lastName: 1, firstName: 1 });

module.exports = mongoose.model('Patient', patientSchema);
