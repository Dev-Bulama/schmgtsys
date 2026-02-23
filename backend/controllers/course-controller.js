const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createCourse = async (req, res) => {
  try {
    const { code, name, description, creditHours, semesterId, departmentId, lecturerId } = req.body;
    const course = await prisma.course.create({
      data: { code, name, description, creditHours, semesterId, departmentId, lecturerId }
    });
    res.status(201).json({ message: 'Course created', course });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
};

const getCourses = async (req, res) => {
  try {
    const { semesterId, departmentId, lecturerId } = req.query;
    const where = {};
    if (semesterId) where.semesterId = semesterId;
    if (departmentId) where.departmentId = departmentId;
    if (lecturerId) where.lecturerId = lecturerId;

    const courses = await prisma.course.findMany({
      where,
      include: { department: true, lecturer: true, semester: { include: { session: true } } },
      orderBy: { code: 'asc' }
    });
    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to get courses' });
  }
};

const getCourseDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        department: true,
        lecturer: true,
        semester: { include: { session: true } },
        enrollments: { include: { student: true } },
        results: true
      }
    });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Failed to get course' });
  }
};

const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, creditHours, lecturerId } = req.body;
    const course = await prisma.course.update({
      where: { id },
      data: { name, description, creditHours, lecturerId }
    });
    res.json({ message: 'Course updated', course });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.course.delete({ where: { id } });
    res.json({ message: 'Course deleted' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
};

const getClassCourses = async (req, res) => {
  try {
    const { levelId, departmentId } = req.query;
    const courses = await prisma.course.findMany({
      where: { 
        semester: { isCurrent: true },
        departmentId
      },
      include: { lecturer: true },
      orderBy: { code: 'asc' }
    });
    res.json(courses);
  } catch (error) {
    console.error('Get class courses error:', error);
    res.status(500).json({ error: 'Failed to get courses' });
  }
};

const enrollStudent = async (req, res) => {
  try {
    const { studentId, courseId, semesterId } = req.body;
    const enrollment = await prisma.enrollment.create({
      data: { studentId, courseId, semesterId, status: 'ENROLLED' },
      include: { student: true, course: true }
    });
    res.status(201).json({ message: 'Student enrolled', enrollment });
  } catch (error) {
    console.error('Enroll student error:', error);
    res.status(500).json({ error: 'Failed to enroll student' });
  }
};

const getEnrollments = async (req, res) => {
  try {
    const { studentId, courseId, semesterId } = req.query;
    const where = {};
    if (studentId) where.studentId = studentId;
    if (courseId) where.courseId = courseId;
    if (semesterId) where.semesterId = semesterId;

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: { student: true, course: true },
      orderBy: { enrollmentDate: 'desc' }
    });
    res.json(enrollments);
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ error: 'Failed to get enrollments' });
  }
};

const dropCourse = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.enrollment.update({
      where: { id },
      data: { status: 'DROPPED' }
    });
    res.json({ message: 'Course dropped' });
  } catch (error) {
    console.error('Drop course error:', error);
    res.status(500).json({ error: 'Failed to drop course' });
  }
};

module.exports = {
  createCourse, getCourses, getCourseDetail, updateCourse, deleteCourse,
  getClassCourses, enrollStudent, getEnrollments, dropCourse
};
