const router = require('express').Router();
const { authenticate, authorize } = require('./middleware/auth');

const { adminRegister, adminLogIn, getAdminDetail } = require('./controllers/admin-controller');
const { studentRegister, studentLogIn, getStudents, getStudentDetail, updateStudent, deleteStudent, deleteStudents, deleteStudentsByClass } = require('./controllers/student-controller');
const { lecturerRegister, lecturerLogIn, getLecturers, getTeacherDetail, updateLecturer, deleteLecturer, deleteLecturers, deleteLecturersByClass, lecturerAttendance } = require('./controllers/lecturer-controller');
const { createCampus, getCampuses, getCampusDetail, createDepartment, getDepartments, createProgram, getPrograms, createLevel, getLevels, createAcademicSession, getAcademicSessions, createSemester, getSemesters, getCurrentSemester } = require('./controllers/academic-controller');
const { createCourse, getCourses, getCourseDetail, updateCourse, deleteCourse, getClassCourses, enrollStudent, getEnrollments, dropCourse } = require('./controllers/course-controller');
const { markAttendance, getAttendance, getStudentAttendanceStats, bulkMarkAttendance, clearAttendance } = require('./controllers/attendance-controller');
const { updateResult, getResults, getStudentResults, calculateCGPA, getCarryovers, getAcademicProbation } = require('./controllers/result-controller');
const { createPayment, getPayments, verifyPayment, getDefaulters, getFinanceAnalytics } = require('./controllers/finance-controller');
const { noticeCreate, noticeList, deleteNotice, deleteNotices, updateNotice, complainCreate, complainList, updateComplain } = require('./controllers/notice-controller');
const { createExam, getExams, getExamDetail, addQuestion, getExamQuestions, startExam, submitExam, recordTabSwitch } = require('./controllers/exam-controller');
const { parentRegister, parentLogIn, linkStudent, getChildren, getChildAttendance, getChildResults, getChildPayments } = require('./controllers/parent-controller');

router.post('/AdminReg', adminRegister);
router.post('/AdminLogin', adminLogIn);
router.get('/Admin/:id', authenticate, getAdminDetail);

router.post('/StudentReg', studentRegister);
router.post('/StudentLogin', studentLogIn);
router.get('/Students', authenticate, getStudents);
router.get('/Student/:id', authenticate, getStudentDetail);
router.put('/Student/:id', authenticate, authorize('ADMIN'), updateStudent);
router.delete('/Student/:id', authenticate, authorize('ADMIN'), deleteStudent);
router.delete('/Students', authenticate, authorize('ADMIN'), deleteStudents);
router.delete('/StudentsClass/:id', authenticate, authorize('ADMIN'), deleteStudentsByClass);

router.post('/TeacherReg', lecturerRegister);
router.post('/TeacherLogin', lecturerLogIn);
router.post('/LecturerReg', lecturerRegister);
router.post('/LecturerLogin', lecturerLogIn);
router.get('/Lecturers', authenticate, getLecturers);
router.get('/Lecturer/:id', authenticate, getTeacherDetail);
router.put('/Lecturer/:id', authenticate, authorize('ADMIN', 'LECTURER'), updateLecturer);
router.delete('/Lecturer/:id', authenticate, authorize('ADMIN'), deleteLecturer);
router.delete('/Lecturers', authenticate, authorize('ADMIN'), deleteLecturers);
router.delete('/LecturersClass/:id', authenticate, authorize('ADMIN'), deleteLecturersByClass);
router.post('/LecturerAttendance/:id', authenticate, lecturerAttendance);

router.post('/Campus', authenticate, authorize('ADMIN'), createCampus);
router.get('/Campuses', getCampuses);
router.get('/Campus/:id', getCampusDetail);

router.post('/Department', authenticate, authorize('ADMIN'), createDepartment);
router.get('/Departments', getDepartments);

router.post('/Program', authenticate, authorize('ADMIN'), createProgram);
router.get('/Programs', getPrograms);

router.post('/Level', authenticate, authorize('ADMIN'), createLevel);
router.get('/Levels', getLevels);

router.post('/AcademicSession', authenticate, authorize('ADMIN'), createAcademicSession);
router.get('/AcademicSessions', getAcademicSessions);
router.get('/CurrentSemester', getCurrentSemester);

router.post('/Semester', authenticate, authorize('ADMIN'), createSemester);
router.get('/Semesters', getSemesters);

router.post('/Course', authenticate, authorize('ADMIN', 'LECTURER'), createCourse);
router.get('/Courses', getCourses);
router.get('/Course/:id', getCourseDetail);
router.put('/Course/:id', authenticate, authorize('ADMIN', 'LECTURER'), updateCourse);
router.delete('/Course/:id', authenticate, authorize('ADMIN'), deleteCourse);
router.get('/ClassCourses', getClassCourses);

router.post('/Enrollment', authenticate, authorize('ADMIN', 'LECTURER'), enrollStudent);
router.get('/Enrollments', getEnrollments);
router.put('/DropCourse/:id', authenticate, dropCourse);

router.post('/Attendance', authenticate, markAttendance);
router.get('/Attendance', getAttendance);
router.get('/AttendanceStats', getStudentAttendanceStats);
router.post('/BulkAttendance', authenticate, authorize('ADMIN', 'LECTURER'), bulkMarkAttendance);
router.delete('/Attendance', authenticate, authorize('ADMIN'), clearAttendance);

router.post('/Result', authenticate, authorize('ADMIN', 'LECTURER'), updateResult);
router.get('/Results', getResults);
router.get('/StudentResults', getStudentResults);
router.get('/CGPA/:studentId', calculateCGPA);
router.get('/Carryovers', getCarryovers);
router.get('/AcademicProbation', getAcademicProbation);

router.post('/Payment', authenticate, authorize('ADMIN'), createPayment);
router.get('/Payments', getPayments);
router.post('/VerifyPayment', verifyPayment);
router.get('/Defaulters', getDefaulters);
router.get('/FinanceAnalytics', getFinanceAnalytics);

router.post('/Notice', authenticate, authorize('ADMIN'), noticeCreate);
router.get('/Notices', noticeList);
router.put('/Notice/:id', authenticate, authorize('ADMIN'), updateNotice);
router.delete('/Notice/:id', authenticate, authorize('ADMIN'), deleteNotice);
router.delete('/Notices', authenticate, authorize('ADMIN'), deleteNotices);

router.post('/Complain', complainCreate);
router.get('/Complains', authenticate, authorize('ADMIN'), complainList);
router.put('/Complain/:id', authenticate, authorize('ADMIN'), updateComplain);

router.post('/Exam', authenticate, authorize('ADMIN', 'LECTURER'), createExam);
router.get('/Exams', getExams);
router.get('/Exam/:id', getExamDetail);
router.put('/Exam/:id', authenticate, authorize('ADMIN', 'LECTURER'), updateCourse);
router.delete('/Exam/:id', authenticate, authorize('ADMIN'), deleteCourse);
router.post('/Exam/:id/Question', authenticate, authorize('ADMIN', 'LECTURER'), addQuestion);
router.get('/Exam/:id/Questions', getExamQuestions);
router.post('/Exam/:examId/Start', authenticate, authorize('STUDENT'), startExam);
router.put('/ExamSubmission/:id', authenticate, authorize('STUDENT'), submitExam);
router.post('/ExamSubmission/:id/TabSwitch', authenticate, authorize('STUDENT'), recordTabSwitch);

router.post('/ParentReg', parentRegister);
router.post('/ParentLogin', parentLogIn);
router.post('/Parent/:parentId/LinkStudent', authenticate, authorize('ADMIN'), linkStudent);
router.get('/Parent/Children', authenticate, authorize('PARENT'), getChildren);
router.get('/Parent/Child/:studentId/Attendance', authenticate, authorize('PARENT'), getChildAttendance);
router.get('/Parent/Child/:studentId/Results', authenticate, authorize('PARENT'), getChildResults);
router.get('/Parent/Child/:studentId/Payments', authenticate, authorize('PARENT'), getChildPayments);

module.exports = router;
