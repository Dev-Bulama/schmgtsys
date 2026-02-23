const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const generateStaffId = (campusCode, departmentCode, year) => {
  const yearStr = year.toString().slice(-2);
  return `${campusCode}/${departmentCode}/${yearStr}/${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
};

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const lecturerRegister = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, address, gender, departmentId, campusId, position } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const campus = await prisma.campus.findUnique({ where: { id: campusId } });
    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    
    const staffId = generateStaffId(campus?.code || 'CAMP', department?.code || 'DEPT', new Date().getFullYear());
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'LECTURER',
        lecturer: {
          create: {
            staffId,
            firstName,
            lastName,
            email,
            phone,
            address,
            gender,
            departmentId,
            campusId,
            position
          }
        }
      },
      include: { lecturer: true }
    });

    const token = generateToken(user.id, user.role);

    res.status(201).json({
      message: 'Lecturer registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        lecturer: user.lecturer
      }
    });
  } catch (error) {
    console.error('Lecturer registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const lecturerLogIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { lecturer: true }
    });

    if (!user || user.role !== 'LECTURER') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.role);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        lecturer: user.lecturer
      }
    });
  } catch (error) {
    console.error('Lecturer login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const getLecturers = async (req, res) => {
  try {
    const { campusId, departmentId } = req.query;
    
    const where = {};
    if (campusId) where.campusId = campusId;
    if (departmentId) where.departmentId = departmentId;

    const lecturers = await prisma.lecturer.findMany({
      where,
      include: { user: { select: { email: true } }, department: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json(lecturers);
  } catch (error) {
    console.error('Get lecturers error:', error);
    res.status(500).json({ error: 'Failed to get lecturers' });
  }
};

const getTeacherDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const lecturer = await prisma.lecturer.findUnique({
      where: { id },
      include: {
        user: { select: { email: true } },
        department: true,
        campus: true,
        courses: true,
        teachCourses: { include: { course: true } }
      }
    });

    if (!lecturer) {
      return res.status(404).json({ error: 'Lecturer not found' });
    }

    res.json(lecturer);
  } catch (error) {
    console.error('Get lecturer detail error:', error);
    res.status(500).json({ error: 'Failed to get lecturer details' });
  }
};

const updateLecturer = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, address, position } = req.body;

    const lecturer = await prisma.lecturer.update({
      where: { id },
      data: { firstName, lastName, phone, address, position }
    });

    res.json({ message: 'Lecturer updated successfully', lecturer });
  } catch (error) {
    console.error('Update lecturer error:', error);
    res.status(500).json({ error: 'Failed to update lecturer' });
  }
};

const deleteLecturer = async (req, res) => {
  try {
    const { id } = req.params;

    const lecturer = await prisma.lecturer.findUnique({ where: { id } });
    if (!lecturer) {
      return res.status(404).json({ error: 'Lecturer not found' });
    }

    await prisma.user.delete({ where: { id: lecturer.userId } });

    res.json({ message: 'Lecturer deleted successfully' });
  } catch (error) {
    console.error('Delete lecturer error:', error);
    res.status(500).json({ error: 'Failed to delete lecturer' });
  }
};

const deleteLecturers = async (req, res) => {
  try {
    const { ids } = req.body;

    const lecturers = await prisma.lecturer.findMany({ where: { id: { in: ids } } });
    const userIds = lecturers.map(l => l.userId);

    await prisma.user.deleteMany({ where: { id: { in: userIds } } });

    res.json({ message: 'Lecturers deleted successfully' });
  } catch (error) {
    console.error('Delete lecturers error:', error);
    res.status(500).json({ error: 'Failed to delete lecturers' });
  }
};

const deleteLecturersByClass = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const lecturers = await prisma.lecturer.findMany({ where: { departmentId } });
    const userIds = lecturers.map(l => l.userId);

    await prisma.user.deleteMany({ where: { id: { in: userIds } } });

    res.json({ message: 'Lecturers deleted successfully' });
  } catch (error) {
    console.error('Delete lecturers by department error:', error);
    res.status(500).json({ error: 'Failed to delete lecturers' });
  }
};

const lecturerAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { courseId, date, status } = req.body;

    const attendance = await prisma.attendance.create({
      data: {
        studentId: id,
        courseId,
        date: new Date(date),
        status
      }
    });

    res.json({ message: 'Attendance marked successfully', attendance });
  } catch (error) {
    console.error('Lecturer attendance error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
};

module.exports = {
  lecturerRegister,
  lecturerLogIn,
  getLecturers,
  getTeacherDetail,
  updateLecturer,
  deleteLecturer,
  deleteLecturers,
  deleteLecturersByClass,
  lecturerAttendance
};
