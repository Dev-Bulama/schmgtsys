const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const calculateGrade = (score) => {
  if (score >= 90) return { grade: 'A', gradePoint: 4.0 };
  if (score >= 80) return { grade: 'B+', gradePoint: 3.5 };
  if (score >= 70) return { grade: 'B', gradePoint: 3.0 };
  if (score >= 60) return { grade: 'C+', gradePoint: 2.5 };
  if (score >= 50) return { grade: 'C', gradePoint: 2.0 };
  if (score >= 40) return { grade: 'D', gradePoint: 1.0 };
  return { grade: 'F', gradePoint: 0.0 };
};

const updateResult = async (req, res) => {
  try {
    const { studentId, courseId, semesterId, caScore, examScore } = req.body;
    const totalScore = (parseFloat(caScore) || 0) + (parseFloat(examScore) || 0);
    const { grade, gradePoint } = calculateGrade(totalScore);

    const result = await prisma.result.upsert({
      where: { studentId_courseId_semesterId: { studentId, courseId, semesterId } },
      update: { caScore, examScore, totalScore, grade, gradePoint },
      create: { studentId, courseId, semesterId, caScore, examScore, totalScore, grade, gradePoint }
    });

    res.json({ message: 'Result updated', result });
  } catch (error) {
    console.error('Update result error:', error);
    res.status(500).json({ error: 'Failed to update result' });
  }
};

const getResults = async (req, res) => {
  try {
    const { studentId, courseId, semesterId, levelId } = req.query;
    const where = {};
    if (studentId) where.studentId = studentId;
    if (courseId) where.courseId = courseId;
    if (semesterId) where.semesterId = semesterId;

    const results = await prisma.result.findMany({
      where,
      include: { student: true, course: true, semester: { include: { session: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(results);
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: 'Failed to get results' });
  }
};

const getStudentResults = async (req, res) => {
  try {
    const { studentId, semesterId } = req.query;

    const results = await prisma.result.findMany({
      where: { studentId, semesterId },
      include: { course: true },
      orderBy: { course: { code: 'asc' } }
    });

    res.json(results);
  } catch (error) {
    console.error('Get student results error:', error);
    res.status(500).json({ error: 'Failed to get results' });
  }
};

const calculateCGPA = async (req, res) => {
  try {
    const { studentId } = req.params;

    const results = await prisma.result.findMany({
      where: { studentId },
      include: { course: true }
    });

    if (results.length === 0) {
      return res.json({ cgpa: 0, totalCredits: 0, totalPoints: 0 });
    }

    let totalPoints = 0;
    let totalCredits = 0;

    results.forEach(r => {
      if (r.gradePoint !== null) {
        totalPoints += r.gradePoint * r.course.creditHours;
        totalCredits += r.course.creditHours;
      }
    });

    const cgpa = totalCredits > 0 ? totalPoints / totalCredits : 0;

    res.json({
      cgpa: Math.round(cgpa * 100) / 100,
      totalCredits,
      totalPoints: Math.round(totalPoints * 100) / 100,
      totalCourses: results.length
    });
  } catch (error) {
    console.error('Calculate CGPA error:', error);
    res.status(500).json({ error: 'Failed to calculate CGPA' });
  }
};

const getCarryovers = async (req, res) => {
  try {
    const { semesterId } = req.query;

    const carryovers = await prisma.result.findMany({
      where: { semesterId, grade: 'F' },
      include: { student: true, course: true }
    });

    res.json(carryovers);
  } catch (error) {
    console.error('Get carryovers error:', error);
    res.status(500).json({ error: 'Failed to get carryovers' });
  }
};

const getAcademicProbation = async (req, res) => {
  try {
    const { semesterId, gpaThreshold = 1.5 } = req.query;

    const students = await prisma.student.findMany({
      where: { status: 'ACTIVE' }
    });

    const probation = [];

    for (const student of students) {
      const results = await prisma.result.findMany({
        where: { studentId: student.id, semesterId },
        include: { course: true }
      });

      if (results.length > 0) {
        let totalPoints = 0;
        let totalCredits = 0;

        results.forEach(r => {
          totalPoints += (r.gradePoint || 0) * r.course.creditHours;
          totalCredits += r.course.creditHours;
        });

        const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;

        if (gpa < parseFloat(gpaThreshold)) {
          probation.push({ student, gpa });
        }
      }
    }

    res.json(probation);
  } catch (error) {
    console.error('Get probation error:', error);
    res.status(500).json({ error: 'Failed to get probation list' });
  }
};

module.exports = {
  updateResult,
  getResults,
  getStudentResults,
  calculateCGPA,
  getCarryovers,
  getAcademicProbation
};
