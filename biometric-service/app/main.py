from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import face_recognition
import numpy as np
import cv2
import base64
import json
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Biometric Attendance Service")

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

class RegisterFaceRequest(BaseModel):
    studentId: str
    encoding: list

class MarkAttendanceRequest(BaseModel):
    studentId: str
    courseId: str
    semesterId: str
    deviceId: str = None
    latitude: float = None
    longitude: float = None

def base64_to_image(base64_string):
    img_data = base64.b64decode(base64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

@app.post("/register-face")
async def register_face(studentId: str = Form(...), image: UploadFile = File(...)):
    try:
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        encodings = face_recognition.face_encodings(rgb_img)
        
        if len(encodings) == 0:
            raise HTTPException(status_code=400, detail="No face detected in image")
        
        encoding = encodings[0].tolist()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO "BiometricData" (id, "studentId", "faceEncoding", "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), %s, %s, NOW(), NOW())
            ON CONFLICT ("studentId") DO UPDATE SET "faceEncoding" = %s, "updatedAt" = NOW()
        """, (studentId, json.dumps(encoding), json.dumps(encoding)))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {"message": "Face registered successfully", "studentId": studentId}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/verify-face")
async def verify_face(image: UploadFile = File(...)):
    try:
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        unknown_encodings = face_recognition.face_encodings(rgb_img)
        
        if len(unknown_encodings) == 0:
            raise HTTPException(status_code=400, detail="No face detected")
        
        if len(unknown_encodings) > 1:
            raise HTTPException(status_code=400, detail="Multiple faces detected")
        
        unknown_encoding = unknown_encodings[0]
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT "studentId", "faceEncoding" FROM "BiometricData" WHERE "faceEncoding" IS NOT NULL')
        records = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        for record in records:
            stored_encoding = np.array(json.loads(record["faceEncoding"]))
            match = face_recognition.compare_faces([stored_encoding], unknown_encoding, tolerance=0.5)
            
            if match[0]:
                return {"verified": True, "studentId": record["studentId"]}
        
        return {"verified": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/mark-attendance")
async def mark_attendance(request: MarkAttendanceRequest):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO "Attendance" (id, "studentId", "courseId", "semesterId", date, status, "deviceId", latitude, longitude, "createdAt")
            VALUES (gen_random_uuid(), %s, %s, %s, NOW(), 'PRESENT', %s, %s, %s, NOW())
            ON CONFLICT ("studentId", "courseId", date) DO UPDATE SET status = 'PRESENT'
        """, (request.studentId, request.courseId, request.semesterId, request.deviceId, request.latitude, request.longitude))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {"message": "Attendance marked successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
