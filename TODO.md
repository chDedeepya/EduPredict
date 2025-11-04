# TODO: Enable Admin to Add Faculty and Admins

## Tasks
- [x] Add role verification to FacultyManagement.jsx to ensure only admins can add faculty
- [x] Fix AdminManagement.jsx to properly add admins instead of faculty
- [ ] Test the changes to ensure 403 error is resolved
- [x] Update MongoDB with sample data for students and faculty

## Details
- FacultyManagement.jsx now checks for admin role before allowing access.
- AdminManagement.jsx now properly manages admins with correct labels and forms.
- Backend requires 'admin' role for creating users via POST /api/users.
- MongoDB populated with sample admin, faculty, and students for testing.
