const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const adminRegister = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, address } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'ADMIN',
        admin: {
          create: {
            firstName,
            lastName,
            phone,
            address
          }
        }
      },
      include: { admin: true }
    });

    const token = generateToken(user.id, user.role);

    res.status(201).json({
      message: 'Admin registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        admin: user.admin
      }
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const adminLogIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { admin: true }
    });

    if (!user || user.role !== 'ADMIN') {
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
        admin: user.admin
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const getAdminDetail = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { admin: true }
    });

    if (!user || !user.admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get admin detail error:', error);
    res.status(500).json({ error: 'Failed to get admin details' });
  }
};

module.exports = { adminRegister, adminLogIn, getAdminDetail };
