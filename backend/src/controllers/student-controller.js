const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const generateStudentId = (campusCode, programCode, year) => {
  const yearStr = year.toString().slice(-2);
  return `${campusCode}/${programCode}/${yearStr}/${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
};

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const studentRegister = async (req, res) => {
  try {
    const { email, password, firstName, lastName, middleName, gender, dateOfBirth, phone, address, campusId, programId, levelId, departmentId } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const campus = await prisma.campus.findUnique({ where: { id: campusId } });
    const program = await prisma.program.findUnique({ where: { id: programId } });
    
    const studentId = generateStudentId(campus?.code || 'CAMP', program?.code || 'PROG', new Date().getFullYear());
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'STUDENT',
        student: {
          create: {
            studentId,
            firstName,
            lastName,
            middleName,
            gender,
            dateOfBirth: new Date(dateOfBirth),
            phone,
            address,
            campusId,
            programId,
            levelId,
            departmentId
          }
        }
      },
      include: { student: true }
    });

    const token = generateToken(user.id, user.role);

    res.status(201).json({
      message: 'Student registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        student: user.student
      }
    });
  } catch (error) {
    console.error('Student registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const studentLogIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { student: true }
    });

    if (!user || user.role !== 'STUDENT') {
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
        student: user.student
      }
    });
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const getStudents = async (req, res) => {
  try {
    const { campusId, programId, levelId, departmentId, status } = req.query;
    
    const where = {};
    if (campusId) where.campusId = campusId;
    if (programId) where.programId = programId;
    if (levelId) where.levelId = levelId;
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;

    const students = await prisma.student.findMany({
      where,
      include: { user: { select: { email: true } }, program: true, level: true, department: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to get students' });
  }
};

const getStudentDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: { select: { email: true } },
        program: true,
        level: true,
        department: true,
        campus: true,
        parent: true,
        enrollments: { include: { course: true } },
        results: { include: { course: true, semester: true } },
        attendance: { include: { course: true }, orderBy: { date: 'desc' }, take: 50 },
        payments: true
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Get student detail error:', error);
    res.status(500).json({ error: 'Failed to get student details' });
  }
};

const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, middleName, phone, address, status } = req.body;

    const student = await prisma.student.update({
      where: { id },
      data: { firstName, lastName, middleName, phone, address, status }
    });

    res.json({ message: 'Student updated successfully', student });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    await prisma.user.delete({ where: { id: student.userId } });

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
};

const deleteStudents = async (req, res) => {
  try {
    const { ids } = req.body;

    const students = await prisma.student.findMany({ where: { id: { in: ids } } });
    const userIds = students.map(s => s.userId);

    await prisma.user.deleteMany({ where: { id: { in: userIds } } });

    res.json({ message: 'Students deleted successfully' });
  } catch (error) {
    console.error('Delete students error:', error);
    res.status(500).json({ error: 'Failed to delete students' });
  }
};

const deleteStudentsByClass = async (req, res) => {
  try {
    const { levelId } = req.params;

    const students = await prisma.student.findMany({ where: { levelId } });
    const userIds = students.map(s => s.userId);

    await prisma.user.deleteMany({ where: { id: { in: userIds } } });

    res.json({ message: 'Students deleted successfully' });
  } catch (error) {
    console.error('Delete students by class error:', error);
    res.status(500).json({ error: 'Failed to delete students' });
  }
};

module.exports = {
  studentRegister,
  studentLogIn,
  getStudents,
  getStudentDetail,
  updateStudent,
  deleteStudent,
  deleteStudents,
  deleteStudentsByClass
};
