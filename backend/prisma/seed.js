const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  try {
    // Create Admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@school.edu' },
      update: {},
      create: {
        email: 'admin@school.edu',
        password: adminPassword,
        role: 'ADMIN',
        admin: {
          create: {
            firstName: 'System',
            lastName: 'Administrator',
            phone: '+1234567890',
            address: '123 School Street'
          }
        }
      }
    });
    console.log('Admin created: admin@school.edu / admin123');

    // Create Campus
    const campus = await prisma.campus.upsert({
      where: { id: 'main-campus' },
      update: {},
      create: {
        id: 'main-campus',
        name: 'Main Campus',
        code: 'MC',
        address: '123 Education Avenue',
        phone: '+1234567890',
        email: 'info@school.edu',
        adminId: admin.admin.id
      }
    });
    console.log('Campus created');

    // Create Department
    const department = await prisma.department.upsert({
      where: { id: 'cs-dept' },
      update: {},
      create: {
        id: 'cs-dept',
        name: 'Computer Science',
        code: 'CS',
        description: 'Department of Computer Science',
        campusId: campus.id
      }
    });
    console.log('Department created');

    // Create Program
    const program = await prisma.program.upsert({
      where: { id: 'cs-program' },
      update: {},
      create: {
        id: 'cs-program',
        name: 'Computer Science',
        code: 'CS',
        description: 'Bachelor of Computer Science',
        departmentId: department.id,
        duration: 4
      }
    });
    console.log('Program created');

    // Create Levels
    const levels = [];
    for (let i = 1; i <= 4; i++) {
      const level = await prisma.level.upsert({
        where: { id: `level-${i}` },
        update: {},
        create: {
          id: `level-${i}`,
          level: i,
          programId: program.id
        }
      });
      levels.push(level);
    }
    console.log('Levels created');

    // Create Academic Session
    const session = await prisma.academicSession.upsert({
      where: { id: 'session-2024' },
      update: {},
      create: {
        id: 'session-2024',
        name: '2024/2025 Academic Session',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-08-31'),
        isCurrent: true,
        campusId: campus.id
      }
    });
    console.log('Academic Session created');

    // Create Semester
    const semester = await prisma.semester.upsert({
      where: { id: 'semester-1' },
      update: {},
      create: {
        id: 'semester-1',
        name: 'First Semester',
        sessionId: session.id,
        isCurrent: true,
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-01-31')
      }
    });
    console.log('Semester created');

    // Create Lecturer User
    const lecturerPassword = await bcrypt.hash('lecturer123', 10);
    const lecturerUser = await prisma.user.upsert({
      where: { email: 'lecturer@school.edu' },
      update: {},
      create: {
        email: 'lecturer@school.edu',
        password: lecturerPassword,
        role: 'LECTURER',
        lecturer: {
          create: {
            staffId: 'MC/CS/24/001',
            firstName: 'John',
            lastName: 'Doe',
            email: 'lecturer@school.edu',
            phone: '+1234567891',
            address: '456 Lecturer Lane',
            gender: 'MALE',
            departmentId: department.id,
            campusId: campus.id,
            position: 'Senior Lecturer'
          }
        }
      }
    });
    console.log('Lecturer created: lecturer@school.edu / lecturer123');

    // Create Courses
    const courseData = [
      { code: 'CS101', name: 'Introduction to Programming', creditHours: 3 },
      { code: 'CS102', name: 'Data Structures', creditHours: 4 },
      { code: 'CS201', name: 'Database Systems', creditHours: 3 },
      { code: 'CS301', name: 'Artificial Intelligence', creditHours: 4 }
    ];

    const createdCourses = [];
    for (const course of courseData) {
      const c = await prisma.course.upsert({
        where: { id: course.code },
        update: {},
        create: {
          id: course.code,
          code: course.code,
          name: course.name,
          creditHours: course.creditHours,
          semesterId: semester.id,
          departmentId: department.id,
          lecturerId: lecturerUser.lecturer.id
        }
      });
      createdCourses.push(c);
    }
    console.log('Courses created');

    // Create Student User
    const studentPassword = await bcrypt.hash('student123', 10);
    const studentUser = await prisma.user.upsert({
      where: { email: 'student@school.edu' },
      update: {},
      create: {
        email: 'student@school.edu',
        password: studentPassword,
        role: 'STUDENT',
        student: {
          create: {
            studentId: 'MC/CS/24/0001',
            firstName: 'Jane',
            lastName: 'Smith',
            gender: 'FEMALE',
            dateOfBirth: new Date('2005-05-15'),
            phone: '+1234567892',
            address: '789 Student Street',
            campusId: campus.id,
            programId: program.id,
            levelId: levels[0].id,
            departmentId: department.id,
            status: 'ACTIVE'
          }
        }
      }
    });
    console.log('Student created: student@school.edu / student123');

    // Create Parent User
    const parentPassword = await bcrypt.hash('parent123', 10);
    const parentUser = await prisma.user.upsert({
      where: { email: 'parent@school.edu' },
      update: {},
      create: {
        email: 'parent@school.edu',
        password: parentPassword,
        role: 'PARENT',
        parent: {
          create: {
            firstName: 'Robert',
            lastName: 'Smith',
            email: 'parent@school.edu',
            phone: '+1234567893',
            occupation: 'Engineer',
            address: '789 Parent Street'
          }
        }
      }
    });

    // Link student to parent
    await prisma.student.update({
      where: { id: studentUser.student.id },
      data: { parentId: parentUser.parent.id }
    });
    console.log('Parent created: parent@school.edu / parent123');

    // Create sample attendance
    for (let i = 0; i < 10; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      try {
        await prisma.attendance.upsert({
          where: {
            studentId_courseId_date: {
              studentId: studentUser.student.id,
              courseId: createdCourses[0].id,
              date: new Date(dateStr)
            }
          },
          update: {},
          create: {
            studentId: studentUser.student.id,
            courseId: createdCourses[0].id,
            semesterId: semester.id,
            date: new Date(dateStr),
            status: i < 8 ? 'PRESENT' : 'ABSENT'
          }
        });
      } catch (e) {
        // Skip if already exists
      }
    }
    console.log('Sample attendance created');

    // Create sample results
    const results = [
      { courseId: createdCourses[0].id, caScore: 25, examScore: 65 },
      { courseId: createdCourses[1].id, caScore: 20, examScore: 55 },
      { courseId: createdCourses[2].id, caScore: 18, examScore: 45 }
    ];

    for (const result of results) {
      const totalScore = result.caScore + result.examScore;
      let grade, gradePoint;
      if (totalScore >= 90) { grade = 'A'; gradePoint = 4.0; }
      else if (totalScore >= 80) { grade = 'B+'; gradePoint = 3.5; }
      else if (totalScore >= 70) { grade = 'B'; gradePoint = 3.0; }
      else if (totalScore >= 60) { grade = 'C+'; gradePoint = 2.5; }
      else if (totalScore >= 50) { grade = 'C'; gradePoint = 2.0; }
      else { grade = 'F'; gradePoint = 0.0; }

      try {
        await prisma.result.upsert({
          where: {
            studentId_courseId_semesterId: {
              studentId: studentUser.student.id,
              courseId: result.courseId,
              semesterId: semester.id
            }
          },
          update: {},
          create: {
            studentId: studentUser.student.id,
            courseId: result.courseId,
            semesterId: semester.id,
            caScore: result.caScore,
            examScore: result.examScore,
            totalScore: totalScore,
            grade,
            gradePoint
          }
        });
      } catch (e) {
        // Skip if already exists
      }
    }
    console.log('Sample results created');

    // Create sample payment
    try {
      await prisma.payment.create({
        data: {
          studentId: studentUser.student.id,
          amount: 50000,
          paymentType: 'TUITION',
          description: 'First Semester Tuition',
          status: 'COMPLETED',
          paidDate: new Date(),
          reference: 'REF-' + Date.now()
        }
      });
    } catch (e) {
      // Skip if already exists
    }
    console.log('Sample payment created');

    // Create Notice
    try {
      await prisma.notice.create({
        data: {
          title: 'Welcome to the New Academic Year',
          content: 'We welcome all students to the 2024/2025 academic session. Classes begin on September 1st, 2024.',
          adminId: admin.admin.id
        }
      });
    } catch (e) {
      // Skip if already exists
    }
    console.log('Sample notice created');

    console.log('\n=== DUMMY LOGIN CREDENTIALS ===');
    console.log('Admin:    admin@school.edu / admin123');
    console.log('Lecturer: lecturer@school.edu / lecturer123');
    console.log('Student:  student@school.edu / student123');
    console.log('Parent:   parent@school.edu / parent123');
    console.log('================================\n');
  } catch (error) {
    console.error('Seed error:', error);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
