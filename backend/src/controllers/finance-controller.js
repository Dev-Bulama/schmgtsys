const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createPayment = async (req, res) => {
  try {
    const { studentId, amount, paymentType, description, dueDate, reference } = req.body;
    
    const payment = await prisma.payment.create({
      data: {
        studentId,
        amount,
        paymentType,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        reference,
        status: 'PENDING'
      },
      include: { student: true }
    });

    res.status(201).json({ message: 'Payment created', payment });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
};

const getPayments = async (req, res) => {
  try {
    const { studentId, status, paymentType } = req.query;
    const where = {};
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;
    if (paymentType) where.paymentType = paymentType;

    const payments = await prisma.payment.findMany({
      where,
      include: { student: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to get payments' });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { reference, transactionId } = req.body;
    
    const payment = await prisma.payment.update({
      where: { reference },
      data: { status: 'COMPLETED', paidDate: new Date(), transactionId }
    });

    res.json({ message: 'Payment verified', payment });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
};

const getDefaulters = async (req, res) => {
  try {
    const now = new Date();
    const defaulters = await prisma.payment.findMany({
      where: {
        status: 'PENDING',
        dueDate: { lt: now }
      },
      include: { student: true }
    });
    res.json(defaulters);
  } catch (error) {
    console.error('Get defaulters error:', error);
    res.status(500).json({ error: 'Failed to get defaulters' });
  }
};

const getFinanceAnalytics = async (req, res) => {
  try {
    const { campusId, startDate, endDate } = req.query;
    
    const where = { status: 'COMPLETED' };
    if (startDate && endDate) {
      where.paidDate = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    const payments = await prisma.payment.findMany({
      where,
      include: { student: { include: { campus: true } } }
    });

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const byType = {};
    payments.forEach(p => {
      byType[p.paymentType] = (byType[p.paymentType] || 0) + p.amount;
    });

    res.json({ totalRevenue, byType, count: payments.length });
  } catch (error) {
    console.error('Get finance analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
};

module.exports = {
  createPayment, getPayments, verifyPayment, getDefaulters, getFinanceAnalytics
};
