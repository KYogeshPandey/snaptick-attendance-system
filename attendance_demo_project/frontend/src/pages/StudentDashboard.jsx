// frontend/src/pages/StudentDashboard.jsx
import { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function StudentDashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const { data } = await api.get('/student/dashboard')
      console.log('Student dashboard data:', data)
      setDashboard(data)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
      setError(err.response?.data?.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 400,
        padding: 24 
      }}>
        <div style={{ 
          width: 60, 
          height: 60, 
          border: '6px solid #f3f4f6',
          borderTop: '6px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <div style={{ marginTop: 16, color: '#6b7280', fontSize: 14 }}>
          Loading your dashboard...
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>❌</div>
        <div style={{ marginTop: 16, color: '#ef4444', fontWeight: 500 }}>{error}</div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, background: '#f3f4f6', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
          Welcome, {dashboard?.student?.name || 'Student'}! 🎓
        </h2>
        <p style={{ color: '#6b7280' }}>Here's your attendance overview</p>
      </div>

      {/* Overall Attendance Circle */}
      <div style={{ 
        background: '#fff', 
        padding: 32, 
        borderRadius: 12, 
        marginBottom: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginBottom: 24, fontSize: 18, fontWeight: 600 }}>Overall Attendance</h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 48, flexWrap: 'wrap' }}>
          {/* Circular Progress */}
          <div style={{ 
            position: 'relative',
            width: 200,
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
              {/* Background circle */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="20"
              />
              {/* Progress circle */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke={
                  dashboard?.overall_attendance?.percentage >= 75 ? '#10b981' :
                  dashboard?.overall_attendance?.percentage >= 50 ? '#f59e0b' : '#ef4444'
                }
                strokeWidth="20"
                strokeDasharray={`${(dashboard?.overall_attendance?.percentage || 0) * 5.02} 502`}
                strokeLinecap="round"
              />
            </svg>
            <div style={{ 
              position: 'absolute',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 48, fontWeight: 700, color: '#111827' }}>
                {dashboard?.overall_attendance?.percentage || 0}%
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ flex: 1, minWidth: 250 }}>
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 16, background: '#f3f4f6', borderRadius: 8 }}>
                <span style={{ fontWeight: 500 }}>Total Classes:</span>
                <span style={{ fontWeight: 600, color: '#3b82f6' }}>{dashboard?.overall_attendance?.total_classes || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 16, background: '#f3f4f6', borderRadius: 8 }}>
                <span style={{ fontWeight: 500 }}>Present:</span>
                <span style={{ fontWeight: 600, color: '#10b981' }}>{dashboard?.overall_attendance?.present || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 16, background: '#f3f4f6', borderRadius: 8 }}>
                <span style={{ fontWeight: 500 }}>Absent:</span>
                <span style={{ fontWeight: 600, color: '#ef4444' }}>{dashboard?.overall_attendance?.absent || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subject-wise Breakdown */}
      <div style={{ 
        background: '#fff', 
        padding: 32, 
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: 24
      }}>
        <h3 style={{ marginBottom: 24, fontSize: 18, fontWeight: 600 }}>Subject-wise Attendance</h3>
        
        <div style={{ display: 'grid', gap: 16 }}>
          {dashboard?.subjects?.map((subject, index) => (
            <div 
              key={index}
              style={{ 
                border: '1px solid #e5e7eb', 
                borderRadius: 8, 
                padding: 20,
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                    {subject.subject_name}
                  </h4>
                  <p style={{ fontSize: 14, color: '#6b7280' }}>
                    Faculty: {subject.faculty_name}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    fontSize: 28, 
                    fontWeight: 700,
                    color: subject.percentage >= 75 ? '#10b981' : subject.percentage >= 50 ? '#f59e0b' : '#ef4444'
                  }}>
                    {subject.percentage}%
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 24, marginTop: 12, fontSize: 14, flexWrap: 'wrap' }}>
                <span>Total: <strong>{subject.total_classes}</strong></span>
                <span style={{ color: '#10b981' }}>Present: <strong>{subject.present}</strong></span>
                <span style={{ color: '#ef4444' }}>Absent: <strong>{subject.absent}</strong></span>
              </div>

              {/* Progress bar */}
              <div style={{ marginTop: 12, height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${subject.percentage}%`,
                  background: subject.percentage >= 75 ? '#10b981' : subject.percentage >= 50 ? '#f59e0b' : '#ef4444',
                  transition: 'width 0.3s'
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attendance History Table */}
      <div style={{
        background: "#fff",
        padding: 32,
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <h3 style={{ marginBottom: 24, fontSize: 18, fontWeight: 600 }}>Attendance History</h3>
        {dashboard?.history && dashboard.history.length > 0 ? (
          <div style={{overflowX: 'auto'}}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{padding: '12px', textAlign: 'left', fontWeight: 600}}>Date</th>
                  <th style={{padding: '12px', textAlign: 'left', fontWeight: 600}}>Subject</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: 600}}>Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.history.map((row, i) => (
                  <tr key={i}
                    style={{
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                    <td style={{padding: '12px'}}>{row.date}</td>
                    <td style={{padding: '12px'}}>{row.subject}</td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'center'
                    }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: 12,
                        fontSize: 14,
                        fontWeight: 600,
                        background: row.status === "Present" ? '#d1fae5' : '#fee2e2',
                        color: row.status === "Present" ? '#065f46' : '#991b1b'
                      }}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: "#9ca3af", textAlign: "center", padding: 24 }}>
            No attendance records found.
          </div>
        )}
      </div>
    </div>
  )
}
