const express = require('express');
const { body, validationResult } = require('express-validator');
const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get all assignments for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    let assignments = [];

    if (req.user.role === 'student') {
      // Get courses the student is enrolled in
      const courses = await Course.find({
        'enrolledStudents.student': req.user._id
      }).select('_id');

      const courseIds = courses.map(course => course._id);

      // Get assignments for those courses
      assignments = await Assignment.find({
        course: { $in: courseIds },
        isActive: true
      }).populate('course', 'title code').populate('instructor', 'name email profile').sort({ dueDate: 1 });
    } else if (req.user.role === 'faculty') {
      // Get assignments created by the faculty member
      assignments = await Assignment.find({
        instructor: req.user._id,
        isActive: true
      }).populate('course', 'title code').populate('instructor', 'name email profile').sort({ dueDate: 1 });
    } else if (req.user.role === 'admin') {
      // Get all assignments for admin
      assignments = await Assignment.find({
        isActive: true
      }).populate('course', 'title code').populate('instructor', 'name email profile').sort({ dueDate: 1 });
    }

    res.json({ assignments });
  } catch (error) {
    console.error('Get all assignments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get assignments for a course
router.get('/course/:courseId', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is enrolled, instructor, or admin
    const isEnrolled = course.enrolledStudents.some(
      enrollment => enrollment.student.toString() === req.user._id.toString()
    );
    const isInstructor = course.instructor.toString() === req.user._id.toString();

    if (!isEnrolled && !isInstructor && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const assignments = await Assignment.find({
      course: req.params.courseId,
      isActive: true
    }).populate('instructor', 'name email profile').sort({ dueDate: 1 });

    res.json({ assignments });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get assignment by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('course', 'title code')
      .populate('instructor', 'name email profile')
      .populate('submissions.student', 'name email profile');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check permissions
    const course = await Course.findById(assignment.course);
    const isEnrolled = course.enrolledStudents.some(
      enrollment => enrollment.student.toString() === req.user._id.toString()
    );
    const isInstructor = assignment.instructor.toString() === req.user._id.toString();

    if (!isEnrolled && !isInstructor && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ assignment });
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create assignment (faculty and admin only)
router.post('/', authenticateToken, authorizeRoles('faculty', 'admin'), [
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('description').optional().trim(),
  body('courseId').isMongoId().withMessage('Valid course ID required'),
  body('type').isIn(['Homework', 'Quiz', 'Project', 'Exam', 'Lab']).withMessage('Invalid assignment type'),
  body('totalPoints').isInt({ min: 0 }).withMessage('Total points must be non-negative'),
  body('dueDate').isISO8601().withMessage('Valid due date required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, courseId, type, totalPoints, dueDate } = req.body;

    // Verify course exists and user is the instructor
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const assignment = new Assignment({
      title,
      description,
      course: courseId,
      instructor: req.user._id,
      type,
      totalPoints,
      dueDate: new Date(dueDate)
    });

    await assignment.save();
    await assignment.populate('course', 'title code');
    await assignment.populate('instructor', 'name email profile');

    // Add assignment to course
    course.assignments.push(assignment._id);
    await course.save();

    res.status(201).json({
      message: 'Assignment created successfully',
      assignment
    });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit assignment (students only)
router.post('/:id/submit', authenticateToken, authorizeRoles('student'), [
  body('content').optional().trim(),
  body('attachments').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if student is enrolled in the course
    const course = await Course.findById(assignment.course);
    const isEnrolled = course.enrolledStudents.some(
      enrollment => enrollment.student.toString() === req.user._id.toString()
    );

    if (!isEnrolled) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    // Check if already submitted
    const existingSubmission = assignment.submissions.find(
      submission => submission.student.toString() === req.user._id.toString()
    );

    if (existingSubmission) {
      return res.status(400).json({ message: 'Assignment already submitted' });
    }

    const { content, attachments } = req.body;
    const isLate = new Date() > assignment.dueDate;

    assignment.submissions.push({
      student: req.user._id,
      content,
      attachments: attachments || [],
      status: isLate ? 'late' : 'submitted'
    });

    await assignment.save();

    res.json({ message: 'Assignment submitted successfully' });
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Grade submission (faculty and admin only)
router.put('/:id/submissions/:submissionId/grade', authenticateToken, authorizeRoles('faculty', 'admin'), [
  body('points').isInt({ min: 0 }).withMessage('Points must be non-negative'),
  body('feedback').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if user is the instructor or admin
    if (assignment.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const submission = assignment.submissions.id(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const { points, feedback } = req.body;

    submission.grade = {
      points,
      feedback,
      gradedBy: req.user._id,
      gradedAt: new Date()
    };
    submission.status = 'graded';

    await assignment.save();
    await assignment.populate('submissions.student', 'name email profile');

    res.json({
      message: 'Submission graded successfully',
      submission
    });
  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete assignment (faculty and admin only)
router.delete('/:id', authenticateToken, authorizeRoles('faculty', 'admin'), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if user is the instructor or admin
    if (assignment.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Remove assignment from course
    await Course.findByIdAndUpdate(assignment.course, {
      $pull: { assignments: assignment._id }
    });

    await Assignment.findByIdAndDelete(req.params.id);

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
