import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

export default function Analytics() {
  const [overview, setOverview] = useState(null)
  const [students, setStudents] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [selectedClassroom, setSelectedClassroom] = useState('')
  const [loading, setLoading] = useState(true)
  const [heatmapData, setHeatmapData] = useState(null)
  const [heatmapDays, setHeatmapDays] = useState(30)
  const [selectedDay, setSelectedDay] = useState(null)
  const [drillDownDate, setDrillDownDate] = useState(null)
  const [drillDownData, setDrillDownData] = useState(null)
  const [loadingDrillDown, setLoadingDrillDown] = useState(false)

  useEffect(() => {
    loadData()
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
        loadClassroomData(classroomsData[0].id)
        loadHeatmap(classroomsData[0].id, heatmapDays)
      }
    } catch (e) {
      console.error('Failed to load analytics:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadClassroomData = async (classroomId) => {
    try {
      const { data: studentsData } = await api.get(`/analytics/students?classroom_id=${classroomId}`)
      setStudents(studentsData)
    } catch (e) {
      console.error('Failed to load classroom data:', e)
    }
  }

  const loadHeatmap = async (classroomId, days) => {
    try {
      const { data } = await api.get(`/analytics/heatmap?classroom_id=${classroomId}&days=${days}`)
      setHeatmapData(data)
    } catch (e) {
      console.error('Failed to load heatmap:', e)
    }
  }

  const loadDrillDownData = async (date, classroomId) => {
    try {
      setLoadingDrillDown(true)
      const { data } = await api.get(`/attendance/${classroomId}?date=${date}`)
      setDrillDownData(data)
      setDrillDownDate(date)
    } catch (e) {
      console.error('Failed to load drill-down data:', e)
      alert('No attendance data for this date')
    } finally {
      setLoadingDrillDown(false)
    }
  }

  const handleClassroomChange = (e) => {
    const classroomId = e.target.value
    setSelectedClassroom(classroomId)
    loadClassroomData(classroomId)
    loadHeatmap(classroomId, heatmapDays)
    setSelectedDay(null)
  }

  const handleHeatmapDaysChange = (e) => {
    const days = parseInt(e.target.value)
    setHeatmapDays(days)
    if (selectedClassroom) loadHeatmap(selectedClassroom, days)
  }

  const getIntensityColor = (intensity) => {
    const colors = { 0: '#e5e7eb', 1: '#fee2e2', 2: '#fef3c7', 3: '#bfdbfe', 4: '#d1fae5' }
    return colors[intensity] || colors[0]
  }

  const getWeekData = (heatmap) => {
    if (!heatmap || heatmap.length === 0) return []
    const weeks = []
    let currentWeek = []
    heatmap.forEach((day, index) => {
      currentWeek.push(day)
      if ((index + 1) % 7 === 0 || index === heatmap.length - 1) {
        weeks.push([...currentWeek])
        currentWeek = []
      }
    })
    return weeks
  }

  const exportCSV = () => {
    let csv = `Analytics Report\n\nTotal Students,${overview.total_students}\nToday Present,${overview.today.present}\n\nStudent-wise Attendance\nRoll No,Name,Present,Absent,Attendance %\n`
    students.forEach(s => csv += `${s.roll_no},${s.name},${s.present_days},${s.absent_days},${s.attendance_rate}%\n`)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Analytics_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Analytics Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1f2937; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
          .overview { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 30px 0; }
          .card { padding: 20px; border: 2px solid #e5e7eb; border-radius: 8px; background: #f9fafb; }
          .card strong { display: block; color: #6b7280; font-size: 12px; margin-bottom: 5px; }
          .card .value { font-size: 32px; font-weight: bold; color: #1f2937; }
          table { width: 100%; border-collapse: collapse; margin-top: 30px; }
          th, td { border: 1px solid #d1d5db; padding: 12px; text-align: left; }
          th { background-color: #3b82f6; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .footer { margin-top: 30px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>📊 Analytics Report</h1>
        <p><strong>Generated:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
        <div class="overview">
          <div class="card"><strong>Total Students</strong><div class="value">${overview.total_students}</div></div>
          <div class="card"><strong>Total Classrooms</strong><div class="value">${overview.total_classrooms}</div></div>
          <div class="card"><strong>Today's Present</strong><div class="value">${overview.today.present}</div></div>
          <div class="card"><strong>Today's Absent</strong><div class="value">${overview.today.absent}</div></div>
        </div>
        <h2>Student-wise Attendance</h2>
        <table>
          <thead><tr><th>Roll No</th><th>Name</th><th>Total Days</th><th>Present</th><th>Absent</th><th>Attendance %</th></tr></thead>
          <tbody>${students.map(s => `<tr><td>${s.roll_no}</td><td>${s.name}</td><td>${s.total_days}</td><td style="color: #10b981; font-weight: bold;">${s.present_days}</td><td style="color: #ef4444; font-weight: bold;">${s.absent_days}</td><td style="font-weight: bold; color: ${s.attendance_rate >= 75 ? '#10b981' : s.attendance_rate >= 50 ? '#f59e0b' : '#ef4444'}">${s.attendance_rate}%</td></tr>`).join('')}</tbody>
        </table>
        <div class="footer">Generated by Attendify Analytics Dashboard</div>
      </body>
      </html>
    `
    const printWindow = window.open('', '', 'width=800,height=600')
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.print()
  }

  const todayPieData = overview ? [
    { name: 'Present', value: overview.today.present, color: '#10b981' },
    { name: 'Absent', value: overview.today.absent, color: '#ef4444' }
  ] : []

  const attendanceRanges = students.length > 0 ? [
    { name: 'Excellent (≥75%)', value: students.filter(s => s.attendance_rate >= 75).length, color: '#10b981' },
    { name: 'Good (50-74%)', value: students.filter(s => s.attendance_rate >= 50 && s.attendance_rate < 75).length, color: '#f59e0b' },
    { name: 'Poor (<50%)', value: students.filter(s => s.attendance_rate < 50).length, color: '#ef4444' }
  ].filter(range => range.value > 0) : []

  if (loading) return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
      <div className="spinner-border text-primary" role="status" style={{ width: '4rem', height: '4rem' }}></div>
      <p className="mt-3 text-muted fw-semibold">Loading analytics...</p>
    </div>
  )

  if (!overview || classrooms.length === 0) return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light text-center p-5">
      <div style={{ fontSize: 80 }}>📊</div>
      <h2 className="mt-3">No Data Available</h2>
      <p className="text-muted">Create classrooms and mark attendance to see analytics.</p>
    </div>
  )

  return (
    <div className="min-vh-100 bg-light py-4">
      <div className="container-fluid" style={{ maxWidth: '1400px' }}>
        
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <h1 className="fw-bold mb-2">📊 Analytics Dashboard</h1>
            <p className="text-muted mb-0">Comprehensive attendance insights</p>
          </div>
          <div className="d-flex gap-2">
            <button onClick={exportCSV} className="btn btn-success shadow-sm btn-hover">
              📊 Export CSV
            </button>
            <button onClick={exportPDF} className="btn btn-danger shadow-sm btn-hover">
              📄 Export PDF
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="row g-4 mb-4">
          {[
            { title: 'Total Students', value: overview.total_students, subtitle: `${overview.total_classrooms} classrooms`, icon: '👨‍🎓', bg: 'primary' },
            { title: "Today's Present", value: overview.today.present, subtitle: `Out of ${overview.today.total}`, icon: '✅', bg: 'success' },
            { title: "Today's Absent", value: overview.today.absent, subtitle: `${overview.today.total > 0 ? Math.round(overview.today.absent / overview.today.total * 100) : 0}%`, icon: '❌', bg: 'danger' },
            { title: 'Overall Rate (30d)', value: `${overview.overall_rate}%`, subtitle: `${overview.last_30_days.total_records} records`, icon: '📈', bg: 'warning' }
          ].map((card, i) => (
            <div key={i} className="col-md-6 col-lg-3">
              <div className={`card border-0 shadow-sm h-100 bg-${card.bg} bg-opacity-10 border-start border-${card.bg} border-4`}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p className={`text-${card.bg} text-uppercase fw-bold small mb-2`}>{card.title}</p>
                      <h2 className={`text-${card.bg} fw-bold mb-1`}>{card.value}</h2>
                      <small className={`text-${card.bg} opacity-75`}>{card.subtitle}</small>
                    </div>
                    <div className={`bg-${card.bg} rounded-circle d-flex align-items-center justify-content-center`} 
                         style={{ width: 50, height: 50, fontSize: 24 }}>
                      {card.icon}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pie Charts */}
        <div className="row g-4 mb-4">
          {todayPieData.length > 0 && (
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <h5 className="card-title fw-bold mb-3">Today's Distribution</h5>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={todayPieData} cx="50%" cy="50%" labelLine={false} 
                           label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} 
                           outerRadius={100} dataKey="value">
                        {todayPieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
          {attendanceRanges.length > 0 && (
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <h5 className="card-title fw-bold mb-3">Performance Ranges</h5>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={attendanceRanges} cx="50%" cy="50%" labelLine={false} 
                           label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} 
                           outerRadius={100} dataKey="value">
                        {attendanceRanges.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title fw-bold mb-3">🔍 Filters</h5>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Select Classroom</label>
                <select value={selectedClassroom} onChange={handleClassroomChange} className="form-select form-select-lg">
                  {classrooms.map(c => <option key={c.id} value={c.id}>{c.name} - {c.subject || 'No subject'}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Heatmap Period</label>
                <select value={heatmapDays} onChange={handleHeatmapDaysChange} className="form-select form-select-lg">
                  <option value={30}>Last 30 Days</option>
                  <option value={60}>Last 60 Days</option>
                  <option value={90}>Last 90 Days</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap */}
        {heatmapData && (
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h5 className="card-title fw-bold mb-1">📅 Attendance Heatmap Calendar</h5>
              <p className="text-muted small mb-4">{heatmapData.classroom_name} • {heatmapData.total_students} Students • Last {heatmapDays} Days</p>
              
              <div className="overflow-auto bg-light rounded p-4 mb-3 border">
                <div style={{ minWidth: 600 }}>
                  <div className="d-flex mb-3" style={{ marginLeft: 60 }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                      <div key={i} className="text-muted fw-bold small text-center" style={{ width: 32, marginRight: 6 }}>{day.slice(0, 3)}</div>
                    ))}
                  </div>
                  {getWeekData(heatmapData.heatmap).map((week, weekIdx) => (
                    <div key={weekIdx} className="d-flex align-items-center mb-2">
                      <small className="text-muted fw-bold text-end" style={{ width: 50, marginRight: 10 }}>Week {weekIdx + 1}</small>
                      {week.map((day, dayIdx) => (
                        <div 
                          key={dayIdx} 
                          onClick={() => {
                            if (day.total_marked > 0) {
                              setSelectedDay(day)
                              loadDrillDownData(day.date, selectedClassroom)
                            }
                          }}
                          className={`heatmap-cell ${day.total_marked > 0 ? 'heatmap-clickable' : 'heatmap-disabled'} ${selectedDay?.date === day.date ? 'heatmap-selected' : ''}`}
                          style={{
                            width: 32,
                            height: 32,
                            marginRight: 6,
                            background: getIntensityColor(day.intensity),
                            borderRadius: 6,
                            border: selectedDay?.date === day.date ? '3px solid #3b82f6' : '2px solid #d1d5db',
                            cursor: day.total_marked > 0 ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative'
                          }}
                          title={day.total_marked > 0 ? `${day.date}: ${day.percentage}% attendance` : `${day.date}: No data`}
                        >
                          {day.total_marked > 0 && selectedDay?.date === day.date && (
                            <span style={{ fontSize: 16 }}>✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {selectedDay && (
                <div className="alert alert-primary border-2 border-primary mb-4" role="alert">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <h6 className="alert-heading fw-bold mb-2">
                        📅 {selectedDay.date} ({selectedDay.day_of_week})
                      </h6>
                      <div className="d-flex gap-4 align-items-center">
                        <span>
                          Present: <strong className="text-success">{selectedDay.present}</strong>
                        </span>
                        <span>
                          Absent: <strong className="text-danger">{selectedDay.total_students - selectedDay.present}</strong>
                        </span>
                        <span className="badge bg-primary fs-6 px-3 py-2">{selectedDay.percentage}% Attendance</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedDay(null)} 
                      className="btn btn-sm btn-outline-primary"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              )}

              <div className="d-flex align-items-center justify-content-center gap-3 mb-4 py-3 bg-white rounded border">
                <small className="text-muted fw-bold">Less Attendance</small>
                {[0, 1, 2, 3, 4].map(level => (
                  <div key={level} className="rounded-2 border-2 border shadow-sm" 
                       style={{ width: 32, height: 32, background: getIntensityColor(level) }} />
                ))}
                <small className="text-muted fw-bold">More Attendance</small>
              </div>

              {heatmapData.stats && (
                <div className="row g-3 mt-2">
                  <div className="col-md-3">
                    <div className="card bg-light border-0">
                      <div className="card-body text-center">
                        <small className="text-muted text-uppercase fw-bold d-block mb-2">Avg Attendance</small>
                        <h3 className="text-primary fw-bold mb-0">{heatmapData.stats.avg_attendance}%</h3>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-light border-0">
                      <div className="card-body text-center">
                        <small className="text-muted text-uppercase fw-bold d-block mb-2">Days Marked</small>
                        <h3 className="text-info fw-bold mb-0">{heatmapData.stats.marked_days}/{heatmapData.stats.total_days}</h3>
                      </div>
                    </div>
                  </div>
                  {heatmapData.stats.best_day && (
                    <div className="col-md-3">
                      <div className="card bg-success bg-opacity-10 border-success border-2">
                        <div className="card-body text-center">
                          <small className="text-success text-uppercase fw-bold d-block mb-2">Best Day</small>
                          <p className="text-success fw-bold mb-1 small">{heatmapData.stats.best_day.date}</p>
                          <h4 className="text-success fw-bold mb-0">{heatmapData.stats.best_day.percentage}%</h4>
                        </div>
                      </div>
                    </div>
                  )}
                  {heatmapData.stats.worst_day && (
                    <div className="col-md-3">
                      <div className="card bg-danger bg-opacity-10 border-danger border-2">
                        <div className="card-body text-center">
                          <small className="text-danger text-uppercase fw-bold d-block mb-2">Worst Day</small>
                          <p className="text-danger fw-bold mb-1 small">{heatmapData.stats.worst_day.date}</p>
                          <h4 className="text-danger fw-bold mb-0">{heatmapData.stats.worst_day.percentage}%</h4>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Drill-down Modal */}
        {drillDownDate && drillDownData && (
          <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.75)' }}>
            <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
              <div className="modal-content shadow-lg">
                <div className="modal-header bg-light">
                  <h5 className="modal-title fw-bold">📅 Attendance Details - {drillDownDate}</h5>
                  <button type="button" className="btn-close" onClick={() => { setDrillDownDate(null); setDrillDownData(null) }}></button>
                </div>
                <div className="modal-body">
                  {loadingDrillDown ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status"></div>
                      <p className="mt-3 text-muted">Loading data...</p>
                    </div>
                  ) : (
                    <>
                      <div className="row g-3 mb-4">
                        <div className="col-6">
                          <div className="card bg-success bg-opacity-10 border-success border-2">
                            <div className="card-body text-center">
                              <small className="text-success text-uppercase fw-bold d-block mb-2">✅ Present</small>
                              <h2 className="text-success fw-bold mb-0">{drillDownData.filter(s => s.status === 'present').length}</h2>
                            </div>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="card bg-danger bg-opacity-10 border-danger border-2">
                            <div className="card-body text-center">
                              <small className="text-danger text-uppercase fw-bold d-block mb-2">❌ Absent</small>
                              <h2 className="text-danger fw-bold mb-0">{drillDownData.filter(s => s.status === 'absent').length}</h2>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="table-responsive border rounded" style={{ maxHeight: 400 }}>
                        <table className="table table-striped table-hover mb-0">
                          <thead className="table-light sticky-top">
                            <tr>
                              <th className="fw-bold">Roll No</th>
                              <th className="fw-bold">Name</th>
                              <th className="text-center fw-bold">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {drillDownData.map(student => (
                              <tr key={student.student_id}>
                                <td className="fw-semibold">{student.roll_no}</td>
                                <td>{student.student_name}</td>
                                <td className="text-center">
                                  <span className={`badge ${student.status === 'present' ? 'bg-success' : 'bg-danger'} px-3 py-2`}>
                                    {student.status === 'present' ? '✅ Present' : '❌ Absent'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Low Attendance Alert */}
        {students.filter(s => s.attendance_rate < 50).length > 0 && (
          <div className="alert alert-danger border-0 shadow-sm mb-4">
            <h5 className="alert-heading fw-bold">⚠️ Low Attendance Alert</h5>
            <p className="mb-3 fw-semibold">{students.filter(s => s.attendance_rate < 50).length} student(s) have attendance below 50%</p>
            <div className="list-group">
              {students.filter(s => s.attendance_rate < 50).slice(0, 5).map(student => (
                <div key={student.student_id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <strong className="fs-6">{student.name}</strong> 
                    <small className="text-muted ms-2">(Roll: {student.roll_no})</small>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <span className="badge bg-danger fs-6 px-3 py-2">{student.attendance_rate}%</span>
                    <small className="text-muted fw-semibold">({student.present_days}/{student.total_days})</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Student Table */}
        {students.length > 0 && (
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <h5 className="card-title fw-bold mb-0 py-2">👨‍🎓 Student-wise Attendance</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th className="fw-bold">Roll No</th>
                      <th className="fw-bold">Name</th>
                      <th className="text-center fw-bold">Total Days</th>
                      <th className="text-center fw-bold">Present</th>
                      <th className="text-center fw-bold">Absent</th>
                      <th className="text-center fw-bold">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => (
                      <tr key={student.student_id}>
                        <td className="fw-semibold">{student.roll_no}</td>
                        <td className="fw-medium">{student.name}</td>
                        <td className="text-center fw-semibold">{student.total_days}</td>
                        <td className="text-center text-success fw-bold">{student.present_days}</td>
                        <td className="text-center text-danger fw-bold">{student.absent_days}</td>
                        <td className="text-center">
                          <span className={`badge ${student.attendance_rate >= 75 ? 'bg-success' : student.attendance_rate >= 50 ? 'bg-warning' : 'bg-danger'} fs-6 px-3 py-2`}>
                            {student.attendance_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        /* Button Hover - Only clickable buttons */
        .btn-hover {
          transition: all 0.3s ease;
        }
        .btn-hover:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        
        /* Heatmap Cells - Improved interaction */
        .heatmap-cell {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: bold;
        }
        
        .heatmap-clickable:hover {
          transform: scale(1.15);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
          border-color: #3b82f6 !important;
          z-index: 10;
        }
        
        .heatmap-selected {
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
          transform: scale(1.1);
        }
        
        .heatmap-disabled {
          opacity: 0.4;
        }
        
        /* Modal */
        .modal.show {
          display: block !important;
        }
        
        /* Form Select Focus */
        .form-select:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 0.25rem rgba(59, 130, 246, 0.15);
        }
      `}</style>
    </div>
  )
}
