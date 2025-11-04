const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Course = require('../models/Course');
const Assignment = require('../models/Assignment');
const { authenticateToken, authorizeRoles, authorizeOwnerOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get student dashboard data
router.get('/:id/dashboard', authenticateToken, authorizeOwnerOrAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get enrolled courses with progress
    const enrolledCourses = await Course.find({ 'students.studentId': user._id })
      .select('name description instructor students');

    // Calculate progress for each course
    const coursesWithProgress = enrolledCourses.map(course => {
      const studentData = course.students.find(s => s.studentId.toString() === user._id.toString());
      return {
        _id: course._id,
        name: course.name,
        description: course.description,
        instructor: course.instructor,
        progress: studentData ? studentData.progress : 0
      };
    });

    // Get pending assignments
    const assignments = await Assignment.find({
      courseId: { $in: enrolledCourses.map(c => c._id) },
      dueDate: { $gte: new Date() }
    }).sort({ dueDate: 1 }).limit(5);

    // Calculate stats
    const stats = {
      currentLevel: Math.floor(coursesWithProgress.reduce((sum, c) => sum + c.progress, 0) / 100) + 1,
      streak: user.profile?.streak || 0,
      totalCourses: coursesWithProgress.length,
      completedCourses: coursesWithProgress.filter(c => c.progress === 100).length
    };

    res.json({
      user,
      enrolledCourses: coursesWithProgress,
      assignments,
      stats
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create user (admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['student', 'faculty', 'admin']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role, profile } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role,
      profile: profile || {},
      isActive: true
    });

    await user.save();

    const newUser = await User.findById(user._id).select('-password');

    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (admin only)
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { role, department, isActive } = req.query;
    let query = {};

    if (role) query.role = role;
    if (department) query['profile.department'] = department;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, authorizeOwnerOrAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user (admin or self)
router.put('/:id', authenticateToken, authorizeOwnerOrAdmin, [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('role').optional().isIn(['student', 'faculty', 'admin']).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { name, email, role, profile, isActive } = req.body;

    // Only admin can change role and isActive
    if (req.user.role !== 'admin') {
      if (role !== undefined || isActive !== undefined) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (profile) user.profile = { ...user.profile, ...profile };
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    const updatedUser = await User.findById(req.params.id).select('-password');

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting self
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get students enrolled in a course (faculty and admin)
router.get('/course/:courseId/students', authenticateToken, authorizeRoles('faculty', 'admin'), async (req, res) => {
  try {
    const Course = require('../models/Course');

    const course = await Course.findById(req.params.courseId)
      .populate('enrolledStudents.student', 'name email profile')
      .populate('instructor', 'name email profile');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is the instructor or admin
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const students = course.enrolledStudents.map(enrollment => ({
      ...enrollment.student.toObject(),
      enrolledAt: enrollment.enrolledAt,
      grade: enrollment.grade
    }));

    res.json({ students });
  } catch (error) {
    console.error('Get course students error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
