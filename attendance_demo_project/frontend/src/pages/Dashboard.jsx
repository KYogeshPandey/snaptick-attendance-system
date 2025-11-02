// src/pages/Analytics.jsx - FIXED & BEAUTIFUL
import React, { useState, useEffect, useCallback } from 'react'
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

  // Load initial data only once
  useEffect(() => {
    loadData()
  }, [])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const { data: overviewData } = await api.get('/analytics/overview')
      setOverview(overviewData)
      
      const { data: classroomsData } = await api.get('/classrooms')
      setClassrooms(classroomsData)
      
      if (classroomsData.length > 0) {
        const firstClassId = classroomsData[0].id
        setSelectedClassroom(firstClassId)
        await loadClassroomData(firstClassId)
        await loadHeatmap(firstClassId, 30)
      }
    } catch (e) {
      console.error('Failed to load analytics:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadClassroomData = useCallback(async (classroomId) => {
    try {
      const { data: studentsData } = await api.get(`/analytics/students?classroom_id=${classroomId}`)
      setStudents(studentsData)
    } catch (e) {
      console.error('Failed to load classroom data:', e)
    }
  }, [])

  const loadHeatmap = useCallback(async (classroomId, days) => {
    try {
      const { data } = await api.get(`/analytics/heatmap?classroom_id=${classroomId}&days=${days}`)
      setHeatmapData(data)
    } catch (e) {
      console.error('Failed to load heatmap:', e)
    }
  }, [])

  const loadDrillDownData = useCallback(async (date, classroomId) => {
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
  }, [])

  const handleClassroomChange = (e) => {
    const classroomId = e.target.value
    setSelectedClassroom(classroomId)
    setSelectedDay(null)
    loadClassroomData(classroomId)
    loadHeatmap(classroomId, heatmapDays)
  }

  const handleHeatmapDaysChange = (e) => {
    const days = parseInt(e.target.value)
    setHeatmapDays(days)
    setSelectedDay(null)
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
        <p><strong>Generated:</strong> ${new Date().toLocaleString('en-IN')}</p>
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
    <div style={{ background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)', minHeight: '100vh', paddingTop: '24px', paddingBottom: '40px' }}>
      <div className="container-fluid" style={{ maxWidth: '1400px' }}>
        
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{ fontWeight: 900, marginBottom: '8px', color: '#1f2937', fontSize: '32px' }}>
              📊 Analytics Dashboard
            </h1>
            <p style={{ color: '#6b7280', marginBottom: 0 }}>Comprehensive attendance insights</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={exportCSV} 
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => { e.target.transform = 'translateY(-2px)'; e.target.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)' }}
            >
              📥 CSV
            </button>
            <button 
              onClick={exportPDF}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              📄 PDF
            </button>
          </div>
        </div>

        {/* Overview Cards - Cute Design */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          {[
            { title: 'Total Students', value: overview.total_students, icon: '👨‍🎓', bg: '#667eea', light: '#f0f4ff' },
            { title: "Today's Present", value: overview.today.present, icon: '✅', bg: '#10b981', light: '#f0fdf4' },
            { title: "Today's Absent", value: overview.today.absent, icon: '❌', bg: '#ef4444', light: '#fef2f2' },
            { title: 'Overall Rate', value: `${overview.overall_rate}%`, icon: '📈', bg: '#f59e0b', light: '#fffbeb' }
          ].map((card, i) => (
            <div key={i} style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: `2px solid ${card.light}`,
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
            }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ color: card.bg, fontWeight: 600, fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {card.title}
                  </p>
                  <h2 style={{ color: card.bg, fontWeight: 900, marginBottom: '8px', fontSize: '32px' }}>
                    {card.value}
                  </h2>
                </div>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: card.light,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px'
                }}>
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pie Charts */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          {todayPieData.length > 0 && (
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}>
              <h5 style={{ fontWeight: 700, marginBottom: '20px', color: '#1f2937' }}>Today's Distribution</h5>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={todayPieData} cx="50%" cy="50%" labelLine={false} 
                       label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} 
                       outerRadius={100} dataKey="value">
                    {todayPieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {attendanceRanges.length > 0 && (
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}>
              <h5 style={{ fontWeight: 700, marginBottom: '20px', color: '#1f2937' }}>Performance Ranges</h5>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={attendanceRanges} cx="50%" cy="50%" labelLine={false} 
                       label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} 
                       outerRadius={100} dataKey="value">
                    {attendanceRanges.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Filters */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          marginBottom: '32px'
        }}>
          <h5 style={{ fontWeight: 700, marginBottom: '20px', color: '#1f2937' }}>🔍 Filters</h5>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block', color: '#374151' }}>Select Classroom</label>
              <select 
                value={selectedClassroom} 
                onChange={handleClassroomChange} 
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block', color: '#374151' }}>Heatmap Period</label>
              <select 
                value={heatmapDays} 
                onChange={handleHeatmapDaysChange} 
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <option value={30}>Last 30 Days</option>
                <option value={60}>Last 60 Days</option>
                <option value={90}>Last 90 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Heatmap */}
        {heatmapData && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            marginBottom: '32px'
          }}>
            <h5 style={{ fontWeight: 700, marginBottom: '4px', color: '#1f2937' }}>📅 Attendance Heatmap</h5>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>{heatmapData.classroom_name}</p>
            
            <div style={{
              background: '#f9fafb',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              overflowX: 'auto'
            }}>
              <div style={{ minWidth: 600 }}>
                <div style={{ display: 'flex', marginBottom: '16px', marginLeft: '60px' }}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                    <div key={i} style={{
                      width: 32,
                      marginRight: 6,
                      textAlign: 'center',
                      fontWeight: 600,
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      {day.slice(0, 3)}
                    </div>
                  ))}
                </div>
                {getWeekData(heatmapData.heatmap).map((week, weekIdx) => (
                  <div key={weekIdx} style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                    <small style={{
                      width: 50,
                      marginRight: 10,
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#6b7280'
                    }}>
                      W{weekIdx + 1}
                    </small>
                    {week.map((day, dayIdx) => (
                      <div 
                        key={dayIdx} 
                        onClick={() => {
                          if (day.total_marked > 0) {
                            setSelectedDay(day)
                            loadDrillDownData(day.date, selectedClassroom)
                          }
                        }}
                        style={{
                          width: 32,
                          height: 32,
                          marginRight: 6,
                          background: getIntensityColor(day.intensity),
                          borderRadius: 8,
                          border: selectedDay?.date === day.date ? '3px solid #667eea' : '2px solid #d1d5db',
                          cursor: day.total_marked > 0 ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          transition: 'all 0.2s ease',
                          fontSize: '14px'
                        }}
                        onMouseEnter={(e) => {
                          if (day.total_marked > 0) {
                            e.currentTarget.style.transform = 'scale(1.15)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                        title={day.total_marked > 0 ? `${day.date}: ${day.percentage}%` : `${day.date}: No data`}
                      >
                        {selectedDay?.date === day.date && '✓'}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {selectedDay && (
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                padding: '20px',
                color: 'white',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h6 style={{ fontWeight: 700, marginBottom: '8px', fontSize: '16px' }}>
                    📅 {selectedDay.date} ({selectedDay.day_of_week})
                  </h6>
                  <div style={{ display: 'flex', gap: '24px', fontSize: '14px' }}>
                    <span>Present: <strong>{selectedDay.present}</strong></span>
                    <span>Absent: <strong>{selectedDay.total_students - selectedDay.present}</strong></span>
                    <span>Attendance: <strong>{selectedDay.percentage}%</strong></span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDay(null)} 
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}

{/* 🔴 Low Attendance Alert */}
{students.filter(s => s.attendance_rate < 50).length > 0 && (
  <div style={{
    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '32px',
    border: '2px solid #fca5a5',
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
  }}>
    <h5 style={{
      fontWeight: 700,
      color: '#991b1b',
      marginBottom: '16px',
      fontSize: '18px'
    }}>
      ⚠️ Low Attendance Alert
    </h5>
    <p style={{
      color: '#7f1d1d',
      fontWeight: 600,
      marginBottom: '16px'
    }}>
      {students.filter(s => s.attendance_rate < 50).length} student(s) have attendance below 50%
    </p>
    
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '12px'
    }}>
      {students.filter(s => s.attendance_rate < 50).map(student => (
        <div 
          key={student.student_id}
          style={{
            background: 'rgba(255, 255, 255, 0.7)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #f5d5d5',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'white'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <div>
            <p style={{
              fontWeight: 700,
              color: '#1f2937',
              marginBottom: '4px',
              fontSize: '15px'
            }}>
              {student.name}
            </p>
            <p style={{
              fontSize: '13px',
              color: '#6b7280',
              marginBottom: 0
            }}>
              Roll No: {student.roll_no}
            </p>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              textAlign: 'right'
            }}>
              <span style={{
                background: '#fee2e2',
                color: '#991b1b',
                padding: '8px 16px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '16px',
                display: 'inline-block'
              }}>
                {student.attendance_rate}%
              </span>
              <p style={{
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '4px',
                marginBottom: 0
              }}>
                ({student.present_days}/{student.total_days} days)
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>

    <div style={{
      marginTop: '16px',
      padding: '12px 16px',
      background: 'rgba(0, 0, 0, 0.05)',
      borderRadius: '10px',
      fontSize: '13px',
      color: '#7f1d1d'
    }}>
      💡 <strong>Action:</strong> Contact these students and parents to discuss attendance improvement plans.
    </div>
  </div>
)}


        {/* Student Table */}
        {students.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '2px solid #f3f4f6'
            }}>
              <h5 style={{ fontWeight: 700, marginBottom: 0, color: '#1f2937' }}>👨‍🎓 Student Attendance</h5>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Roll No</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Name</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>Total</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontWeight: 700, color: '#10b981' }}>Present</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontWeight: 700, color: '#ef4444' }}>Absent</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontWeight: 700, color: '#667eea' }}>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => (
                    <tr key={student.student_id} style={{
                      borderBottom: '1px solid #f3f4f6',
                      background: idx % 2 === 0 ? 'white' : '#fafbfc',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#fafbfc' }}
                    >
                      <td style={{ padding: '16px', fontWeight: 600, color: '#1f2937' }}>{student.roll_no}</td>
                      <td style={{ padding: '16px', color: '#374151' }}>{student.name}</td>
                      <td style={{ padding: '16px', textAlign: 'center', fontWeight: 600 }}>{student.total_days}</td>
                      <td style={{ padding: '16px', textAlign: 'center', fontWeight: 700, color: '#10b981' }}>{student.present_days}</td>
                      <td style={{ padding: '16px', textAlign: 'center', fontWeight: 700, color: '#ef4444' }}>{student.absent_days}</td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <span style={{
                          background: student.attendance_rate >= 75 ? '#d1fae5' : student.attendance_rate >= 50 ? '#fef3c7' : '#fee2e2',
                          color: student.attendance_rate >= 75 ? '#065f46' : student.attendance_rate >= 50 ? '#92400e' : '#991b1b',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '14px'
                        }}>
                          {student.attendance_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
