const express = require('express');
const { body, validationResult } = require('express-validator');
const Course = require('../models/Course');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get all courses (accessible by all authenticated users)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { department, semester, year, instructor } = req.query;
    let query = { isActive: true };

    if (department) query.department = department;
    if (semester) query.semester = semester;
    if (year) query.year = parseInt(year);
    if (instructor) query.instructor = instructor;

    const courses = await Course.find(query)
      .populate('instructor', 'name email profile')
      .populate('enrolledStudents.student', 'name email profile')
      .sort({ createdAt: -1 });

    res.json({ courses });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get course by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'name email profile')
      .populate('enrolledStudents.student', 'name email profile')
      .populate('assignments');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({ course });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new course (faculty and admin only)
router.post('/', authenticateToken, authorizeRoles('faculty', 'admin'), [
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('code').trim().isLength({ min: 1 }).withMessage('Course code is required'),
  body('description').optional().trim(),
  body('department').trim().isLength({ min: 1 }).withMessage('Department is required'),
  body('credits').isInt({ min: 1, max: 6 }).withMessage('Credits must be between 1 and 6'),
  body('semester').isIn(['Fall', 'Spring', 'Summer']).withMessage('Invalid semester'),
  body('year').isInt({ min: 2020 }).withMessage('Valid year required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, code, description, department, credits, semester, year, schedule } = req.body;

    // Check if course code already exists
    const existingCourse = await Course.findOne({ code: code.toUpperCase() });
    if (existingCourse) {
      return res.status(400).json({ message: 'Course code already exists' });
    }

    const course = new Course({
      title,
      code: code.toUpperCase(),
      description,
      instructor: req.user._id,
      department,
      credits,
      semester,
      year,
      schedule: schedule || []
    });

    await course.save();
    await course.populate('instructor', 'name email profile');

    res.status(201).json({
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update course (instructor or admin only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is the instructor or admin
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, description, department, credits, semester, year, schedule } = req.body;

    if (title) course.title = title;
    if (description !== undefined) course.description = description;
    if (department) course.department = department;
    if (credits) course.credits = credits;
    if (semester) course.semester = semester;
    if (year) course.year = year;
    if (schedule) course.schedule = schedule;

    await course.save();
    await course.populate('instructor', 'name email profile');

    res.json({
      message: 'Course updated successfully',
      course
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Enroll in course (students only)
router.post('/:id/enroll', authenticateToken, authorizeRoles('student'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if student is already enrolled
    const isEnrolled = course.enrolledStudents.some(
      enrollment => enrollment.student.toString() === req.user._id.toString()
    );

    if (isEnrolled) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    course.enrolledStudents.push({
      student: req.user._id,
      enrolledAt: new Date()
    });

    await course.save();
    await course.populate('enrolledStudents.student', 'name email profile');

    res.json({
      message: 'Successfully enrolled in course',
      course
    });
  } catch (error) {
    console.error('Enroll course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unenroll from course (students only)
router.delete('/:id/enroll', authenticateToken, authorizeRoles('student'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Remove student from enrolled students
    course.enrolledStudents = course.enrolledStudents.filter(
      enrollment => enrollment.student.toString() !== req.user._id.toString()
    );

    await course.save();

    res.json({ message: 'Successfully unenrolled from course' });
  } catch (error) {
    console.error('Unenroll course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete course (admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
