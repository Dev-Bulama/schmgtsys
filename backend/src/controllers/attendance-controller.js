const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const markAttendance = async (req, res) => {
  try {
    const { studentId, courseId, semesterId, date, status, deviceId, latitude, longitude } = req.body;
    
    const attendance = await prisma.attendance.upsert({
      where: { studentId_courseId_date: { studentId, courseId, date: new Date(date) } },
      update: { status, deviceId, latitude, longitude },
      create: { studentId, courseId, semesterId, date: new Date(date), status, deviceId, latitude, longitude }
    });
    res.json({ message: 'Attendance marked', attendance });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
};

const getAttendance = async (req, res) => {
  try {
    const { studentId, courseId, semesterId, startDate, endDate } = req.query;
    const where = {};
    if (studentId) where.studentId = studentId;
    if (courseId) where.courseId = courseId;
    if (semesterId) where.semesterId = semesterId;
    if (startDate && endDate) {
      where.date = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: { student: true, course: true },
      orderBy: { date: 'desc' }
    });
    res.json(attendance);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to get attendance' });
  }
};

const getStudentAttendanceStats = async (req, res) => {
  try {
    const { studentId, semesterId } = req.query;
    
    const attendance = await prisma.attendance.findMany({
      where: { studentId, semesterId },
      select: { status: true }
    });

    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'PRESENT').length;
    const absent = attendance.filter(a => a.status === 'ABSENT').length;
    const late = attendance.filter(a => a.status === 'LATE').length;
    const excused = attendance.filter(a => a.status === 'EXCUSED').length;

    const percentage = total > 0 ? ((present + late + excused) / total) * 100 : 0;

    res.json({
      total,
      present,
      absent,
      late,
      excused,
      percentage: Math.round(percentage * 100) / 100
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({ error: 'Failed to get attendance stats' });
  }
};

const bulkMarkAttendance = async (req, res) => {
  try {
    const { attendances } = req.body;
    
    const results = await Promise.all(
      attendances.map(a => 
        prisma.attendance.upsert({
          where: { studentId_courseId_date: { studentId: a.studentId, courseId: a.courseId, date: new Date(a.date) } },
          update: { status: a.status },
          create: { studentId: a.studentId, courseId: a.courseId, semesterId: a.semesterId, date: new Date(a.date), status: a.status }
        })
      )
    );

    res.json({ message: 'Bulk attendance marked', count: results.length });
  } catch (error) {
    console.error('Bulk mark attendance error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
};

const clearAttendance = async (req, res) => {
  try {
    const { courseId, semesterId } = req.body;
    await prisma.attendance.deleteMany({ where: { courseId, semesterId } });
    res.json({ message: 'Attendance cleared' });
  } catch (error) {
    console.error('Clear attendance error:', error);
    res.status(500).json({ error: 'Failed to clear attendance' });
  }
};

module.exports = {
  markAttendance,
  getAttendance,
  getStudentAttendanceStats,
  bulkMarkAttendance,
  clearAttendance
};
