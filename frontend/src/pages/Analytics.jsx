// frontend/src/pages/Analytics.jsx - PHASE 5: COMPLETE (100%)
import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function Analytics() {
  const [overview, setOverview] = useState(null)
  const [trend, setTrend] = useState([])
  const [students, setStudents] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [classroomComparison, setClassroomComparison] = useState([])
  const [selectedClassroom, setSelectedClassroom] = useState('')
  const [dateRange, setDateRange] = useState(7)
  const [loading, setLoading] = useState(true)
  
  // Heatmap states
  const [heatmapData, setHeatmapData] = useState(null)
  const [heatmapDays, setHeatmapDays] = useState(30)
  const [hoveredDay, setHoveredDay] = useState(null)
  
  // ✅ NEW: Drill-down modal
  const [drillDownDate, setDrillDownDate] = useState(null)
  const [drillDownData, setDrillDownData] = useState(null)
  const [loadingDrillDown, setLoadingDrillDown] = useState(false)
  
  // ✅ NEW: Weekly summary
  const [weeklySummary, setWeeklySummary] = useState(null)

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
        loadHeatmap(classroomsData[0].id, heatmapDays)
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

  // ✅ NEW: Calculate weekly summary
  const calculateWeeklySummary = (heatmapData) => {
    if (!heatmapData || !heatmapData.heatmap) return null
    
    const last7Days = heatmapData.heatmap.slice(-7)
    const previous7Days = heatmapData.heatmap.slice(-14, -7)
    
    const thisWeekAvg = last7Days.filter(d => d.total_marked > 0).reduce((sum, d) => sum + d.percentage, 0) / last7Days.filter(d => d.total_marked > 0).length || 0
    const lastWeekAvg = previous7Days.filter(d => d.total_marked > 0).reduce((sum, d) => sum + d.percentage, 0) / previous7Days.filter(d => d.total_marked > 0).length || 0
    
    const change = thisWeekAvg - lastWeekAvg
    
    return {
      thisWeek: Math.round(thisWeekAvg * 10) / 10,
      lastWeek: Math.round(lastWeekAvg * 10) / 10,
      change: Math.round(change * 10) / 10,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
    }
  }

  const loadHeatmap = async (classroomId, days) => {
    try {
      const { data } = await api.get(`/analytics/heatmap?classroom_id=${classroomId}&days=${days}`)
      setHeatmapData(data)
      setWeeklySummary(calculateWeeklySummary(data))
    } catch (e) {
      console.error('Failed to load heatmap:', e)
    }
  }

  // ✅ NEW: Load drill-down data
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
    loadClassroomData(classroomId, dateRange)
    loadHeatmap(classroomId, heatmapDays)
  }

  const handleDateRangeChange = (e) => {
    const days = parseInt(e.target.value)
    setDateRange(days)
    if (selectedClassroom) {
      loadClassroomData(selectedClassroom, days)
    }
  }

  const handleHeatmapDaysChange = (e) => {
    const days = parseInt(e.target.value)
    setHeatmapDays(days)
    if (selectedClassroom) {
      loadHeatmap(selectedClassroom, days)
    }
  }

  const getIntensityColor = (intensity) => {
    const colors = {
      0: '#ebedf0',
      1: '#ffcdd2',
      2: '#ffb74d',
      3: '#fff176',
      4: '#81c784'
    }
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
          <div class="card"><strong>Total Students:</strong> ${overview.total_students}<br><strong>Total Classrooms:</strong> ${overview.total_classrooms}</div>
          <div class="card"><strong>Today's Present:</strong> ${overview.today.present}<br><strong>Today's Absent:</strong> ${overview.today.absent}</div>
          <div class="card"><strong>Overall Rate:</strong> ${overview.overall_rate}%</div>
          <div class="card"><strong>30-Day Records:</strong> ${overview.last_30_days.total_records}</div>
        </div>
        <h2>Student-wise Attendance</h2>
        <table>
          <thead><tr><th>Roll No</th><th>Name</th><th>Total Days</th><th>Present</th><th>Absent</th><th>Attendance %</th></tr></thead>
          <tbody>${students.map(s => `<tr><td>${s.roll_no}</td><td>${s.name}</td><td>${s.total_days}</td><td>${s.present_days}</td><td>${s.absent_days}</td><td>${s.attendance_rate}%</td></tr>`).join('')}</tbody>
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
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 400, padding: 24 }}>
        <div style={{ width: 60, height: 60, border: '6px solid #f3f4f6', borderTop: '6px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <div style={{ marginTop: 16, color: '#6b7280', fontSize: 14 }}>Loading analytics...</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

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
    <div style={{ padding: 24, background: '#f3f4f6', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700 }}>📊 Analytics Dashboard</h2>
        <div>
          <button onClick={exportAnalyticsToExcel} style={{ padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', marginRight: 10, fontSize: 14, fontWeight: 500 }}>📊 Export Excel</button>
          <button onClick={exportAnalyticsToPDF} style={{ padding: '10px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>📄 Export PDF</button>
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div style={{ padding: 20, background: '#dbeafe', borderRadius: 12, border: '2px solid #60a5fa', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 14, color: '#1e40af', marginBottom: 8, fontWeight: 500 }}>👥 Total Students</div>
          <div style={{ fontSize: 36, fontWeight: 'bold', color: '#1e40af' }}>{overview.total_students}</div>
          <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 4 }}>Across {overview.total_classrooms} classrooms</div>
        </div>
        <div style={{ padding: 20, background: '#d1fae5', borderRadius: 12, border: '2px solid #10b981', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 14, color: '#065f46', marginBottom: 8, fontWeight: 500 }}>✅ Today&apos;s Present</div>
          <div style={{ fontSize: 36, fontWeight: 'bold', color: '#065f46' }}>{overview.today.present}</div>
          <div style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>Out of {overview.today.total} students</div>
        </div>
        <div style={{ padding: 20, background: '#fee2e2', borderRadius: 12, border: '2px solid #ef4444', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 14, color: '#991b1b', marginBottom: 8, fontWeight: 500 }}>❌ Today&apos;s Absent</div>
          <div style={{ fontSize: 36, fontWeight: 'bold', color: '#991b1b' }}>{overview.today.absent}</div>
          <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{overview.today.total > 0 ? Math.round(overview.today.absent / overview.today.total * 100) : 0}% of students</div>
        </div>
        <div style={{ padding: 20, background: '#fef3c7', borderRadius: 12, border: '2px solid #f59e0b', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 14, color: '#92400e', marginBottom: 8, fontWeight: 500 }}>🎯 Overall Rate (30 days)</div>
          <div style={{ fontSize: 36, fontWeight: 'bold', color: '#92400e' }}>{overview.overall_rate}%</div>
          <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>{overview.last_30_days.total_records} total records</div>
        </div>
      </div>

      {/* ✅ NEW: Weekly Summary Comparison */}
      {weeklySummary && (
        <div style={{ marginBottom: 24, padding: 20, background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: 0, marginBottom: 16, fontSize: 18, fontWeight: 600 }}>📊 Weekly Comparison</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div style={{ padding: 16, background: '#f3f4f6', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>This Week Average</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#111827' }}>{weeklySummary.thisWeek}%</div>
            </div>
            <div style={{ padding: 16, background: '#f3f4f6', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Last Week Average</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#111827' }}>{weeklySummary.lastWeek}%</div>
            </div>
            <div style={{ padding: 16, background: weeklySummary.trend === 'up' ? '#d1fae5' : weeklySummary.trend === 'down' ? '#fee2e2' : '#f3f4f6', borderRadius: 8, border: weeklySummary.trend === 'up' ? '2px solid #10b981' : weeklySummary.trend === 'down' ? '2px solid #ef4444' : '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Change</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: weeklySummary.trend === 'up' ? '#10b981' : weeklySummary.trend === 'down' ? '#ef4444' : '#6b7280' }}>
                {weeklySummary.trend === 'up' ? '↑' : weeklySummary.trend === 'down' ? '↓' : '→'} {Math.abs(weeklySummary.change)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ marginBottom: 24, padding: 20, background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>Select Classroom:</label>
            <select value={selectedClassroom} onChange={handleClassroomChange} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, cursor: 'pointer' }}>
              {classrooms.map(c => (<option key={c.id} value={c.id}>{c.name} - {c.subject || 'No subject'}</option>))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>Bar Chart Range:</label>
            <select value={dateRange} onChange={handleDateRangeChange} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, cursor: 'pointer' }}>
              <option value={7}>Last 7 Days</option>
              <option value={15}>Last 15 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={60}>Last 60 Days</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>Heatmap Period:</label>
            <select value={heatmapDays} onChange={handleHeatmapDaysChange} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, cursor: 'pointer' }}>
              <option value={30}>Last 30 Days</option>
              <option value={60}>Last 60 Days</option>
              <option value={90}>Last 90 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* ✅ NEW: Quick Actions Panel */}
      <div style={{ marginBottom: 24, padding: 16, background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginRight: 8 }}>Quick Actions:</span>
          <button onClick={() => window.location.href = '/attendance'} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>📸 Mark Attendance Today</button>
          <button onClick={() => { const date = prompt('Enter date (YYYY-MM-DD):'); if (date && selectedClassroom) loadDrillDownData(date, selectedClassroom) }} style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>📅 Jump to Date</button>
          <button onClick={exportAnalyticsToExcel} style={{ padding: '8px 16px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>📥 Quick Export CSV</button>
        </div>
      </div>

      {/* GitHub-Style Heatmap */}
      {heatmapData && (
        <div style={{ padding: 24, background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>📅 Attendance Heatmap - Last {heatmapDays} Days</h3>
            <p style={{ fontSize: 14, color: '#6b7280' }}>{heatmapData.classroom_name} • {heatmapData.total_students} Students</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'inline-block', minWidth: '100%' }}>
              <div style={{ display: 'flex', marginBottom: 8, marginLeft: 40 }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (<div key={day} style={{ width: 16, fontSize: 10, color: '#6b7280', marginRight: 4, textAlign: 'center' }}>{day[0]}</div>))}
              </div>
              {getWeekData(heatmapData.heatmap).map((week, weekIdx) => (
                <div key={weekIdx} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ width: 35, fontSize: 11, color: '#6b7280', textAlign: 'right', marginRight: 5 }}>W{weekIdx + 1}</div>
                  {week.map((day, dayIdx) => (
                    <div key={dayIdx} onMouseEnter={() => setHoveredDay(day)} onMouseLeave={() => setHoveredDay(null)} onClick={() => { if (day.total_marked > 0) loadDrillDownData(day.date, selectedClassroom) }} style={{ width: 16, height: 16, background: getIntensityColor(day.intensity), borderRadius: 3, marginRight: 4, cursor: day.total_marked > 0 ? 'pointer' : 'default', border: hoveredDay?.date === day.date ? '2px solid #3b82f6' : '1px solid #e5e7eb', transition: 'all 0.2s' }} title={`${day.date}: ${day.percentage}% - Click to view`} />
                  ))}
                </div>
              ))}
            </div>
          </div>
          {hoveredDay && (
            <div style={{ marginTop: 16, padding: 12, background: '#f3f4f6', borderRadius: 8, fontSize: 13 }}>
              <strong>{hoveredDay.date} ({hoveredDay.day_of_week})</strong><br/>Present: {hoveredDay.present} / {hoveredDay.total_students} ({hoveredDay.percentage}%)
            </div>
          )}
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#6b7280' }}>
            <span>Less</span>
            {[0, 1, 2, 3, 4].map(level => (<div key={level} style={{ width: 16, height: 16, background: getIntensityColor(level), borderRadius: 3, border: '1px solid #e5e7eb' }} />))}
            <span>More</span>
          </div>
          {heatmapData.stats && (
            <div style={{ marginTop: 24, padding: 16, background: '#f9fafb', borderRadius: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
                <div><div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Average Attendance</div><div style={{ fontSize: 20, fontWeight: 600, color: '#111827' }}>{heatmapData.stats.avg_attendance}%</div></div>
                <div><div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Total Days Marked</div><div style={{ fontSize: 20, fontWeight: 600, color: '#111827' }}>{heatmapData.stats.marked_days} / {heatmapData.stats.total_days}</div></div>
                {heatmapData.stats.best_day && (<div><div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Best Day</div><div style={{ fontSize: 14, fontWeight: 600, color: '#10b981' }}>{heatmapData.stats.best_day.date} ({heatmapData.stats.best_day.percentage}%)</div></div>)}
                {heatmapData.stats.worst_day && (<div><div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Worst Day</div><div style={{ fontSize: 14, fontWeight: 600, color: '#ef4444' }}>{heatmapData.stats.worst_day.date} ({heatmapData.stats.worst_day.percentage}%)</div></div>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ✅ NEW: Drill-down Modal */}
      {drillDownDate && drillDownData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 600, width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>📅 Attendance - {drillDownDate}</h3>
              <button onClick={() => { setDrillDownDate(null); setDrillDownData(null) }} style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>✕ Close</button>
            </div>
            {loadingDrillDown ? (<div style={{ textAlign: 'center', padding: 40 }}><div style={{ fontSize: 14, color: '#6b7280' }}>Loading...</div></div>) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div style={{ padding: 16, background: '#d1fae5', borderRadius: 8, border: '1px solid #10b981' }}><div style={{ fontSize: 12, color: '#065f46', marginBottom: 4 }}>✅ Present</div><div style={{ fontSize: 28, fontWeight: 'bold', color: '#065f46' }}>{drillDownData.filter(s => s.status === 'present').length}</div></div>
                  <div style={{ padding: 16, background: '#fee2e2', borderRadius: 8, border: '1px solid #ef4444' }}><div style={{ fontSize: 12, color: '#991b1b', marginBottom: 4 }}>❌ Absent</div><div style={{ fontSize: 28, fontWeight: 'bold', color: '#991b1b' }}>{drillDownData.filter(s => s.status === 'absent').length}</div></div>
                </div>
                <div style={{ overflowY: 'auto', maxHeight: 400 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead style={{ background: '#f3f4f6', position: 'sticky', top: 0 }}><tr><th style={{ padding: 10, textAlign: 'left', border: '1px solid #e5e7eb' }}>Roll No</th><th style={{ padding: 10, textAlign: 'left', border: '1px solid #e5e7eb' }}>Name</th><th style={{ padding: 10, textAlign: 'center', border: '1px solid #e5e7eb' }}>Status</th></tr></thead>
                    <tbody>{drillDownData.map(student => (<tr key={student.student_id}><td style={{ padding: 10, border: '1px solid #e5e7eb' }}>{student.roll_no}</td><td style={{ padding: 10, border: '1px solid #e5e7eb' }}>{student.student_name}</td><td style={{ padding: 10, textAlign: 'center', border: '1px solid #e5e7eb' }}><span style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: student.status === 'present' ? '#d1fae5' : '#fee2e2', color: student.status === 'present' ? '#065f46' : '#991b1b' }}>{student.status === 'present' ? '✅ Present' : '❌ Absent'}</span></td></tr>))}</tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bar Chart */}
      {trend.length > 0 ? (
        <div style={{ marginBottom: 32, padding: 20, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: 600 }}>📊 Day-wise Attendance (Last {dateRange} Days)</h3>
          <ResponsiveContainer width="100%" height={300}><BarChart data={trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend /><Bar dataKey="present" fill="#10b981" name="Present" /><Bar dataKey="absent" fill="#ef4444" name="Absent" /></BarChart></ResponsiveContainer>
        </div>
      ) : (<div style={{ padding: 40, textAlign: 'center', background: '#fff', borderRadius: 12, marginBottom: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}><div style={{ fontSize: 48 }}>📊</div><div style={{ marginTop: 8, color: '#6b7280' }}>No attendance data available for selected range</div></div>)}

      {/* ✅ NEW: Low Attendance Alerts */}
      {students.length > 0 && students.filter(s => s.attendance_rate < 50).length > 0 && (
        <div style={{ marginBottom: 24, padding: 20, background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #ef4444' }}>
          <h3 style={{ margin: 0, marginBottom: 16, fontSize: 18, fontWeight: 600, color: '#991b1b' }}>⚠️ Low Attendance Alert</h3>
          <p style={{ fontSize: 14, color: '#7f1d1d', marginBottom: 16 }}>{students.filter(s => s.attendance_rate < 50).length} student(s) have attendance below 50%</p>
          <div style={{ display: 'grid', gap: 12 }}>
            {students.filter(s => s.attendance_rate < 50).slice(0, 5).map(student => (
              <div key={student.student_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: '#fee2e2', borderRadius: 8, border: '1px solid #ef4444' }}>
                <div><strong style={{ color: '#991b1b' }}>{student.name}</strong><span style={{ marginLeft: 8, fontSize: 13, color: '#7f1d1d' }}>(Roll: {student.roll_no})</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 18, fontWeight: 'bold', color: '#ef4444' }}>{student.attendance_rate}%</span><span style={{ fontSize: 12, color: '#7f1d1d' }}>({student.present_days}/{student.total_days} days)</span></div>
              </div>
            ))}
            {students.filter(s => s.attendance_rate < 50).length > 5 && (<div style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 8 }}>... and {students.filter(s => s.attendance_rate < 50).length - 5} more students</div>)}
          </div>
        </div>
      )}

      {/* Student Table */}
      {students.length > 0 ? (
        <div style={{ marginBottom: 32, background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}><h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>👨‍🎓 Student-wise Attendance</h3></div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f3f4f6' }}><tr><th style={{ padding: 12, textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: 600 }}>Roll No</th><th style={{ padding: 12, textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: 600 }}>Name</th><th style={{ padding: 12, textAlign: 'center', border: '1px solid #e5e7eb', fontWeight: 600 }}>Total Days</th><th style={{ padding: 12, textAlign: 'center', border: '1px solid #e5e7eb', fontWeight: 600 }}>Present</th><th style={{ padding: 12, textAlign: 'center', border: '1px solid #e5e7eb', fontWeight: 600 }}>Absent</th><th style={{ padding: 12, textAlign: 'center', border: '1px solid #e5e7eb', fontWeight: 600 }}>Attendance %</th></tr></thead>
              <tbody>{students.map(student => (<tr key={student.student_id}><td style={{ padding: 12, border: '1px solid #e5e7eb' }}>{student.roll_no}</td><td style={{ padding: 12, border: '1px solid #e5e7eb' }}>{student.name}</td><td style={{ padding: 12, textAlign: 'center', border: '1px solid #e5e7eb' }}>{student.total_days}</td><td style={{ padding: 12, textAlign: 'center', border: '1px solid #e5e7eb', color: '#10b981', fontWeight: 500 }}>{student.present_days}</td><td style={{ padding: 12, textAlign: 'center', border: '1px solid #e5e7eb', color: '#ef4444', fontWeight: 500 }}>{student.absent_days}</td><td style={{ padding: 12, textAlign: 'center', border: '1px solid #e5e7eb', fontWeight: 'bold', color: student.attendance_rate >= 75 ? '#10b981' : student.attendance_rate >= 50 ? '#f59e0b' : '#ef4444' }}>{student.attendance_rate}%</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      ) : (<div style={{ padding: 40, textAlign: 'center', background: '#fff', borderRadius: 12, marginBottom: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}><div style={{ fontSize: 48 }}>👨‍🎓</div><div style={{ marginTop: 8, color: '#6b7280' }}>No students in this classroom</div></div>)}

      {/* Classroom Comparison */}
      {classroomComparison.length > 0 && (
        <div style={{ padding: 20, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: 600 }}>🏫 Classroom Comparison</h3>
          <ResponsiveContainer width="100%" height={300}><BarChart data={classroomComparison}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="attendance_rate" fill="#3b82f6" name="Attendance %" /></BarChart></ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
