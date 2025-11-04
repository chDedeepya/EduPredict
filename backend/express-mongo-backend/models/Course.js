const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 200
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 1,
    maxlength: 20,
    uppercase: true
  },
  description: {
    type: String,
    default: null
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100
  },
  credits: {
    type: Number,
    required: true,
    min: 1,
    max: 6
  },
  semester: {
    type: String,
    enum: ['Fall', 'Spring', 'Summer'],
    required: true
  },
  year: {
    type: Number,
    required: true,
    min: 2020,
    max: 2030
  },
  schedule: {
    type: [Object],
    default: []
  },
  enrolledStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    grade: {
      type: Number,
      default: null
    }
  }],
  assignments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
courseSchema.index({ code: 1 }, { unique: true });
courseSchema.index({ instructor: 1 });
courseSchema.index({ department: 1, year: 1, semester: 1 });

module.exports = mongoose.model('Course', courseSchema);
