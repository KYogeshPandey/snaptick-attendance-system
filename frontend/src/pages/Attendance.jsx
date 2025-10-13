// frontend/src/pages/Attendance.jsx - FINAL WITH LOADING SPINNER
import { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'

export default function Attendance() {
  // Basic states
  const [classrooms, setClassrooms] = useState([])
  const [selectedClassroom, setSelectedClassroom] = useState('')
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0])
  const [attendanceData, setAttendanceData] = useState([])
  const [saving, setSaving] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  
  // Camera states
  const [cameraActive, setCameraActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [recognizing, setRecognizing] = useState(false)
  
  // Refs
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    loadClassrooms()
    
    return () => {
      stopCamera()
    }
  }, [])

  useEffect(() => {
    if (selectedClassroom) {
      loadStudents(selectedClassroom)
    }
  }, [selectedClassroom])

  const loadClassrooms = async () => {
    try {
      const { data } = await api.get('/classrooms')
      setClassrooms(data)
      if (data.length > 0) {
        setSelectedClassroom(data[0].id)
      }
    } catch (e) {
      console.error('Failed to load classrooms:', e)
      alert('Failed to load classrooms')
    }
  }

  const loadStudents = async (classroomId) => {
    try {
      setLoadingStudents(true)
      const { data } = await api.get(`/students/classroom/${classroomId}`)
      
      const attendance = data.map(student => ({
        student_id: student.id,
        name: student.name,
        roll_no: student.roll_no,
        status: 'absent'
      }))
      
      setAttendanceData(attendance)
    } catch (e) {
      console.error('Failed to load students:', e)
    } finally {
      setLoadingStudents(false)
    }
  }

  // ==================== CAMERA FUNCTIONS ====================
  
  const startCamera = async () => {
    try {
      console.log('🎥 Requesting camera access...')
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      })
      
      console.log('✅ Camera access granted!')
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraActive(true)
        setCapturedImage(null)
        console.log('✅ Video playing successfully')
      }
    } catch (err) {
      console.error('❌ Camera access error:', err)
      
      let errorTitle = '❌ Camera Access Problem!\n\n'
      let errorMessage = ''
      let helpText = ''
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = '🔒 Camera permission was blocked.\n\n'
        helpText = '📍 How to Fix (One-Time Setup):\n\n'
        helpText += '1️⃣ Click the 🔒 lock icon in address bar\n'
        helpText += '2️⃣ Find "Camera" permission\n'
        helpText += '3️⃣ Change it to "Allow"\n'
        helpText += '4️⃣ ✅ Check "Remember this decision"\n'
        helpText += '5️⃣ Refresh page (F5) and try again\n\n'
        helpText += '💡 After this, camera will open instantly!'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = '📷 No camera detected on your device!\n\n'
        helpText = 'Please check:\n'
        helpText += '• Camera is connected\n'
        helpText += '• Camera drivers are installed\n'
        helpText += '• Camera is not being used by another app'
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = '⚠️ Camera is busy or unavailable!\n\n'
        helpText = 'Try:\n'
        helpText += '• Close other apps using camera\n'
        helpText += '• Restart browser\n'
        helpText += '• Check if camera works in other apps'
      } else {
        errorMessage = '⚠️ Unexpected error occurred!\n\n'
        helpText = 'Error: ' + err.message
      }
      
      alert(errorTitle + errorMessage + helpText)
    }
  }

  const stopCamera = () => {
    console.log('🛑 Stopping camera...')
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        console.log('Track stopped:', track.kind)
      })
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }

  const capturePhoto = () => {
    console.log('📸 Capturing photo...')
    
    if (!videoRef.current || !canvasRef.current) {
      alert('❌ Video element not ready!')
      return
    }
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    canvas.toBlob((blob) => {
      const file = new File([blob], 'captured-photo.jpg', { type: 'image/jpeg' })
      const url = URL.createObjectURL(blob)
      setCapturedImage({ blob, file, url })
      stopCamera()
      console.log('✅ Photo captured successfully!')
    }, 'image/jpeg', 0.95)
  }

  const recognizeFaces = async (imageFile) => {
    if (!imageFile) {
      alert('❌ No image selected')
      return
    }

    if (!selectedClassroom) {
      alert('❌ Please select a classroom first')
      return
    }

    try {
      setRecognizing(true)
      console.log('🔍 Starting face recognition...')
      
      const formData = new FormData()
      formData.append('file', imageFile)
      formData.append('classroom_id', selectedClassroom)
      
      const { data } = await api.post('/recognize', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      console.log('✅ Recognition result:', data)
      
      if (data.success) {
        setAttendanceData(prev => prev.map(student => {
          if (data.present_ids.includes(student.student_id)) {
            return { ...student, status: 'present' }
          }
          return { ...student, status: 'absent' }
        }))
        
        let resultMessage = '✅ Face Recognition Complete!\n\n'
        resultMessage += `✓ Present: ${data.present.length} students\n`
        resultMessage += `✗ Absent: ${data.absent.length} students\n`
        resultMessage += `👥 Total Faces Detected: ${data.total_detected}\n\n`
        
        if (data.students_without_photos && data.students_without_photos.length > 0) {
          resultMessage += `⚠️ Students without photos:\n${data.students_without_photos.join(', ')}`
        }
        
        alert(resultMessage)
      } else {
        alert('❌ Recognition failed: ' + (data.error || 'Unknown error'))
      }
      
    } catch (e) {
      console.error('❌ Recognition failed:', e)
      const errorMsg = e.response?.data?.error || e.message
      alert('❌ Recognition failed!\n\n' + errorMsg)
    } finally {
      setRecognizing(false)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setCapturedImage({ file, url })
      console.log('📁 File uploaded:', file.name)
    }
  }

  // ==================== ATTENDANCE FUNCTIONS ====================
  
  const toggleStatus = (studentId) => {
    setAttendanceData(prev => prev.map(student => 
      student.student_id === studentId 
        ? { ...student, status: student.status === 'present' ? 'absent' : 'present' }
        : student
    ))
  }

  const markAllPresent = () => {
    setAttendanceData(prev => prev.map(student => ({ ...student, status: 'present' })))
    console.log('✅ Marked all students present')
  }

  const markAllAbsent = () => {
    setAttendanceData(prev => prev.map(student => ({ ...student, status: 'absent' })))
    console.log('❌ Marked all students absent')
  }

  const saveAttendance = async () => {
    if (!attendanceData.length) {
      alert('❌ No attendance data to save!')
      return
    }

    const presentCount = attendanceData.filter(s => s.status === 'present').length
    
    if (presentCount === 0) {
      const confirm = window.confirm('⚠️ No students marked present!\n\nAre you sure you want to save?')
      if (!confirm) return
    }

    try {
      setSaving(true)
      
      const attendance = attendanceData.map(student => ({
        student_id: student.student_id,
        status: student.status
      }))

      const payload = {
        classroom_id: parseInt(selectedClassroom),
        date: currentDate,
        attendance: attendance
      }
      
      console.log('💾 Saving attendance...', payload)
      
      const { data } = await api.post('/attendance/mark', payload)
      
      console.log('✅ Attendance saved:', data)
      
      alert(`✅ Attendance Saved Successfully!\n\n📝 Marked: ${data.marked}\n🔄 Updated: ${data.updated || 0}`)
      
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage.url)
        setCapturedImage(null)
      }
      
    } catch (e) {
      console.error('❌ Failed to save attendance:', e)
      alert('❌ Failed to save attendance!\n\n' + (e.response?.data?.message || e.message))
    } finally {
      setSaving(false)
    }
  }

  const getClassroomName = () => {
    const classroom = classrooms.find(c => c.id === parseInt(selectedClassroom))
    return classroom ? `${classroom.name} - ${classroom.subject}` : 'No classroom selected'
  }

  const presentCount = attendanceData.filter(s => s.status === 'present').length
  const absentCount = attendanceData.length - presentCount

  // ==================== RENDER ====================
  
  return (
    <div style={{ padding: 24, background: '#f3f4f6', minHeight: '100vh' }}>
      <h2 style={{ marginBottom: 24, fontSize: 28, fontWeight: 700 }}>
        📸 Mark Attendance with Face Recognition
      </h2>

      {/* Classroom & Date Selection */}
      <div style={{ marginBottom: 24, padding: 20, background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
              Select Classroom:
            </label>
            <select
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value)}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} - {c.subject}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
              Date:
            </label>
            <input
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 14
              }}
            />
          </div>
        </div>

        <div style={{ padding: 16, background: '#dbeafe', borderRadius: 8, border: '1px solid #60a5fa' }}>
          <strong style={{ fontSize: 15 }}>📚 {getClassroomName()}</strong>
          <span style={{ marginLeft: 16, color: '#1e40af' }}>
            | 👥 <strong>{attendanceData.length}</strong> Students
          </span>
        </div>
      </div>

      {/* Camera Section */}
      <div style={{ marginBottom: 24, padding: 20, background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>🎥 Face Recognition</h3>
        
        {/* Buttons */}
        {!cameraActive && !capturedImage && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <button
              onClick={startCamera}
              style={{
                padding: '14px 28px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(59,130,246,0.3)'
              }}
              onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            >
              📷 Open Camera
            </button>

            <label style={{
              padding: '14px 28px',
              background: '#10b981',
              color: '#fff',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(16,185,129,0.3)'
            }}>
              📁 Upload Photo
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        )}

        {/* Camera Preview */}
        <div style={{ display: cameraActive ? 'block' : 'none' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              maxWidth: 640,
              borderRadius: 12,
              border: '3px solid #3b82f6',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              marginBottom: 12
            }}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={capturePhoto}
              style={{
                padding: '12px 24px',
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(16,185,129,0.3)'
              }}
            >
              📸 Capture Photo
            </button>
            <button
              onClick={() => {
                stopCamera()
                setCameraActive(false)
              }}
              style={{
                padding: '12px 24px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              ❌ Close Camera
            </button>
          </div>
        </div>

        {/* Captured Image */}
        {capturedImage && !recognizing && (
          <div>
            <img
              src={capturedImage.url}
              alt="Captured"
              style={{
                maxWidth: 640,
                width: '100%',
                borderRadius: 12,
                border: '3px solid #10b981',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                marginBottom: 12
              }}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => recognizeFaces(capturedImage.file)}
                style={{
                  padding: '12px 24px',
                  background: '#6366f1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(99,102,241,0.3)'
                }}
              >
                🔍 Recognize Faces
              </button>
              <button
                onClick={() => {
                  URL.revokeObjectURL(capturedImage.url)
                  setCapturedImage(null)
                }}
                style={{
                  padding: '12px 24px',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                🔄 Retake Photo
              </button>
            </div>
          </div>
        )}

        {/* Recognition Loading Spinner */}
        {recognizing && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: 300,
            padding: 40 
          }}>
            <div style={{ 
              width: 60, 
              height: 60, 
              border: '6px solid #f3f4f6',
              borderTop: '6px solid #6366f1',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <div style={{ marginTop: 20, color: '#6366f1', fontSize: 16, fontWeight: 600 }}>
              🔍 Recognizing faces...
            </div>
            <div style={{ marginTop: 8, color: '#6b7280', fontSize: 14 }}>
              This may take a few seconds
            </div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {/* Quick Actions */}
      {attendanceData.length > 0 && (
        <div style={{ marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button 
            onClick={markAllPresent} 
            style={{ 
              padding: '10px 20px', 
              background: '#10b981', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 6, 
              fontWeight: 500, 
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            ✅ Mark All Present
          </button>
          <button 
            onClick={markAllAbsent} 
            style={{ 
              padding: '10px 20px', 
              background: '#ef4444', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 6, 
              fontWeight: 500, 
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            ❌ Mark All Absent
          </button>
          <button 
            onClick={saveAttendance} 
            disabled={saving} 
            style={{ 
              padding: '10px 20px', 
              background: saving ? '#9ca3af' : '#3b82f6', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 6, 
              fontWeight: 500, 
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 14
            }}
          >
            {saving ? '💾 Saving...' : '💾 Save Attendance'}
          </button>
        </div>
      )}

      {/* Summary Cards */}
      {attendanceData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div style={{ padding: 20, background: '#d1fae5', borderRadius: 12, border: '2px solid #10b981' }}>
            <div style={{ fontSize: 14, color: '#065f46', marginBottom: 8, fontWeight: 500 }}>✅ Present</div>
            <div style={{ fontSize: 36, fontWeight: 'bold', color: '#065f46' }}>{presentCount}</div>
          </div>
          <div style={{ padding: 20, background: '#fee2e2', borderRadius: 12, border: '2px solid #ef4444' }}>
            <div style={{ fontSize: 14, color: '#991b1b', marginBottom: 8, fontWeight: 500 }}>❌ Absent</div>
            <div style={{ fontSize: 36, fontWeight: 'bold', color: '#991b1b' }}>{absentCount}</div>
          </div>
          <div style={{ padding: 20, background: '#dbeafe', borderRadius: 12, border: '2px solid #3b82f6' }}>
            <div style={{ fontSize: 14, color: '#1e40af', marginBottom: 8, fontWeight: 500 }}>📊 Percentage</div>
            <div style={{ fontSize: 36, fontWeight: 'bold', color: '#1e40af' }}>
              {attendanceData.length > 0 ? Math.round((presentCount/attendanceData.length)*100) : 0}%
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loadingStudents && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: 300,
          padding: 40 
        }}>
          <div style={{ 
            width: 50, 
            height: 50, 
            border: '5px solid #f3f4f6',
            borderTop: '5px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div style={{ marginTop: 16, color: '#6b7280', fontSize: 16 }}>Loading students...</div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Table */}
      {!loadingStudents && attendanceData.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#1f2937', color: '#fff' }}>
              <tr>
                <th style={{ padding: 16, textAlign: 'left', fontWeight: 600 }}>S.No</th>
                <th style={{ padding: 16, textAlign: 'left', fontWeight: 600 }}>Roll No</th>
                <th style={{ padding: 16, textAlign: 'left', fontWeight: 600 }}>Name</th>
                <th style={{ padding: 16, textAlign: 'center', fontWeight: 600 }}>Status</th>
                <th style={{ padding: 16, textAlign: 'center', fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {attendanceData.map((student, idx) => (
                <tr key={student.student_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 16 }}>{idx + 1}</td>
                  <td style={{ padding: 16, fontWeight: 500 }}>{student.roll_no}</td>
                  <td style={{ padding: 16 }}>{student.name}</td>
                  <td style={{ padding: 16, textAlign: 'center' }}>
                    <span style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      background: student.status === 'present' ? '#d1fae5' : '#fee2e2',
                      color: student.status === 'present' ? '#065f46' : '#991b1b',
                      fontWeight: 600,
                      fontSize: 14
                    }}>
                      {student.status === 'present' ? '✅ Present' : '❌ Absent'}
                    </span>
                  </td>
                  <td style={{ padding: 16, textAlign: 'center' }}>
                    <button
                      onClick={() => toggleStatus(student.student_id)}
                      style={{
                        padding: '8px 16px',
                        background: student.status === 'present' ? '#ef4444' : '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontSize: 13
                      }}
                    >
                      Mark {student.status === 'present' ? 'Absent' : 'Present'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loadingStudents && attendanceData.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12 }}>
          <div style={{ fontSize: 48 }}>👨‍🎓</div>
          <div style={{ fontSize: 18, fontWeight: 500, marginTop: 16, color: '#111827' }}>No Students Found</div>
          <div style={{ color: '#6b7280', marginTop: 8, fontSize: 14 }}>Add students to this classroom to mark attendance</div>
        </div>
      )}
    </div>
  )
}
