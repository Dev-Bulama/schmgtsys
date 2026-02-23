const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const parentRegister = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, occupation, address } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'PARENT',
        parent: {
          create: { firstName, lastName, phone, occupation, address }
        }
      },
      include: { parent: true }
    });

    const token = generateToken(user.id, user.role);

    res.status(201).json({
      message: 'Parent registered successfully',
      token,
      user: { id: user.id, email: user.email, role: user.role, parent: user.parent }
    });
  } catch (error) {
    console.error('Parent registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const parentLogIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { parent: true }
    });

    if (!user || user.role !== 'PARENT') {
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
      user: { id: user.id, email: user.email, role: user.role, parent: user.parent }
    });
  } catch (error) {
    console.error('Parent login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const linkStudent = async (req, res) => {
  try {
    const { parentId } = req.params;
    const { studentId } = req.body;

    const student = await prisma.student.update({
      where: { id: studentId },
      data: { parentId }
    });

    res.json({ message: 'Student linked successfully', student });
  } catch (error) {
    console.error('Link student error:', error);
    res.status(500).json({ error: 'Failed to link student' });
  }
};

const getChildren = async (req, res) => {
  try {
    const parentId = req.user.parent?.id;

    const children = await prisma.student.findMany({
      where: { parentId },
      include: { program: true, level: true, department: true }
    });

    res.json(children);
  } catch (error) {
    console.error('Get children error:', error);
    res.status(500).json({ error: 'Failed to get children' });
  }
};

const getChildAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const parentId = req.user.parent?.id;

    const student = await prisma.student.findFirst({
      where: { id: studentId, parentId }
    });

    if (!student) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const attendance = await prisma.attendance.findMany({
      where: { studentId },
      include: { course: true },
      orderBy: { date: 'desc' },
      take: 30
    });

    const present = attendance.filter(a => a.status === 'PRESENT').length;
    const total = attendance.length;
    const percentage = total > 0 ? (present / total) * 100 : 0;

    res.json({ attendance, summary: { present, total, percentage: Math.round(percentage) } });
  } catch (error) {
    console.error('Get child attendance error:', error);
    res.status(500).json({ error: 'Failed to get attendance' });
  }
};

const getChildResults = async (req, res) => {
  try {
    const { studentId } = req.params;
    const parentId = req.user.parent?.id;

    const student = await prisma.student.findFirst({
      where: { id: studentId, parentId }
    });

    if (!student) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const results = await prisma.result.findMany({
      where: { studentId },
      include: { course: true, semester: { include: { session: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json(results);
  } catch (error) {
    console.error('Get child results error:', error);
    res.status(500).json({ error: 'Failed to get results' });
  }
};

const getChildPayments = async (req, res) => {
  try {
    const { studentId } = req.params;
    const parentId = req.user.parent?.id;

    const student = await prisma.student.findFirst({
      where: { id: studentId, parentId }
    });

    if (!student) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const payments = await prisma.payment.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(payments);
  } catch (error) {
    console.error('Get child payments error:', error);
    res.status(500).json({ error: 'Failed to get payments' });
  }
};

module.exports = {
  parentRegister, parentLogIn, linkStudent,
  getChildren, getChildAttendance, getChildResults, getChildPayments
};
