const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 200
  },
  description: {
    type: String,
    default: null
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['Homework', 'Quiz', 'Project', 'Exam', 'Lab'],
    required: true
  },
  totalPoints: {
    type: Number,
    required: true,
    min: 0
  },
  dueDate: {
    type: Date,
    required: true
  },
  submissions: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    content: {
      type: String,
      required: true
    },
    attachments: [{
      type: String
    }],
    status: {
      type: String,
      enum: ['submitted', 'late', 'graded'],
      default: 'submitted'
    },
    grade: {
      points: {
        type: Number,
        min: 0
      },
      feedback: {
        type: String
      },
      gradedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      gradedAt: {
        type: Date
      }
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
assignmentSchema.index({ courseId: 1, dueDate: 1 });
assignmentSchema.index({ instructor: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
