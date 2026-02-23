const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const noticeCreate = async (req, res) => {
  try {
    const { title, content } = req.body;
    const adminId = req.user.admin?.id;

    if (!adminId) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const notice = await prisma.notice.create({
      data: { title, content, adminId }
    });

    res.status(201).json({ message: 'Notice created', notice });
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(500).json({ error: 'Failed to create notice' });
  }
};

const noticeList = async (req, res) => {
  try {
    const notices = await prisma.notice.findMany({
      include: { admin: { include: { user: { select: { email: true } } } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notices);
  } catch (error) {
    console.error('Get notices error:', error);
    res.status(500).json({ error: 'Failed to get notices' });
  }
};

const deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notice.delete({ where: { id } });
    res.json({ message: 'Notice deleted' });
  } catch (error) {
    console.error('Delete notice error:', error);
    res.status(500).json({ error: 'Failed to delete notice' });
  }
};

const deleteNotices = async (req, res) => {
  try {
    const { ids } = req.body;
    await prisma.notice.deleteMany({ where: { id: { in: ids } } });
    res.json({ message: 'Notices deleted' });
  } catch (error) {
    console.error('Delete notices error:', error);
    res.status(500).json({ error: 'Failed to delete notices' });
  }
};

const updateNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const notice = await prisma.notice.update({
      where: { id },
      data: { title, content }
    });
    res.json({ message: 'Notice updated', notice });
  } catch (error) {
    console.error('Update notice error:', error);
    res.status(500).json({ error: 'Failed to update notice' });
  }
};

const complainCreate = async (req, res) => {
  try {
    const { title, content, studentId } = req.body;
    
    const admin = await prisma.admin.findFirst();
    if (!admin) {
      return res.status(404).json({ error: 'No admin found' });
    }

    const complain = await prisma.complain.create({
      data: { title, content, studentId, adminId: admin.id }
    });

    res.status(201).json({ message: 'Complain submitted', complain });
  } catch (error) {
    console.error('Create complain error:', error);
    res.status(500).json({ error: 'Failed to submit complain' });
  }
};

const complainList = async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const complains = await prisma.complain.findMany({
      where,
      include: { student: true, admin: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(complains);
  } catch (error) {
    console.error('Get complains error:', error);
    res.status(500).json({ error: 'Failed to get complains' });
  }
};

const updateComplain = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const complain = await prisma.complain.update({
      where: { id },
      data: { status }
    });
    res.json({ message: 'Complain updated', complain });
  } catch (error) {
    console.error('Update complain error:', error);
    res.status(500).json({ error: 'Failed to update complain' });
  }
};

module.exports = {
  noticeCreate, noticeList, deleteNotice, deleteNotices, updateNotice,
  complainCreate, complainList, updateComplain
};
