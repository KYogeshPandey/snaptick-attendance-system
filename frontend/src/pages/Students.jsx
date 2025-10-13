// frontend/src/pages/Students.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'

export default function Students() {
  const [classrooms, setClassrooms] = useState([])
  const [selectedClassroom, setSelectedClassroom] = useState('')
  const [students, setStudents] = useState([])
  const [excelFile, setExcelFile] = useState(null)
  const [zipFile, setZipFile] = useState(null)
  const [uploadingExcel, setUploadingExcel] = useState(false)
  const [uploadingZip, setUploadingZip] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadClassrooms = useCallback(async () => {
    try {
      const { data } = await api.get('/classrooms')
      setClassrooms(data)
      if (data.length > 0) {
        setSelectedClassroom(data[0].id)
        loadStudents(data[0].id)
      }
    } catch (e) {
      console.error('Failed to load classrooms:', e)
    }
  }, [])

  const loadStudents = async (classroomId) => {
    try {
      setLoading(true)
      const { data } = await api.get(`/students/classroom/${classroomId}`)
      setStudents(data)
    } catch (e) {
      console.error('Failed to load students:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClassrooms()
  }, [loadClassrooms])

  const handleClassroomChange = (e) => {
    const classroomId = e.target.value
    setSelectedClassroom(classroomId)
    loadStudents(classroomId)
  }

  const uploadExcel = async () => {
    if (!excelFile) {
      alert('Please select an Excel file')
      return
    }
    if (!selectedClassroom) {
      alert('Please select a classroom')
      return
    }
    try {
      setUploadingExcel(true)
      const formData = new FormData()
      formData.append('file', excelFile)
      formData.append('classroom_id', selectedClassroom)

      const { data } = await api.post('/students/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      alert(data.message)
      if (data.students_failed && data.students_failed.length > 0) {
        console.log('Failed students:', data.students_failed)
      }
      loadStudents(selectedClassroom)
      setExcelFile(null)
    } catch (e) {
      console.error('Excel upload failed:', e)
      alert('Upload failed: ' + (e.response?.data?.message || e.message))
    } finally {
      setUploadingExcel(false)
    }
  }

  const uploadZip = async () => {
    if (!zipFile) {
      alert('Please select a ZIP file')
      return
    }
    if (!selectedClassroom) {
      alert('Please select a classroom')
      return
    }
    try {
      setUploadingZip(true)
      const formData = new FormData()
      formData.append('file', zipFile)
      formData.append('classroom_id', selectedClassroom)

      const { data } = await api.post('/students/upload-photos-zip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      alert(data.message)
      if (data.unmatched && data.unmatched.length > 0) {
        console.log('Unmatched photos:', data.unmatched)
        alert(`${data.unmatched.length} photos could not be matched. Check console for details.`)
      }
      loadStudents(selectedClassroom)
      setZipFile(null)
    } catch (e) {
      console.error('ZIP upload failed:', e)
      alert('Upload failed: ' + (e.response?.data?.message || e.message))
    } finally {
      setUploadingZip(false)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Manage Students</h2>

      {/* Classroom Selection */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
          Select Classroom:
        </label>
        <select
          value={selectedClassroom}
          onChange={handleClassroomChange}
          style={{
            padding: '10px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 14,
            minWidth: 300
          }}
        >
          {classrooms.map(c => (
            <option key={c.id} value={c.id}>
              {c.name} - {c.subject || 'No subject'}
            </option>
          ))}
        </select>
      </div>

      {/* Excel Upload Section */}
      <div style={{
        marginBottom: 24,
        padding: 20,
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        background: '#f9fafb'
      }}>
        <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: 600 }}>
          📊 Step 1: Upload Students (Excel)
        </h3>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setExcelFile(e.target.files[0])}
          style={{ marginBottom: 12 }}
        />
        <button
          onClick={uploadExcel}
          disabled={uploadingExcel || !excelFile}
          style={{
            padding: '10px 20px',
            background: uploadingExcel || !excelFile ? '#9ca3af' : '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: uploadingExcel || !excelFile ? 'not-allowed' : 'pointer',
            fontWeight: 500
          }}
        >
          {uploadingExcel ? 'Uploading...' : 'Upload Excel'}
        </button>
        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8, marginBottom: 0 }}>
          📝 Excel format: <strong>Name | Email | Roll No</strong> (Photo Path NOT needed)
        </p>
      </div>

      {/* ZIP Upload Section - UPDATED WITH WARNING */}
      <div style={{
        marginBottom: 24,
        padding: 20,
        border: '2px solid #f59e0b',
        borderRadius: 8,
        background: '#fef3c7'
      }}>
        <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: 600 }}>
          📁 Step 2: Upload Student Photos (ZIP)
        </h3>
        <input
          type="file"
          accept=".zip"
          onChange={(e) => setZipFile(e.target.files[0])}
          style={{ marginBottom: 12 }}
        />
        <button
          onClick={uploadZip}
          disabled={uploadingZip || !zipFile}
          style={{
            padding: '10px 20px',
            background: uploadingZip || !zipFile ? '#9ca3af' : '#8b5cf6',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: uploadingZip || !zipFile ? 'not-allowed' : 'pointer',
            fontWeight: 500
          }}
        >
          {uploadingZip ? 'Uploading...' : 'Upload ZIP'}
        </button>
        
        {/* ✅ IMPROVED WARNING BOX */}
        <div style={{
          marginTop: 12,
          padding: 12,
          background: '#fef9c3',
          border: '1px solid #fbbf24',
          borderRadius: 6
        }}>
          <p style={{ 
            fontSize: 13, 
            color: '#92400e', 
            margin: 0, 
            lineHeight: 1.8,
            fontFamily: 'monospace'
          }}>
            <strong style={{ color: '#78350f' }}>⚠️ IMPORTANT: Name photos by Roll Number</strong><br/>
            <span style={{ display: 'block', marginTop: 6 }}>
              ✅ <strong>Correct:</strong> <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 3 }}>101.jpg</code>, <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 3 }}>102.jpg</code>, <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 3 }}>103.jpg</code>
            </span>
            <span style={{ display: 'block', marginTop: 4 }}>
              ❌ <strong>Avoid:</strong> <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 3 }}>rahul_sharma.jpg</code> (fails if duplicate names exist)
            </span>
            <span style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
              📷 Supported formats: .jpg, .jpeg, .png
            </span>
          </p>
        </div>
      </div>

      {/* Students Table */}
      <h3 style={{ fontSize: 18, fontWeight: 600 }}>Students List ({students.length})</h3>
      
      {loading ? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: 300 
        }}>
          <div style={{ 
            width: 50, 
            height: 50, 
            border: '5px solid #f3f4f6',
            borderTop: '5px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : students.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', background: '#f9fafb', borderRadius: 8 }}>
          <div style={{ fontSize: 48 }}>👨‍🎓</div>
          <p style={{ color: '#6b7280', marginTop: 16 }}>
            No students in this classroom. Upload an Excel file to add students.
          </p>
        </div>
      ) : (
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #e5e7eb'
        }}>
          <thead style={{ background: '#f3f4f6' }}>
            <tr>
              <th style={{ padding: 12, textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: 600 }}>
                Roll No
              </th>
              <th style={{ padding: 12, textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: 600 }}>
                Name
              </th>
              <th style={{ padding: 12, textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: 600 }}>
                Email
              </th>
              <th style={{ padding: 12, textAlign: 'center', border: '1px solid #e5e7eb', fontWeight: 600 }}>
                Photo
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id}>
                <td style={{ padding: 12, border: '1px solid #e5e7eb' }}>
                  {s.roll_no}
                </td>
                <td style={{ padding: 12, border: '1px solid #e5e7eb' }}>
                  {s.name}
                </td>
                <td style={{ padding: 12, border: '1px solid #e5e7eb' }}>
                  {s.email}
                </td>
                <td style={{ 
                  padding: 12, 
                  border: '1px solid #e5e7eb', 
                  textAlign: 'center',
                  color: s.has_photo ? '#10b981' : '#ef4444',
                  fontWeight: 500
                }}>
                  {s.has_photo ? '✅ Yes' : '❌ No'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
