const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createCampus = async (req, res) => {
  try {
    const { name, code, address, phone, email } = req.body;
    const adminId = req.user.admin?.id;

    if (!adminId) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const campus = await prisma.campus.create({
      data: { name, code, address, phone, email, adminId }
    });

    res.status(201).json({ message: 'Campus created successfully', campus });
  } catch (error) {
    console.error('Create campus error:', error);
    res.status(500).json({ error: 'Failed to create campus' });
  }
};

const getCampuses = async (req, res) => {
  try {
    const campuses = await prisma.campus.findMany({
      include: {
        _count: { select: { students: true, lecturers: true, departments: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(campuses);
  } catch (error) {
    console.error('Get campuses error:', error);
    res.status(500).json({ error: 'Failed to get campuses' });
  }
};

const getCampusDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const campus = await prisma.campus.findUnique({
      where: { id },
      include: {
        departments: true,
        students: { take: 10, orderBy: { createdAt: 'desc' } },
        lecturers: { take: 10, orderBy: { createdAt: 'desc' } },
        sessions: { orderBy: { startDate: 'desc' } }
      }
    });
    if (!campus) return res.status(404).json({ error: 'Campus not found' });
    res.json(campus);
  } catch (error) {
    console.error('Get campus error:', error);
    res.status(500).json({ error: 'Failed to get campus' });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name, code, description, campusId } = req.body;
    const department = await prisma.department.create({
      data: { name, code, description, campusId }
    });
    res.status(201).json({ message: 'Department created', department });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
};

const getDepartments = async (req, res) => {
  try {
    const { campusId } = req.query;
    const where = campusId ? { campusId } : {};
    const departments = await prisma.department.findMany({
      where,
      include: { _count: { select: { lecturers: true, courses: true, programs: true } } },
      orderBy: { name: 'asc' }
    });
    res.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Failed to get departments' });
  }
};

const createProgram = async (req, res) => {
  try {
    const { name, code, description, departmentId, duration } = req.body;
    const program = await prisma.program.create({
      data: { name, code, description, departmentId, duration }
    });
    res.status(201).json({ message: 'Program created', program });
  } catch (error) {
    console.error('Create program error:', error);
    res.status(500).json({ error: 'Failed to create program' });
  }
};

const getPrograms = async (req, res) => {
  try {
    const { departmentId } = req.query;
    const where = departmentId ? { departmentId } : {};
    const programs = await prisma.program.findMany({
      where,
      include: { department: true, _count: { select: { students: true } } },
      orderBy: { name: 'asc' }
    });
    res.json(programs);
  } catch (error) {
    console.error('Get programs error:', error);
    res.status(500).json({ error: 'Failed to get programs' });
  }
};

const createLevel = async (req, res) => {
  try {
    const { level, programId } = req.body;
    const levelData = await prisma.level.create({
      data: { level, programId }
    });
    res.status(201).json({ message: 'Level created', level: levelData });
  } catch (error) {
    console.error('Create level error:', error);
    res.status(500).json({ error: 'Failed to create level' });
  }
};

const getLevels = async (req, res) => {
  try {
    const { programId } = req.query;
    const where = programId ? { programId } : {};
    const levels = await prisma.level.findMany({
      where,
      include: { program: true, _count: { select: { students: true } } },
      orderBy: { level: 'asc' }
    });
    res.json(levels);
  } catch (error) {
    console.error('Get levels error:', error);
    res.status(500).json({ error: 'Failed to get levels' });
  }
};

const createAcademicSession = async (req, res) => {
  try {
    const { name, startDate, endDate, campusId } = req.body;
    
    await prisma.academicSession.updateMany({
      where: { campusId, isCurrent: true },
      data: { isCurrent: false }
    });

    const session = await prisma.academicSession.create({
      data: { name, startDate: new Date(startDate), endDate: new Date(endDate), campusId, isCurrent: true }
    });

    res.status(201).json({ message: 'Academic session created', session });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
};

const getAcademicSessions = async (req, res) => {
  try {
    const { campusId } = req.query;
    const where = campusId ? { campusId } : {};
    const sessions = await prisma.academicSession.findMany({
      where,
      include: { semesters: true },
      orderBy: { startDate: 'desc' }
    });
    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
};

const createSemester = async (req, res) => {
  try {
    const { name, sessionId, startDate, endDate } = req.body;
    
    await prisma.semester.updateMany({
      where: { sessionId, isCurrent: true },
      data: { isCurrent: false }
    });

    const semester = await prisma.semester.create({
      data: { name, sessionId, startDate: new Date(startDate), endDate: new Date(endDate), isCurrent: true }
    });

    res.status(201).json({ message: 'Semester created', semester });
  } catch (error) {
    console.error('Create semester error:', error);
    res.status(500).json({ error: 'Failed to create semester' });
  }
};

const getSemesters = async (req, res) => {
  try {
    const { sessionId } = req.query;
    const where = sessionId ? { sessionId } : {};
    const semesters = await prisma.semester.findMany({
      where,
      include: { session: true },
      orderBy: { startDate: 'desc' }
    });
    res.json(semesters);
  } catch (error) {
    console.error('Get semesters error:', error);
    res.status(500).json({ error: 'Failed to get semesters' });
  }
};

const getCurrentSemester = async (req, res) => {
  try {
    const semester = await prisma.semester.findFirst({
      where: { isCurrent: true },
      include: { session: true }
    });
    res.json(semester);
  } catch (error) {
    console.error('Get current semester error:', error);
    res.status(500).json({ error: 'Failed to get current semester' });
  }
};

module.exports = {
  createCampus, getCampuses, getCampusDetail,
  createDepartment, getDepartments,
  createProgram, getPrograms,
  createLevel, getLevels,
  createAcademicSession, getAcademicSessions,
  createSemester, getSemesters, getCurrentSemester
};
