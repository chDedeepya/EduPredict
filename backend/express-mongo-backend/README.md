# Express Mongo Backend

A complete Express.js backend with MongoDB for a student management system.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based access control (Student, Faculty, Admin)
- **User Management**: Registration, login, profile management
- **Course Management**: Create, update, enroll in courses
- **Assignment Management**: Create assignments, submit work, grade submissions
- **Role-based Permissions**: Different access levels for students, faculty, and admins

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express Validator
- **Security**: bcryptjs for password hashing, CORS

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/student_management
   JWT_SECRET=your_jwt_secret_key_here
   ```

4. Start MongoDB service

5. Run the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile

### Courses
- `GET /api/courses` - Get all courses (with filters)
- `GET /api/courses/:id` - Get course by ID
- `POST /api/courses` - Create new course (Faculty/Admin)
- `PUT /api/courses/:id` - Update course (Instructor/Admin)
- `POST /api/courses/:id/enroll` - Enroll in course (Students)
- `DELETE /api/courses/:id/enroll` - Unenroll from course (Students)
- `DELETE /api/courses/:id` - Delete course (Admin)

### Assignments
- `GET /api/assignments/course/:courseId` - Get assignments for a course
- `GET /api/assignments/:id` - Get assignment by ID
- `POST /api/assignments` - Create assignment (Faculty/Admin)
- `POST /api/assignments/:id/submit` - Submit assignment (Students)
- `PUT /api/assignments/:id/submissions/:submissionId/grade` - Grade submission (Faculty/Admin)
- `DELETE /api/assignments/:id` - Delete assignment (Faculty/Admin)

### Users
- `GET /api/users` - Get all users (Admin)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user (Admin/Self)
- `DELETE /api/users/:id` - Delete user (Admin)
- `GET /api/users/course/:courseId/students` - Get students in a course (Faculty/Admin)

### Health Check
- `GET /api/health` - Server health status

## User Roles

1. **Student**: Can view courses, enroll/unenroll, view/submit assignments
2. **Faculty**: Can create/manage courses and assignments, grade submissions, view enrolled students
3. **Admin**: Full access to all features, user management

## Data Models

### User
- name, email, password, role
- profile (avatar, bio, department, year, employeeId)
- isActive, lastLogin, createdAt

### Course
- title, code, description, instructor, department
- credits, semester, year, schedule
- enrolledStudents (with grades), assignments

### Assignment
- title, description, course, instructor, type
- totalPoints, dueDate, submissions
- Each submission includes content, attachments, grade, status

## Security Features

- Password hashing with bcryptjs
- JWT token authentication
- Role-based access control
- Input validation and sanitization
- CORS enabled
- Error handling middleware

## Development

- Use `npm run dev` for development with nodemon
- Use `npm start` for production
- MongoDB connection with error handling
- Structured logging

## License

ISC
