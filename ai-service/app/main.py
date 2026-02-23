from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
import numpy as np
import os
from dotenv import load_dotenv
from sklearn.ensemble import RandomForestClassifier
import pandas as pd

load_dotenv()

app = FastAPI(title="AI Analytics Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/school_management")

def get_db_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

class PredictionRequest(BaseModel):
    studentId: str
    semesterId: str = None

@app.get("/predict-failure-risk/{studentId}")
async def predict_failure_risk(studentId: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT r."courseId", r."caScore", r."examScore", r."totalScore", r."gradePoint", c."creditHours"
            FROM "Result" r
            JOIN "Course" c ON r."courseId" = c.id
            WHERE r."studentId" = %s
        """, (studentId,))
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        if not results:
            return {"risk": "unknown", "message": "No academic data available"}
        
        df = pd.DataFrame(results)
        avg_gpa = df['gradePoint'].mean()
        total_credits = df['creditHours'].sum()
        failed_courses = len(df[df['gradePoint'] < 1.0])
        
        risk_score = 0
        if avg_gpa < 1.5:
            risk_score += 40
        elif avg_gpa < 2.0:
            risk_score += 20
        
        risk_score += (failed_courses * 15)
        
        risk_level = "low" if risk_score < 20 else "medium" if risk_score < 40 else "high"
        
        return {
            "studentId": studentId,
            "riskLevel": risk_level,
            "riskScore": risk_score,
            "avgGPA": round(avg_gpa, 2),
            "failedCourses": failed_courses,
            "totalCredits": total_credits
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/predict-dropout-risk/{studentId}")
async def predict_dropout_risk(studentId: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT COUNT(*) as total_attendance,
                   SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as present_count
            FROM "Attendance"
            WHERE "studentId" = %s
        """, (studentId,))
        
        attendance = cursor.fetchone()
        
        cursor.execute("""
            SELECT r."gradePoint", c."creditHours"
            FROM "Result" r
            JOIN "Course" c ON r."courseId" = c.id
            WHERE r."studentId" = %s
        """, (studentId,))
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        if not results or not attendance:
            return {"risk": "unknown"}
        
        attendance_rate = (attendance['present_count'] / attendance['total_attendance'] * 100) if attendance['total_attendance'] > 0 else 0
        avg_gpa = np.mean([r['gradePoint'] for r in results if r['gradePoint']])
        
        dropout_risk = 0
        if attendance_rate < 60:
            dropout_risk += 30
        if avg_gpa < 1.5:
            dropout_risk += 30
        if attendance_rate < 80 and avg_gpa < 2.0:
            dropout_risk += 20
        
        risk_level = "low" if dropout_risk < 25 else "medium" if dropout_risk < 50 else "high"
        
        return {
            "studentId": studentId,
            "riskLevel": risk_level,
            "dropoutRiskScore": dropout_risk,
            "attendanceRate": round(attendance_rate, 2),
            "averageGPA": round(avg_gpa, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/attendance-performance-correlation/{studentId}")
async def attendance_performance_correlation(studentId: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                DATE_TRUNC('week', date) as week,
                COUNT(*) as total_classes,
                SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as present
            FROM "Attendance"
            WHERE "studentId" = %s
            GROUP BY DATE_TRUNC('week', date)
            ORDER BY week
        """, (studentId,))
        
        attendance_data = cursor.fetchall()
        
        cursor.execute("""
            SELECT r."totalScore", r."semesterId", c."code"
            FROM "Result" r
            JOIN "Course" c ON r."courseId" = c.id
            WHERE r."studentId" = %s
        """, (studentId,))
        
        result_data = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return {
            "studentId": studentId,
            "weeklyAttendance": attendance_data,
            "courseResults": result_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cgpa-projection/{studentId}")
async def cgpa_projection(studentId: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT r."semesterId", s.name as semester_name,
                   SUM(r."gradePoint" * c."creditHours") / NULLIF(SUM(c."creditHours"), 0) as semester_gpa
            FROM "Result" r
            JOIN "Course" c ON r."courseId" = c.id
            JOIN "Semester" s ON r."semesterId" = s.id
            WHERE r."studentId" = %s
            GROUP BY r."semesterId", s.name
            ORDER BY r."semesterId"
        """, (studentId,))
        
        semester_gpas = cursor.fetchall()
        cursor.close()
        conn.close()
        
        if not semester_gpas:
            return {"projection": "unknown", "message": "Insufficient data"}
        
        gpas = [s['semester_gpa'] for s in semester_gpas if s['semester_gpa']]
        
        if len(gpas) >= 2:
            trend = gpas[-1] - gpas[0]
            projected = gpas[-1] + (trend * 0.5)
            projected = max(0, min(4.0, projected))
        else:
            projected = gpas[0] if gpas else 0
        
        return {
            "studentId": studentId,
            "currentCGPA": round(gpas[-1], 2) if gpas else 0,
            "projectedCGPA": round(projected, 2),
            "trend": "improving" if trend > 0 else "declining" if trend < 0 else "stable"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/lecturer-effectiveness/{campusId}")
async def lecturer_effectiveness(campusId: str = None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT l.id, l."firstName", l."lastName", d.name as department,
                   COUNT(DISTINCT r."studentId") as students_taught,
                   AVG(r."totalScore") as avg_score,
                   COUNT(r.id) as total_courses
            FROM "Lecturer" l
            JOIN "Department" d ON l."departmentId" = d.id
            LEFT JOIN "Course" c ON c."lecturerId" = l.id
            LEFT JOIN "Result" r ON r."courseId" = c.id
        """
        
        if campusId:
            query += f" WHERE l.\"campusId\" = '{campusId}'"
        
        query += " GROUP BY l.id, l.\"firstName\", l.\"lastName\", d.name ORDER BY avg_score DESC"
        
        cursor.execute(query)
        lecturers = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return {"lecturers": lecturers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/dashboard/{campusId}")
async def dashboard_analytics(campusId: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) as total FROM "Student" WHERE "campusId" = %s', (campusId,))
        total_students = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as total FROM "Lecturer" WHERE "campusId" = %s', (campusId,))
        total_lecturers = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as total FROM "Course" c JOIN "Semester" s ON c."semesterId" = s.id WHERE s."isCurrent" = true')
        total_courses = cursor.fetchone()['total']
        
        cursor.execute("""
            SELECT SUM(amount) as total FROM "Payment" 
            WHERE status = 'COMPLETED' AND "paidDate" >= CURRENT_DATE - INTERVAL '30 days'
        """)
        monthly_revenue = cursor.fetchone()['total'] or 0
        
        cursor.execute("""
            SELECT COUNT(*) as count FROM "Attendance" 
            WHERE status = 'ABSENT' AND date >= CURRENT_DATE - INTERVAL '7 days'
        """)
        weekly_absences = cursor.fetchone()['count']
        
        cursor.close()
        conn.close()
        
        return {
            "campusId": campusId,
            "totalStudents": total_students,
            "totalLecturers": total_lecturers,
            "totalCourses": total_courses,
            "monthlyRevenue": monthly_revenue,
            "weeklyAbsences": weekly_absences
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
