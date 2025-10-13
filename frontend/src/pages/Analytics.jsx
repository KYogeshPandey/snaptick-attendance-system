import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function Analytics() {
  const [overview, setOverview] = useState(null)
  const [trend, setTrend] = useState([])
  const [students, setStudents] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [classroomComparison, setClassroomComparison] = useState([])
  const [selectedClassroom, setSelectedClassroom] = useState('')
  const [dateRange, setDateRange] = useState(7)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const { data: overviewData } = await api.get('/analytics/overview')
      setOverview(overviewData)
      
      const { data: classroomsData } = await api.get('/classrooms')
      setClassrooms(classroomsData)
      
      if (classroomsData.length > 0) {
        setSelectedClassroom(classroomsData[0].id)
        loadClassroomData(classroomsData[0].id, dateRange)
      }
      
      const { data: comparisonData } = await api.get('/analytics/classrooms')
      setClassroomComparison(comparisonData)
      
    } catch (e) {
      console.error('Failed to load analytics:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadClassroomData = async (classroomId, days) => {
    try {
      const { data: trendData } = await api.get(`/analytics/trend?classroom_id=${classroomId}&days=${days}`)
      setTrend(trendData)
      
      const { data: studentsData } = await api.get(`/analytics/students?classroom_id=${classroomId}`)
      setStudents(studentsData)
    } catch (e) {
      console.error('Failed to load classroom data:', e)
    }
  }

  const handleClassroomChange = (e) => {
    const classroomId = e.target.value
    setSelectedClassroom(classroomId)
    loadClassroomData(classroomId, dateRange)
  }

  const handleDateRangeChange = (e) => {
    const days = parseInt(e.target.value)
    setDateRange(days)
    if (selectedClassroom) {
      loadClassroomData(selectedClassroom, days)
    }
  }

  const exportAnalyticsToExcel = () => {
    let csv = 'Analytics Report\n\n'
    
    csv += 'Overview\n'
    csv += `Total Students,${overview.total_students}\n`
    csv += `Total Classrooms,${overview.total_classrooms}\n`
    csv += `Today Present,${overview.today.present}\n`
    csv += `Today Absent,${overview.today.absent}\n`
    csv += `Overall Rate,${overview.overall_rate}%\n\n`
    
    csv += 'Student-wise Attendance\n'
    csv += 'Roll No,Name,Total Days,Present,Absent,Attendance %\n'
    students.forEach(s => {
      csv += `${s.roll_no},${s.name},${s.total_days},${s.present_days},${s.absent_days},${s.attendance_rate}%\n`
    })
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Analytics_Report_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportAnalyticsToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Analytics Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          .overview { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
          .card { padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #4CAF50; color: white; }
        </style>
      </head>
      <body>
        <h1>📊 Analytics Report</h1>
        <p><strong>Generated:</strong> ${new Date().toLocaleString('en-IN')}</p>
        
        <h2>Overview</h2>
        <div class="overview">
          <div class="card">
            <strong>Total Students:</strong> ${overview.total_students}<br>
            <strong>Total Classrooms:</strong> ${overview.total_classrooms}
          </div>
          <div class="card">
            <strong>Today's Present:</strong> ${overview.today.present}<br>
            <strong>Today's Absent:</strong> ${overview.today.absent}
          </div>
          <div class="card">
            <strong>Overall Rate:</strong> ${overview.overall_rate}%
          </div>
          <div class="card">
            <strong>30-Day Records:</strong> ${overview.last_30_days.total_records}
          </div>
        </div>
        
        <h2>Student-wise Attendance</h2>
        <table>
          <thead>
            <tr>
              <th>Roll No</th>
              <th>Name</th>
              <th>Total Days</th>
              <th>Present</th>
              <th>Absent</th>
              <th>Attendance %</th>
            </tr>
          </thead>
          <tbody>
            ${students.map(s => `
              <tr>
                <td>${s.roll_no}</td>
                <td>${s.name}</td>
                <td>${s.total_days}</td>
                <td>${s.present_days}</td>
                <td>${s.absent_days}</td>
                <td>${s.attendance_rate}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `
    
    const printWindow = window.open('', '', 'width=800,height=600')
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.print()
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
          Loading analytics...
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

  // Empty state check
  if (!overview || classrooms.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 64 }}>📊</div>
        <h2>No Data Available</h2>
        <p style={{ color: '#6b7280' }}>Create classrooms and mark attendance to see analytics.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>📊 Analytics Dashboard</h2>
        <div>
          <button
            onClick={exportAnalyticsToExcel}
            style={{
              padding: '10px 20px',
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              marginRight: 10
            }}
          >
            📊 Export Excel
          </button>
          <button
            onClick={exportAnalyticsToPDF}
            style={{
              padding: '10px 20px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            📄 Export PDF
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div style={{ padding: 20, background: '#dbeafe', borderRadius: 8, border: '1px solid #60a5fa' }}>
          <div style={{ fontSize: 14, color: '#1e40af', marginBottom: 8 }}>Total Students</div>
          <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1e40af' }}>{overview.total_students}</div>
          <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 4 }}>
            Across {overview.total_classrooms} classrooms
          </div>
        </div>

        <div style={{ padding: 20, background: '#d1fae5', borderRadius: 8, border: '1px solid #10b981' }}>
          <div style={{ fontSize: 14, color: '#065f46', marginBottom: 8 }}>Today&apos;s Present</div>
          <div style={{ fontSize: 32, fontWeight: 'bold', color: '#065f46' }}>{overview.today.present}</div>
          <div style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>
            Out of {overview.today.total} students
          </div>
        </div>

        <div style={{ padding: 20, background: '#fee2e2', borderRadius: 8, border: '1px solid #ef4444' }}>
          <div style={{ fontSize: 14, color: '#991b1b', marginBottom: 8 }}>Today&apos;s Absent</div>
          <div style={{ fontSize: 32, fontWeight: 'bold', color: '#991b1b' }}>{overview.today.absent}</div>
          <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
            {overview.today.total > 0 ? Math.round(overview.today.absent / overview.today.total * 100) : 0}% of students
          </div>
        </div>

        <div style={{ padding: 20, background: '#fef3c7', borderRadius: 8, border: '1px solid #f59e0b' }}>
          <div style={{ fontSize: 14, color: '#92400e', marginBottom: 8 }}>Overall Rate (30 days)</div>
          <div style={{ fontSize: 32, fontWeight: 'bold', color: '#92400e' }}>{overview.overall_rate}%</div>
          <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>
            {overview.last_30_days.total_records} total records
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
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
              minWidth: 250
            }}
          >
            {classrooms.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.subject || 'No subject'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            Date Range:
          </label>
          <select
            value={dateRange}
            onChange={handleDateRangeChange}
            style={{
              padding: '10px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 14
            }}
          >
            <option value={7}>Last 7 Days</option>
            <option value={15}>Last 15 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={60}>Last 60 Days</option>
          </select>
        </div>
      </div>

      {/* Trend Chart */}
      {trend.length > 0 ? (
        <div style={{ marginBottom: 32, padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <h3 style={{ marginTop: 0 }}>📈 Attendance Trend (Last {dateRange} Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} name="Present" />
              <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} name="Absent" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ padding: 40, textAlign: 'center', background: '#f9fafb', borderRadius: 8, marginBottom: 32 }}>
          <div style={{ fontSize: 48 }}>📈</div>
          <div style={{ marginTop: 8, color: '#6b7280' }}>No attendance data available for selected range</div>
        </div>
      )}

      {/* Student Table */}
      {students.length > 0 ? (
        <div style={{ marginBottom: 32 }}>
          <h3>👨‍🎓 Student-wise Attendance</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
              <thead style={{ background: '#f3f4f6' }}>
                <tr>
                  <th style={{ padding: 12, textAlign: 'left', border: '1px solid #e5e7eb' }}>Roll No</th>
                  <th style={{ padding: 12, textAlign: 'left', border: '1px solid #e5e7eb' }}>Name</th>
                  <th style={{ padding: 12, textAlign: 'center', border: '1px solid #e5e7eb' }}>Total Days</th>
                  <th style={{ padding: 12, textAlign: 'center', border: '1px solid #e5e7eb' }}>Present</th>
                  <th style={{ padding: 12, textAlign: 'center', border: '1px solid #e5e7eb' }}>Absent</th>
                  <th style={{ padding: 12, textAlign: 'center', border: '1px solid #e5e7eb' }}>Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student.student_id}>
                    <td style={{ padding: 12, border: '1px solid #e5e7eb' }}>{student.roll_no}</td>
                    <td style={{ padding: 12, border: '1px solid #e5e7eb' }}>{student.name}</td>
                    <td style={{ padding: 12, textAlign: 'center', border: '1px solid #e5e7eb' }}>{student.total_days}</td>
                    <td style={{ padding: 12, textAlign: 'center', border: '1px solid #e5e7eb', color: '#10b981' }}>
                      {student.present_days}
                    </td>
                    <td style={{ padding: 12, textAlign: 'center', border: '1px solid #e5e7eb', color: '#ef4444' }}>
                      {student.absent_days}
                    </td>
                    <td style={{ 
                      padding: 12, 
                      textAlign: 'center', 
                      border: '1px solid #e5e7eb',
                      fontWeight: 'bold',
                      color: student.attendance_rate >= 75 ? '#10b981' : student.attendance_rate >= 50 ? '#f59e0b' : '#ef4444'
                    }}>
                      {student.attendance_rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ padding: 40, textAlign: 'center', background: '#f9fafb', borderRadius: 8, marginBottom: 32 }}>
          <div style={{ fontSize: 48 }}>👨‍🎓</div>
          <div style={{ marginTop: 8, color: '#6b7280' }}>No students in this classroom</div>
        </div>
      )}

      {/* Classroom Comparison */}
      {classroomComparison.length > 0 && (
        <div style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <h3 style={{ marginTop: 0 }}>🏫 Classroom Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={classroomComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="attendance_rate" fill="#3b82f6" name="Attendance %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
