# Modern School Management System

A comprehensive institutional-grade smart academic infrastructure system with AI-powered analytics, biometric attendance, parent portal, CBT examinations, and finance management.

## Features

### Core Academic Features
- Student enrollment and management with auto-generated student IDs
- Course enrollment and program tracking
- Academic session and semester management
- Results and CGPA calculation
- Academic probation detection
- Carryover identification
- Multi-campus support

### Biometric Attendance (Python FastAPI)
- Facial recognition attendance (OpenCV + FaceNet)
- Fingerprint attendance support
- Geo-fenced classroom attendance
- Device binding for attendance

### Parent Portal
- Real-time attendance tracking
- Result viewing
- Payment tracking
- Academic risk alerts
- Performance summaries

### Finance Module
- Tuition payment portal
- Installment payment support
- Automated receipts
- Payment analytics
- Defaulter detection

### AI Analytics (Python FastAPI)
- Student failure prediction
- Dropout risk detection
- Attendance-performance correlation
- CGPA projection
- Lecturer effectiveness analytics

### CBT Examination
- Online examination engine
- Question bank with randomization
- Tab-switch detection
- Auto-grading
- Browser lockdown

### Multi-Campus Support
- Multiple campus management
- Unified academic database
- Cross-campus student transfer

## Tech Stack

- **Frontend**: React + Material UI + Redux
- **Backend**: Node.js + Express
- **Database**: PostgreSQL + Prisma ORM
- **AI Service**: Python FastAPI
- **Biometric Service**: Python FastAPI + OpenCV
- **Docker**: Docker Compose for orchestration

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Python 3.10+
- Docker & Docker Compose

### Quick Start with Docker

```bash
docker-compose up -d
```

### Manual Setup

#### Backend
```bash
cd backend
npm install
# Update .env with your PostgreSQL credentials
npx prisma generate
npx prisma db push
npm start
```

#### Biometric Service
```bash
cd biometric-service
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

#### AI Service
```bash
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --port 8001
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/school_management"
JWT_SECRET="your-super-secret-jwt-key"
PORT=5000
```

## API Endpoints

### Authentication
- `POST /AdminReg` - Register admin
- `POST /AdminLogin` - Admin login
- `POST /StudentReg` - Register student
- `POST /StudentLogin` - Student login
- `POST /ParentReg` - Register parent
- `POST /ParentLogin` - Parent login

### Academic Management
- `POST /Campus` - Create campus
- `POST /Department` - Create department
- `POST /Program` - Create program
- `POST /Level` - Create level
- `POST /Course` - Create course
- `POST /Enrollment` - Enroll student
- `GET /AcademicSessions` - Get sessions
- `GET /CurrentSemester` - Get current semester

### Attendance
- `POST /Attendance` - Mark attendance
- `GET /Attendance` - Get attendance records
- `GET /AttendanceStats` - Get attendance stats

### Results
- `POST /Result` - Update result
- `GET /Results` - Get results
- `GET /CGPA/:studentId` - Calculate CGPA
- `GET /Carryovers` - Get carryover courses

### Finance
- `POST /Payment` - Create payment
- `GET /Payments` - Get payments
- `POST /VerifyPayment` - Verify payment
- `GET /FinanceAnalytics` - Get finance analytics
- `GET /Defaulters` - Get defaulters

### CBT Examination
- `POST /Exam` - Create exam
- `POST /Exam/:id/Question` - Add question
- `POST /Exam/:examId/Start` - Start exam
- `PUT /ExamSubmission/:id` - Submit exam
- `POST /ExamSubmission/:id/TabSwitch` - Record tab switch

### Parent Portal
- `GET /Parent/Children` - Get linked children
- `GET /Parent/Child/:studentId/Attendance` - Get child's attendance
- `GET /Parent/Child/:studentId/Results` - Get child's results
- `GET /Parent/Child/:studentId/Payments` - Get child's payments

## Architecture

```
├── backend/           # Node.js + Express API
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── index.js
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
├── biometric-service/  # Facial recognition service
│   ├── app/
│   │   └── main.py
│   └── requirements.txt
├── ai-service/       # AI analytics service
│   ├── app/
│   │   └── main.py
│   └── requirements.txt
├── frontend/         # React application
└── docker-compose.yml
```

## Database Schema

Key models:
- User (with roles: ADMIN, STUDENT, LECTURER, PARENT)
- Campus, Department, Program, Level
- AcademicSession, Semester
- Student, Lecturer, Parent
- Course, Enrollment
- Attendance, Result
- Payment
- Exam, ExamQuestion, ExamSubmission
- BiometricData

## License

MIT
