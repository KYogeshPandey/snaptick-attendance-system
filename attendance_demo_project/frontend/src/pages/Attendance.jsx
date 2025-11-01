// frontend/src/pages/Attendance.jsx - PHASE 2 + 4: COMPLETE (UX + RATE LIMITING)
import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../services/api'

export default function Attendance() {
  // ==================== STATE MANAGEMENT ====================
  
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
  
  // Review Modal states (4-tier system)
  const [uncertainMatches, setUncertainMatches] = useState([])
  const [unknownFaces, setUnknownFaces] = useState([])
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [recognitionSummary, setRecognitionSummary] = useState(null)
  
  // PHASE 2: UX Polish - Keyboard shortcuts
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0)
  
  // PHASE 4: Rate limit state
  const [rateLimitInfo, setRateLimitInfo] = useState(null)
  
  // Refs
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)


  // ==================== CALLBACK FUNCTIONS ====================
  
  const loadClassrooms = useCallback(async () => {
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
  }, [])

  const stopCamera = useCallback(() => {
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
  }, [])

  const approveMatch = useCallback((studentId) => {
    const match = uncertainMatches.find(m => m.student_id === studentId)
    if (match) {
      setAttendanceData(prev => prev.map(student => 
        student.student_id === studentId
          ? { 
              ...student, 
              status: 'present',
              confidence: match.confidence,
              distance: match.distance
            }
          : student
      ))
      setUncertainMatches(prev => prev.filter(m => m.student_id !== studentId))
      console.log(`✅ Approved: ${match.student_name}`)
    }
  }, [uncertainMatches])

  const rejectMatch = useCallback((studentId) => {
    setUncertainMatches(prev => prev.filter(m => m.student_id !== studentId))
    console.log(`❌ Rejected: Student ID ${studentId}`)
  }, [])

  // ==================== EFFECTS ====================
  
  useEffect(() => {
    loadClassrooms()
    
    // Keyboard shortcuts handler
    const handleKeyPress = (e) => {
      if (!showReviewModal || uncertainMatches.length === 0) return
      
      const currentMatch = uncertainMatches[currentReviewIndex]
      if (!currentMatch) return
      
      // Prevent default for our shortcut keys
      if (['a', 'x', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault()
      }
      
      switch(e.key.toLowerCase()) {
        case 'a':
          approveMatch(currentMatch.student_id)
          setCurrentReviewIndex(prev => Math.min(prev, uncertainMatches.length - 2))
          console.log('⌨️ Keyboard: Approved')
          break
          
        case 'x':
          rejectMatch(currentMatch.student_id)
          setCurrentReviewIndex(prev => Math.min(prev, uncertainMatches.length - 2))
          console.log('⌨️ Keyboard: Rejected')
          break
          
        case 'u':
          setCurrentReviewIndex(prev => 
            prev < uncertainMatches.length - 1 ? prev + 1 : 0
          )
          console.log('⌨️ Keyboard: Skipped')
          break
          
        default:
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    
    return () => {
      stopCamera()
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [showReviewModal, uncertainMatches, currentReviewIndex, approveMatch, rejectMatch, stopCamera, loadClassrooms])

  const loadAttendanceForDate = useCallback(async (classroomId, date) => {
    try {
      setLoadingStudents(true)
      console.log(`📅 Loading attendance for classroom ${classroomId} on ${date}`)
      
      const { data: attendanceRecords } = await api.get(`/attendance/${classroomId}`, {
        params: { date }
      })
      
      if (attendanceRecords && attendanceRecords.length > 0) {
        console.log('✅ Found existing attendance:', attendanceRecords.length)
        setAttendanceData(attendanceRecords.map(record => ({
          student_id: record.student_id,
          name: record.student_name,
          roll_no: record.roll_no,
          status: record.status,
          confidence: record.confidence,
          distance: record.distance
        })))
      } else {
        console.log('📝 No attendance found, loading students...')
        const { data: students } = await api.get(`/students/classroom/${classroomId}`)
        
        const attendance = students.map(student => ({
          student_id: student.id,
          name: student.name,
          roll_no: student.roll_no,
          status: 'absent'
        }))
        
        setAttendanceData(attendance)
      }
      
    } catch (e) {
      console.error('Failed to load attendance:', e)
      try {
        const { data: students } = await api.get(`/students/classroom/${classroomId}`)
        const attendance = students.map(student => ({
          student_id: student.id,
          name: student.name,
          roll_no: student.roll_no,
          status: 'absent'
        }))
        setAttendanceData(attendance)
      } catch (err) {
        console.error('Failed to load students:', err)
        setAttendanceData([])
      }
    } finally {
      setLoadingStudents(false)
    }
  }, [])

  useEffect(() => {
    if (selectedClassroom && currentDate) {
      loadAttendanceForDate(selectedClassroom, currentDate)
    }
  }, [selectedClassroom, currentDate, loadAttendanceForDate])

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

  // ==================== FACE RECOGNITION ====================
  
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
      console.log('🔍 Starting face recognition with MTCNN (96.4% accuracy)...')
      
      const formData = new FormData()
      formData.append('image', imageFile)
      formData.append('classroom_id', selectedClassroom)
      formData.append('date', currentDate)
      
      const { data } = await api.post('/attendance/mark_face', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      console.log('✅ Recognition result:', data)
      
      // PHASE 4: Store rate limit info
      if (data.rate_limit) {
        setRateLimitInfo(data.rate_limit)
        console.log(`🔒 Rate limit: ${data.rate_limit.remaining}/${data.rate_limit.limit} remaining`)
      }
      
      // Update high-confidence matches
      if (data.high_confidence_matches) {
        setAttendanceData(prev => prev.map(student => {
          const match = data.high_confidence_matches.find(m => m.student_id === student.student_id)
          if (match) {
            return { 
              ...student, 
              status: 'present',
              confidence: match.confidence,
              distance: match.distance
            }
          }
          return student
        }))
      }
      
      setUncertainMatches(data.uncertain_matches || [])
      setUnknownFaces(data.unknown_faces || [])
      setRecognitionSummary(data.summary)
      
      // Show review modal if there are uncertain matches
      if (data.uncertain_matches && data.uncertain_matches.length > 0) {
        setShowReviewModal(true)
      } else {
        let resultMessage = '✅ Face Recognition Complete!\n\n'
        resultMessage += `✓ High Confidence (Tier 1): ${data.summary.present} students\n`
        resultMessage += `✗ Absent: ${data.summary.absent} students\n`
        if (data.summary.unknown_faces > 0) {
          resultMessage += `❓ Unknown Faces (Tier 4): ${data.summary.unknown_faces}\n`
        }
        alert(resultMessage)
      }
      
    } catch (e) {
      console.error('❌ Recognition failed:', e)
      
      // PHASE 4: Handle rate limit errors (HTTP 429)
      if (e.response?.status === 429) {
        const errorData = e.response?.data
        const errorMsg = errorData?.error || 'Rate limit exceeded'
        
        alert(
          '⚠️ Rate Limit Exceeded!\n\n' +
          errorMsg + '\n\n' +
          '💡 Why this limit?\n' +
          '• Prevents server overload\n' +
          '• Ensures fair usage for all teachers\n' +
          '• Limit: 80 face recognitions per hour\n' +
          '• Typical usage: 10-15 per day\n\n' +
          'Please wait and try again later.'
        )
      } else {
        const errorMsg = e.response?.data?.error || e.message
        alert('❌ Recognition failed!\n\n' + errorMsg)
      }
    } finally {
      setRecognizing(false)
    }
  }

  // ==================== UTILITY FUNCTIONS ====================
  
  const closeReviewModal = () => {
    setShowReviewModal(false)
    
    if (recognitionSummary) {
      const approvedCount = attendanceData.filter(s => s.status === 'present').length
      let message = '✅ Attendance Marked Successfully!\n\n'
      message += `✓ Present: ${approvedCount} students\n`
      message += `✗ Absent: ${recognitionSummary.total_students - approvedCount}\n`
      if (recognitionSummary.unknown_faces > 0) {
        message += `❓ Unknown Faces: ${recognitionSummary.unknown_faces}\n`
      }
      alert(message)
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
      
      loadAttendanceForDate(selectedClassroom, currentDate)
      
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

      {/* PHASE 4: Rate Limit Info Banner */}
      {rateLimitInfo && rateLimitInfo.remaining < 20 && (
        <div style={{
          padding: 16,
          background: rateLimitInfo.remaining < 10 ? '#fee2e2' : '#fef3c7',
          borderRadius: 12,
          marginBottom: 20,
          border: `2px solid ${rateLimitInfo.remaining < 10 ? '#ef4444' : '#f59e0b'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong style={{ color: rateLimitInfo.remaining < 10 ? '#991b1b' : '#92400e' }}>
              ⚠️ Rate Limit Warning
            </strong>
            <p style={{ fontSize: 13, color: rateLimitInfo.remaining < 10 ? '#7f1d1d' : '#78350f', marginTop: 4, marginBottom: 0 }}>
              You have <strong>{rateLimitInfo.remaining}</strong> face recognition requests remaining this hour
            </p>
          </div>
          <div style={{ fontSize: 28, fontWeight: 'bold', color: rateLimitInfo.remaining < 10 ? '#ef4444' : '#f59e0b' }}>
            {rateLimitInfo.remaining}/{rateLimitInfo.limit}
          </div>
        </div>
      )}

      {/* ==================== REVIEW MODAL - 4 TIER SYSTEM ==================== */}
      {showReviewModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 32,
            maxWidth: 700,
            width: '100%',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginBottom: 16, fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>
              ⚠️ Review Uncertain Matches
            </h3>
            <p style={{ color: '#6b7280', marginBottom: 16, fontSize: 14 }}>
              Phase 2: MTCNN + 4-tier recognition system
            </p>

            {/* Keyboard Shortcuts Info */}
            <div style={{
              padding: 12,
              background: '#e0e7ff',
              borderRadius: 8,
              marginBottom: 20,
              border: '1px solid #818cf8',
              fontSize: 13
            }}>
              <strong style={{ color: '#3730a3' }}>⌨️ Keyboard Shortcuts:</strong>
              <span style={{ marginLeft: 12, color: '#4338ca' }}>
                <kbd style={{ padding: '2px 6px', background: '#fff', border: '1px solid #818cf8', borderRadius: 4, fontFamily: 'monospace', fontWeight: 600 }}>A</kbd> Approve
              </span>
              <span style={{ marginLeft: 12, color: '#4338ca' }}>
                <kbd style={{ padding: '2px 6px', background: '#fff', border: '1px solid #818cf8', borderRadius: 4, fontFamily: 'monospace', fontWeight: 600 }}>X</kbd> Reject
              </span>
              <span style={{ marginLeft: 12, color: '#4338ca' }}>
                <kbd style={{ padding: '2px 6px', background: '#fff', border: '1px solid #818cf8', borderRadius: 4, fontFamily: 'monospace', fontWeight: 600 }}>U</kbd> Skip
              </span>
            </div>

            {/* Bulk Actions for Tier 2 */}
            {uncertainMatches.filter(m => m.tier === 2).length > 0 && (
              <div style={{
                padding: 12,
                background: '#fffbeb',
                borderRadius: 8,
                marginBottom: 16,
                border: '1px solid #fbbf24',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8
              }}>
                <div style={{ fontSize: 14, color: '#92400e' }}>
                  <strong>{uncertainMatches.filter(m => m.tier === 2).length} high priority</strong> matches need review
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => {
                      uncertainMatches.filter(m => m.tier === 2 && m.confidence > 50).forEach(m => approveMatch(m.student_id))
                      console.log('✅ Bulk approved: >50% confidence')
                    }}
                    style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    ✅ Approve All &gt;50%
                  </button>
                  <button
                    onClick={() => {
                      uncertainMatches.filter(m => m.tier === 2).forEach(m => rejectMatch(m.student_id))
                      console.log('❌ Bulk rejected all')
                    }}
                    style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    ❌ Reject All
                  </button>
                </div>
              </div>
            )}

            {/* TIER 2: High Priority Reviews (Yellow - 40-55% confidence) */}
            {uncertainMatches.filter(m => m.tier === 2).map(match => (
              <div key={match.student_id} style={{ 
                padding: 20, 
                background: '#fef3c7', 
                borderRadius: 12, 
                marginBottom: 16, 
                border: '2px solid #f59e0b', 
                display: 'flex', 
                gap: 16 
              }}>
                {match.photo_path && (
                  <div style={{ flexShrink: 0 }}>
                    <img
                      src={`http://localhost:5000/images/${match.photo_path}`}
                      alt={match.student_name}
                      style={{ 
                        width: 80, 
                        height: 80, 
                        borderRadius: 8, 
                        objectFit: 'cover', 
                        border: '2px solid #f59e0b', 
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
                      }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  </div>
                )}
                
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 12 }}>
                    <strong style={{ fontSize: 16, color: '#92400e' }}>{match.student_name}</strong>
                    <span style={{ marginLeft: 8, color: '#78350f', fontSize: 14 }}>(Roll: {match.roll_no})</span>
                    <span style={{ 
                      marginLeft: 12, 
                      padding: '2px 8px', 
                      background: '#fde68a', 
                      borderRadius: 4, 
                      fontSize: 12, 
                      fontWeight: 600, 
                      color: '#92400e' 
                    }}>
                      Tier 2 - High Priority
                    </span>
                  </div>
                  
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      marginBottom: 4, 
                      fontSize: 13, 
                      color: '#78350f' 
                    }}>
                      <strong>Match Confidence</strong>
                      <span>{match.confidence.toFixed(1)}%</span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: 8, 
                      background: '#fef3c7', 
                      borderRadius: 4, 
                      overflow: 'hidden', 
                      border: '1px solid #f59e0b' 
                    }}>
                      <div style={{ 
                        width: `${match.confidence}%`, 
                        height: '100%', 
                        background: match.confidence > 50 ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' : 'linear-gradient(90deg, #fb923c, #f97316)', 
                        transition: 'width 0.3s ease' 
                      }} />
                    </div>
                    <div style={{ fontSize: 12, color: '#78350f', marginTop: 4 }}>
                      Distance: {match.distance.toFixed(4)} | Tier 2: 40-55% confidence
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button 
                      onClick={() => approveMatch(match.student_id)} 
                      style={{ 
                        flex: 1, 
                        padding: '10px 20px', 
                        background: '#10b981', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: 8, 
                        fontWeight: 600, 
                        cursor: 'pointer', 
                        fontSize: 14 
                      }}
                    >
                      ✅ Mark Present
                    </button>
                    <button 
                      onClick={() => rejectMatch(match.student_id)} 
                      style={{ 
                        flex: 1, 
                        padding: '10px 20px', 
                        background: '#ef4444', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: 8, 
                        fontWeight: 600, 
                        cursor: 'pointer', 
                        fontSize: 14 
                      }}
                    >
                      ❌ Keep Absent
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* TIER 3: Low Priority Reviews (Orange - 30-40% confidence, optional) */}
            {uncertainMatches.filter(m => m.tier === 3).length > 0 && (
              <>
                <div style={{
                  padding: 12,
                  background: '#fff7ed',
                  borderRadius: 8,
                  marginBottom: 16,
                  marginTop: 24,
                  border: '1px solid #fb923c',
                  fontSize: 14,
                  color: '#9a3412'
                }}>
                  <strong>🟠 Tier 3 - Optional Review</strong>
                  <span style={{ marginLeft: 12 }}>
                    ({uncertainMatches.filter(m => m.tier === 3).length} edge cases - low confidence)
                  </span>
                </div>

                {uncertainMatches.filter(m => m.tier === 3).map(match => (
                  <div key={match.student_id} style={{
                    padding: 20,
                    background: '#fff7ed',
                    borderRadius: 12,
                    marginBottom: 16,
                    border: '2px solid #fb923c',
                    display: 'flex',
                    gap: 16
                  }}>
                    {match.photo_path && (
                      <div style={{ flexShrink: 0 }}>
                        <img
                          src={`http://localhost:5000/images/${match.photo_path}`}
                          alt={match.student_name}
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: 8,
                            objectFit: 'cover',
                            border: '2px solid #fb923c',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      </div>
                    )}
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: 12 }}>
                        <strong style={{ fontSize: 16, color: '#9a3412' }}>{match.student_name}</strong>
                        <span style={{ marginLeft: 8, color: '#7c2d12', fontSize: 14 }}>
                          (Roll: {match.roll_no})
                        </span>
                        <span style={{
                          marginLeft: 12,
                          padding: '2px 8px',
                          background: '#fed7aa',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#9a3412'
                        }}>
                          Tier 3 - Edge Case
                        </span>
                      </div>
                      
                      <div style={{ marginBottom: 16 }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                          fontSize: 13,
                          color: '#7c2d12'
                        }}>
                          <strong>Match Confidence</strong>
                          <span>{match.confidence.toFixed(1)}%</span>
                        </div>
                        <div style={{
                          width: '100%',
                          height: 8,
                          background: '#fff7ed',
                          borderRadius: 4,
                          overflow: 'hidden',
                          border: '1px solid #fb923c'
                        }}>
                          <div style={{
                            width: `${match.confidence}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #fb923c, #f97316)',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                        <div style={{
                          fontSize: 12,
                          color: '#9a3412',
                          marginTop: 4
                        }}>
                          Distance: {match.distance.toFixed(4)} | Tier 3: 30-40% confidence
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button
                          onClick={() => approveMatch(match.student_id)}
                          style={{
                            flex: 1,
                            padding: '10px 20px',
                            background: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: 14
                          }}
                        >
                          ✅ Mark Present
                        </button>
                        <button
                          onClick={() => rejectMatch(match.student_id)}
                          style={{
                            flex: 1,
                            padding: '10px 20px',
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: 14
                          }}
                        >
                          ❌ Keep Absent
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Empty state - All reviews done */}
            {uncertainMatches.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                ✅ All uncertain matches reviewed!
              </div>
            )}

            {/* TIER 4: Unknown Faces (Display only - auto-rejected, <30% confidence) */}
            {unknownFaces.length > 0 && (
              <div style={{
                padding: 16,
                background: '#fee2e2',
                borderRadius: 8,
                marginTop: 24,
                border: '2px solid #ef4444'
              }}>
                <h4 style={{ margin: 0, marginBottom: 12, fontSize: 16, fontWeight: 600, color: '#991b1b' }}>
                  ❌ Tier 4 - Unknown Faces Detected
                </h4>
                <p style={{ fontSize: 14, color: '#7f1d1d', marginBottom: 12 }}>
                  {unknownFaces.length} face(s) detected that don't match any enrolled student (confidence &lt;30%)
                </p>
                {unknownFaces.map((face, idx) => (
                  <div key={idx} style={{
                    padding: 12,
                    background: '#fff',
                    borderRadius: 6,
                    marginBottom: 8,
                    fontSize: 13,
                    color: '#7f1d1d'
                  }}>
                    Unknown Face #{idx + 1} - Distance: {face.distance}, Confidence: {face.confidence.toFixed(1)}%
                  </div>
                ))}
                <p style={{ fontSize: 12, color: '#991b1b', marginTop: 12, marginBottom: 0 }}>
                  💡 These faces were automatically rejected (Tier 4: &lt;30% confidence)
                </p>
              </div>
            )}

            {/* Close Modal Button */}
            <button 
              onClick={closeReviewModal} 
              style={{ 
                width: '100%', 
                marginTop: 24, 
                padding: '12px 24px', 
                background: '#3b82f6', 
                color: '#fff', 
                border: 'none', 
                borderRadius: 8, 
                fontWeight: 600, 
                cursor: 'pointer', 
                fontSize: 15 
              }}
            >
              {uncertainMatches.length > 0 ? 'Skip Remaining & Continue' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Classroom & Date Selection */}
      <div style={{ marginBottom: 24, padding: 20, background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>Select Classroom:</label>
            <select 
              value={selectedClassroom} 
              onChange={(e) => setSelectedClassroom(e.target.value)} 
              style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, cursor: 'pointer' }}
            >
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>{c.name} - {c.subject}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>Date:</label>
            <input 
              type="date" 
              value={currentDate} 
              onChange={(e) => setCurrentDate(e.target.value)} 
              style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }} 
            />
          </div>
        </div>

        <div style={{ padding: 16, background: '#dbeafe', borderRadius: 8, border: '1px solid #60a5fa' }}>
          <strong style={{ fontSize: 15 }}>📚 {getClassroomName()}</strong>
          <span style={{ marginLeft: 16, color: '#1e40af' }}>| 👥 <strong>{attendanceData.length}</strong> Students</span>
          <span style={{ marginLeft: 16, color: '#1e40af' }}>| 📅 <strong>{currentDate}</strong></span>
        </div>
      </div>

      {/* Camera Section */}
      <div style={{ marginBottom: 24, padding: 20, background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>🎥 Face Recognition</h3>
        
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
              <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>
        )}

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
              onClick={() => { stopCamera(); setCameraActive(false) }} 
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
                onClick={() => { URL.revokeObjectURL(capturedImage.url); setCapturedImage(null) }} 
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
              🔍 Recognizing faces with MTCNN...
            </div>
            <div style={{ 
              marginTop: 12, 
              color: '#6b7280', 
              fontSize: 14, 
              textAlign: 'center', 
              maxWidth: 400 
            }}>
              Comparing against <strong>{attendanceData.length} students</strong> in <strong>{getClassroomName()}</strong>
            </div>
            <div style={{ marginTop: 8, color: '#6b7280', fontSize: 14 }}>
              4-tier system: Auto-approve / Review / Optional / Reject
            </div>
            <div style={{ 
              marginTop: 16, 
              padding: '8px 16px', 
              background: '#dbeafe', 
              borderRadius: 8, 
              fontSize: 13, 
              color: '#1e3a8a', 
              border: '1px solid #93c5fd' 
            }}>
              ⏱️ Processing: 10-15 seconds (MTCNN 96.4% accuracy)
            </div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
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
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 16, 
          marginBottom: 24 
        }}>
          <div style={{ 
            padding: 20, 
            background: '#d1fae5', 
            borderRadius: 12, 
            border: '2px solid #10b981' 
          }}>
            <div style={{ fontSize: 14, color: '#065f46', marginBottom: 8, fontWeight: 500 }}>✅ Present</div>
            <div style={{ fontSize: 36, fontWeight: 'bold', color: '#065f46' }}>{presentCount}</div>
          </div>
          <div style={{ 
            padding: 20, 
            background: '#fee2e2', 
            borderRadius: 12, 
            border: '2px solid #ef4444' 
          }}>
            <div style={{ fontSize: 14, color: '#991b1b', marginBottom: 8, fontWeight: 500 }}>❌ Absent</div>
            <div style={{ fontSize: 36, fontWeight: 'bold', color: '#991b1b' }}>{absentCount}</div>
          </div>
          <div style={{ 
            padding: 20, 
            background: '#dbeafe', 
            borderRadius: 12, 
            border: '2px solid #3b82f6' 
          }}>
            <div style={{ fontSize: 14, color: '#1e40af', marginBottom: 8, fontWeight: 500 }}>📊 Percentage</div>
            <div style={{ fontSize: 36, fontWeight: 'bold', color: '#1e40af' }}>
              {attendanceData.length > 0 ? Math.round((presentCount/attendanceData.length)*100) : 0}%
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
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
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Attendance Table */}
      {!loadingStudents && attendanceData.length > 0 && (
        <div style={{ 
          background: '#fff', 
          borderRadius: 12, 
          overflow: 'hidden', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#1f2937', color: '#fff' }}>
              <tr>
                <th style={{ padding: 16, textAlign: 'left', fontWeight: 600 }}>S.No</th>
                <th style={{ padding: 16, textAlign: 'left', fontWeight: 600 }}>Roll No</th>
                <th style={{ padding: 16, textAlign: 'left', fontWeight: 600 }}>Name</th>
                <th style={{ padding: 16, textAlign: 'center', fontWeight: 600 }}>Status</th>
                <th style={{ padding: 16, textAlign: 'center', fontWeight: 600 }}>Confidence</th>
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
                  <td style={{ padding: 16, textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
                    {student.confidence ? `${student.confidence.toFixed(1)}%` : '-'}
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

      {/* Empty State */}
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
