const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createExam = async (req, res) => {
  try {
    const { title, courseId, duration, startTime, endTime, shuffleQuestions } = req.body;
    const exam = await prisma.exam.create({
      data: { title, courseId, duration, startTime: new Date(startTime), endTime: new Date(endTime), shuffleQuestions }
    });
    res.status(201).json({ message: 'Exam created', exam });
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({ error: 'Failed to create exam' });
  }
};

const getExams = async (req, res) => {
  try {
    const { courseId, status } = req.query;
    const where = {};
    if (courseId) where.courseId = courseId;
    if (status) where.status = status;

    const exams = await prisma.exam.findMany({
      where,
      include: { course: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(exams);
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ error: 'Failed to get exams' });
  }
};

const getExamDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: { course: true, questions: true }
    });
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    res.json(exam);
  } catch (error) {
    console.error('Get exam error:', error);
    res.status(500).json({ error: 'Failed to get exam' });
  }
};

const addQuestion = async (req, res) => {
  try {
    const { examId, question, type, options, correctAnswer, points } = req.body;
    const q = await prisma.examQuestion.create({
      data: { examId, question, type, options, correctAnswer, points: points || 1 }
    });
    res.status(201).json({ message: 'Question added', question: q });
  } catch (error) {
    console.error('Add question error:', error);
    res.status(500).json({ error: 'Failed to add question' });
  }
};

const getExamQuestions = async (req, res) => {
  try {
    const { examId } = req.params;
    let questions = await prisma.examQuestion.findMany({ where: { examId } });
    
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (exam?.shuffleQuestions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    questions = questions.map(q => ({ ...q, correctAnswer: undefined }));
    res.json(questions);
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
};

const startExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.student?.id;

    if (!studentId) {
      return res.status(403).json({ error: 'Student access required' });
    }

    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam || exam.status !== 'PUBLISHED') {
      return res.status(400).json({ error: 'Exam not available' });
    }

    const now = new Date();
    if (now < new Date(exam.startTime) || now > new Date(exam.endTime)) {
      return res.status(400).json({ error: 'Exam not within scheduled time' });
    }

    const submission = await prisma.examSubmission.create({
      data: { studentId, examId, startTime: now, status: 'IN_PROGRESS' }
    });

    res.json({ message: 'Exam started', submission });
  } catch (error) {
    console.error('Start exam error:', error);
    res.status(500).json({ error: 'Failed to start exam' });
  }
};

const submitExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;

    const submission = await prisma.examSubmission.findUnique({
      where: { id },
      include: { exam: { include: { questions: true } } }
    });

    if (!submission || submission.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Invalid submission' });
    }

    let score = 0;
    const exam = submission.exam;
    
    exam.questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        score += q.points;
      }
    });

    const updated = await prisma.examSubmission.update({
      where: { id },
      data: { answers, score, endTime: new Date(), status: 'GRADED' }
    });

    res.json({ message: 'Exam submitted', submission: updated, score });
  } catch (error) {
    console.error('Submit exam error:', error);
    res.status(500).json({ error: 'Failed to submit exam' });
  }
};

const recordTabSwitch = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.examSubmission.update({
      where: { id },
      data: { tabSwitches: { increment: 1 } }
    });
    res.json({ message: 'Tab switch recorded' });
  } catch (error) {
    console.error('Record tab switch error:', error);
    res.status(500).json({ error: 'Failed to record' });
  }
};

module.exports = {
  createExam, getExams, getExamDetail, addQuestion, getExamQuestions,
  startExam, submitExam, recordTabSwitch
};
