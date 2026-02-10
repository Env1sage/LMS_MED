/**
 * PDF Report Generator — Bitflow LMS Analytics
 * Generates visually rich PDF reports with charts, tables, and branding
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Brand Colors ──
const COLORS = {
  primary: [99, 102, 241] as [number, number, number],       // #6366F1
  primaryDark: [79, 70, 229] as [number, number, number],    // #4F46E5
  accent: [139, 92, 246] as [number, number, number],        // #8B5CF6
  success: [16, 185, 129] as [number, number, number],       // #10B981
  warning: [245, 158, 11] as [number, number, number],       // #F59E0B
  danger: [239, 68, 68] as [number, number, number],         // #EF4444
  info: [59, 130, 246] as [number, number, number],          // #3B82F6
  dark: [30, 27, 75] as [number, number, number],            // #1E1B4B
  gray: [107, 114, 128] as [number, number, number],         // #6B7280
  lightGray: [243, 244, 246] as [number, number, number],    // #F3F4F6
  white: [255, 255, 255] as [number, number, number],
  chartColors: [
    [99, 102, 241],   // indigo
    [16, 185, 129],   // green
    [245, 158, 11],   // amber
    [239, 68, 68],    // red
    [139, 92, 246],   // violet
    [59, 130, 246],   // blue
    [236, 72, 153],   // pink
    [20, 184, 166],   // teal
    [249, 115, 22],   // orange
  ] as [number, number, number][],
};

// ── Helpers ──
function rgbStr(c: [number, number, number]): string { return `rgb(${c[0]},${c[1]},${c[2]})`; }

function drawRoundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, fill: [number, number, number]) {
  doc.setFillColor(...fill);
  doc.roundedRect(x, y, w, h, r, r, 'F');
}

function addHeader(doc: jsPDF, title: string, subtitle: string, pageW: number) {
  // Header gradient band
  drawRoundedRect(doc, 0, 0, pageW, 52, 0, COLORS.primaryDark);
  // Subtle accent strip
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, 48, pageW, 4, 'F');

  // Logo circle
  doc.setFillColor(255, 255, 255);
  doc.circle(28, 26, 12, 'F');
  doc.setFillColor(...COLORS.primary);
  doc.circle(28, 26, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('B', 25.5, 29.5);

  // Title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(title, 48, 28);

  // Subtitle
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 255);
  doc.text(subtitle, 48, 38);

  // Date on right
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 255);
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Generated: ${dateStr}`, pageW - 15, 28, { align: 'right' });

  return 62; // return Y position after header
}

function addFooter(doc: jsPDF, pageW: number, pageH: number) {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...COLORS.lightGray);
    doc.rect(0, pageH - 16, pageW, 16, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);
    doc.text('Bitflow LMS — Confidential Analytics Report', 15, pageH - 6);
    doc.text(`Page ${i} of ${totalPages}`, pageW - 15, pageH - 6, { align: 'right' });
  }
}

function addSectionTitle(doc: jsPDF, y: number, title: string, pageW: number): number {
  // Accent line
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(15, y, 4, 16, 2, 2, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text(title, 24, y + 11);

  // Subtle line
  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.5);
  doc.line(24, y + 17, pageW - 15, y + 17);

  return y + 24;
}

function addKpiCard(
  doc: jsPDF, x: number, y: number, w: number, h: number,
  label: string, value: string, color: [number, number, number]
) {
  // Card background
  drawRoundedRect(doc, x, y, w, h, 4, COLORS.white);
  // Subtle border
  doc.setDrawColor(230, 230, 235);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 4, 4, 'S');

  // Color dot
  doc.setFillColor(...color);
  doc.circle(x + 10, y + 14, 3, 'F');

  // Value
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text(value, x + 18, y + 18);

  // Label
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  doc.text(label, x + 10, y + h - 6);
}

function drawBarChart(
  doc: jsPDF, x: number, y: number, w: number, h: number,
  data: { label: string; value: number; color?: [number, number, number] }[],
  title: string
) {
  // Chart area background
  drawRoundedRect(doc, x, y, w, h, 4, COLORS.white);
  doc.setDrawColor(230, 230, 235);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 4, 4, 'S');

  // Title
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text(title, x + 10, y + 14);

  if (data.length === 0) return;

  const chartX = x + 12;
  const chartY = y + 22;
  const chartW = w - 24;
  const chartH = h - 40;

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barW = Math.min(28, (chartW - data.length * 4) / data.length);
  const totalBarsW = data.length * barW + (data.length - 1) * 4;
  const startX = chartX + (chartW - totalBarsW) / 2;

  // Grid lines
  doc.setDrawColor(240, 240, 245);
  doc.setLineWidth(0.2);
  for (let i = 0; i <= 4; i++) {
    const gy = chartY + chartH - (chartH * i) / 4;
    doc.line(chartX, gy, chartX + chartW, gy);
    doc.setFontSize(6);
    doc.setTextColor(...COLORS.gray);
    doc.text(Math.round((maxVal * i) / 4).toString(), chartX - 2, gy + 1, { align: 'right' });
  }

  // Bars
  data.forEach((d, i) => {
    const barH = (d.value / maxVal) * chartH;
    const bx = startX + i * (barW + 4);
    const by = chartY + chartH - barH;
    const color = d.color || COLORS.chartColors[i % COLORS.chartColors.length];

    doc.setFillColor(...color);
    doc.roundedRect(bx, by, barW, barH, 2, 2, 'F');

    // Value on top
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text(d.value.toString(), bx + barW / 2, by - 2, { align: 'center' });

    // Label below
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    const label = d.label.length > 10 ? d.label.substring(0, 9) + '..' : d.label;
    doc.text(label, bx + barW / 2, chartY + chartH + 8, { align: 'center' });
  });
}

function drawDonutChart(
  doc: jsPDF, cx: number, cy: number, radius: number,
  data: { label: string; value: number; color: [number, number, number] }[],
  title: string
) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return;

  // Title
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text(title, cx, cy - radius - 8, { align: 'center' });

  let startAngle = -Math.PI / 2;
  const innerRadius = radius * 0.55;

  data.forEach(d => {
    if (d.value === 0) return;
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;

    // Draw slice as filled arc using lines
    doc.setFillColor(...d.color);
    const steps = Math.max(20, Math.ceil(sliceAngle * 20));
    const points: [number, number][] = [];

    // Outer arc
    for (let s = 0; s <= steps; s++) {
      const a = startAngle + (sliceAngle * s) / steps;
      points.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
    }
    // Inner arc reverse
    for (let s = steps; s >= 0; s--) {
      const a = startAngle + (sliceAngle * s) / steps;
      points.push([cx + Math.cos(a) * innerRadius, cy + Math.sin(a) * innerRadius]);
    }

    // Draw polygon
    if (points.length > 2) {
      doc.setFillColor(...d.color);
      // Build path
      const lines: number[][] = points.map(p => [p[0], p[1]]);
      doc.triangle(lines[0][0], lines[0][1], lines[1][0], lines[1][1], lines[2][0], lines[2][1], 'F');
      // For more complex shapes, draw line by line
      for (let i = 1; i < lines.length - 1; i++) {
        doc.triangle(lines[0][0], lines[0][1], lines[i][0], lines[i][1], lines[i + 1][0], lines[i + 1][1], 'F');
      }
    }

    startAngle = endAngle;
  });

  // White center circle
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, innerRadius - 1, 'F');

  // Center total
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text(total.toString(), cx, cy + 2, { align: 'center' });
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.gray);
  doc.text('Total', cx, cy + 8, { align: 'center' });

  // Legend
  const legendY = cy + radius + 8;
  data.forEach((d, i) => {
    const lx = cx - 30 + (i % 2) * 60;
    const ly = legendY + Math.floor(i / 2) * 10;
    doc.setFillColor(...d.color);
    doc.circle(lx, ly, 2, 'F');
    doc.setFontSize(6);
    doc.setTextColor(...COLORS.gray);
    doc.text(`${d.label} (${d.value})`, lx + 5, ly + 2);
  });
}

function drawHorizontalBar(
  doc: jsPDF, x: number, y: number, w: number,
  label: string, value: number, max: number, color: [number, number, number]
) {
  // Label
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);
  doc.text(label, x, y);

  // Track
  const barY = y + 3;
  const barH = 6;
  drawRoundedRect(doc, x, barY, w, barH, 3, COLORS.lightGray);

  // Fill
  const fillW = max > 0 ? (value / max) * w : 0;
  if (fillW > 0) {
    drawRoundedRect(doc, x, barY, Math.max(fillW, 6), barH, 3, color);
  }

  // Value
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...color);
  doc.text(`${value}%`, x + w + 4, barY + 5);
}


// ════════════════════════════════════════════════════════════════
//  PUBLIC API — Export Report as PDF
// ════════════════════════════════════════════════════════════════

export async function generatePdfReport(
  reportType: string,
  data: any,
  overviewData?: { analytics: any; dashboard: any }
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  switch (reportType) {
    case 'student-performance':
      buildStudentReport(doc, data, pageW, pageH);
      break;
    case 'teacher-performance':
      buildTeacherReport(doc, data, pageW, pageH);
      break;
    case 'course-performance':
      buildCourseReport(doc, data, pageW, pageH);
      break;
    case 'college-comparison':
      buildCollegeReport(doc, data, pageW, pageH);
      break;
    default:
      buildStudentReport(doc, data, pageW, pageH);
  }

  addFooter(doc, pageW, pageH);
  doc.save(`${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`);
}


// ════════════════════════════════════════════════════════════════
//  STUDENT PERFORMANCE PDF
// ════════════════════════════════════════════════════════════════

function buildStudentReport(doc: jsPDF, data: any, pageW: number, pageH: number) {
  let y = addHeader(doc, 'Student Performance Report', 'Comprehensive student learning analytics', pageW);
  const students: any[] = data.students || [];
  const summary = data.summary || {};

  // ── KPI Cards ──
  y = addSectionTitle(doc, y, 'Performance Overview', pageW);
  const cardW = (pageW - 50) / 4;
  addKpiCard(doc, 15, y, cardW, 34, 'Total Students', String(summary.totalStudents || students.length), COLORS.primary);
  addKpiCard(doc, 20 + cardW, y, cardW, 34, 'Avg Completion', `${(summary.avgCompletionRate || 0).toFixed(1)}%`, COLORS.success);
  addKpiCard(doc, 25 + cardW * 2, y, cardW, 34, 'Avg Accuracy', `${(summary.avgAccuracy || 0).toFixed(1)}%`, COLORS.info);
  addKpiCard(doc, 30 + cardW * 3, y, cardW, 34, 'Active Learners', String(summary.activeLearners || Math.ceil(students.length * 0.7)), COLORS.accent);
  y += 42;

  // ── Completion Distribution Chart ──
  if (students.length > 0) {
    const ranges = [
      { label: '0-25%', min: 0, max: 25, color: COLORS.danger },
      { label: '26-50%', min: 26, max: 50, color: COLORS.warning },
      { label: '51-75%', min: 51, max: 75, color: COLORS.info },
      { label: '76-100%', min: 76, max: 100, color: COLORS.success },
    ];
    const dist = ranges.map(r => ({
      label: r.label,
      value: students.filter(s => s.completionRate >= r.min && s.completionRate <= r.max).length,
      color: r.color,
    }));

    drawBarChart(doc, 15, y, (pageW - 35) / 2, 70, dist, 'Completion Rate Distribution');

    // Top performers
    const topStudents = [...students].sort((a, b) => b.completionRate - a.completionRate).slice(0, 5);
    const chartRight = 20 + (pageW - 35) / 2;
    drawRoundedRect(doc, chartRight, y, (pageW - 35) / 2, 70, 4, COLORS.white);
    doc.setDrawColor(230, 230, 235);
    doc.roundedRect(chartRight, y, (pageW - 35) / 2, 70, 4, 4, 'S');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('Top Performing Students', chartRight + 10, y + 14);

    const barW = (pageW - 35) / 2 - 30;
    const maxRate = 100;
    topStudents.forEach((s, i) => {
      const name = s.studentName?.length > 22 ? s.studentName.substring(0, 20) + '..' : (s.studentName || 'Unknown');
      drawHorizontalBar(doc, chartRight + 10, y + 24 + i * 12, barW - 14, name, Math.round(s.completionRate), maxRate,
        i === 0 ? COLORS.success : i === 1 ? COLORS.info : COLORS.primary);
    });

    y += 78;
  }

  // ── Data Table ──
  if (y > pageH - 60) { doc.addPage(); y = 15; }
  y = addSectionTitle(doc, y, 'Student Details', pageW);

  autoTable(doc, {
    startY: y,
    head: [['Name', 'Email', 'College', 'Courses', 'Completed', 'Completion %', 'Accuracy %']],
    body: students.map(s => [
      s.studentName || 'Unknown',
      s.email || '-',
      s.collegeName || '-',
      s.totalCourses,
      s.completedCourses,
      `${s.completionRate?.toFixed(1)}%`,
      `${s.practiceStats?.accuracy?.toFixed(1) || 0}%`,
    ]),
    styles: { fontSize: 7, cellPadding: 3, lineColor: [230, 230, 235], lineWidth: 0.2 },
    headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    margin: { left: 15, right: 15 },
    theme: 'grid',
  });
}


// ════════════════════════════════════════════════════════════════
//  TEACHER PERFORMANCE PDF
// ════════════════════════════════════════════════════════════════

function buildTeacherReport(doc: jsPDF, data: any, pageW: number, pageH: number) {
  let y = addHeader(doc, 'Teacher Performance Report', 'Faculty teaching effectiveness analytics', pageW);
  const teachers: any[] = data.teachers || [];
  const summary = data.summary || {};

  // ── KPI Cards ──
  y = addSectionTitle(doc, y, 'Teaching Overview', pageW);
  const cardW = (pageW - 50) / 4;
  addKpiCard(doc, 15, y, cardW, 34, 'Total Teachers', String(summary.totalTeachers || teachers.length), COLORS.primary);
  addKpiCard(doc, 20 + cardW, y, cardW, 34, 'Total Courses', String(summary.totalCourses || 0), COLORS.info);
  addKpiCard(doc, 25 + cardW * 2, y, cardW, 34, 'Avg Completion', `${(summary.avgCompletionRate || 0).toFixed(1)}%`, COLORS.success);
  addKpiCard(doc, 30 + cardW * 3, y, cardW, 34, 'Avg Rating', `${(summary.avgRating || 0).toFixed(1)} ★`, COLORS.warning);
  y += 42;

  // ── Charts ──
  if (teachers.length > 0) {
    // Courses per teacher bar chart
    const topTeachers = [...teachers].sort((a, b) => b.totalCourses - a.totalCourses).slice(0, 8);
    drawBarChart(doc, 15, y, (pageW - 35) / 2, 70,
      topTeachers.map((t, i) => ({
        label: (t.teacherName || 'Teacher').split(' ')[0],
        value: t.totalCourses,
        color: COLORS.chartColors[i % COLORS.chartColors.length],
      })),
      'Courses per Teacher (Top 8)'
    );

    // Student completion by teacher
    const chartRight = 20 + (pageW - 35) / 2;
    drawRoundedRect(doc, chartRight, y, (pageW - 35) / 2, 70, 4, COLORS.white);
    doc.setDrawColor(230, 230, 235);
    doc.roundedRect(chartRight, y, (pageW - 35) / 2, 70, 4, 4, 'S');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('Student Completion by Teacher', chartRight + 10, y + 14);

    const topByCompletion = [...teachers].sort((a, b) => b.studentCompletionRate - a.studentCompletionRate).slice(0, 5);
    const barW = (pageW - 35) / 2 - 30;
    topByCompletion.forEach((t, i) => {
      const name = t.teacherName?.length > 22 ? t.teacherName.substring(0, 20) + '..' : (t.teacherName || 'Unknown');
      drawHorizontalBar(doc, chartRight + 10, y + 24 + i * 12, barW - 14, name,
        Math.round(t.studentCompletionRate), 100,
        COLORS.chartColors[i % COLORS.chartColors.length]);
    });

    y += 78;
  }

  // ── Data Table ──
  if (y > pageH - 60) { doc.addPage(); y = 15; }
  y = addSectionTitle(doc, y, 'Teacher Details', pageW);

  autoTable(doc, {
    startY: y,
    head: [['Name', 'Email', 'College', 'Courses', 'Active', 'Students', 'Completion %', 'Rating']],
    body: teachers.map(t => [
      t.teacherName || 'Unknown',
      t.email || '-',
      t.collegeName || '-',
      t.totalCourses,
      t.activeCourses,
      t.totalStudents,
      `${t.studentCompletionRate?.toFixed(1)}%`,
      t.avgRating ? `${t.avgRating.toFixed(1)} ★` : 'N/A',
    ]),
    styles: { fontSize: 7, cellPadding: 3, lineColor: [230, 230, 235], lineWidth: 0.2 },
    headStyles: { fillColor: COLORS.info, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    margin: { left: 15, right: 15 },
    theme: 'grid',
  });
}


// ════════════════════════════════════════════════════════════════
//  COURSE PERFORMANCE PDF
// ════════════════════════════════════════════════════════════════

function buildCourseReport(doc: jsPDF, data: any, pageW: number, pageH: number) {
  let y = addHeader(doc, 'Course Analysis Report', 'Course performance and enrollment analytics', pageW);
  const courses: any[] = data.courses || [];
  const summary = data.summary || {};

  // ── KPI Cards ──
  y = addSectionTitle(doc, y, 'Course Overview', pageW);
  const cardW = (pageW - 50) / 4;
  addKpiCard(doc, 15, y, cardW, 34, 'Total Courses', String(summary.totalCourses || courses.length), COLORS.primary);
  addKpiCard(doc, 20 + cardW, y, cardW, 34, 'Published', String(summary.publishedCourses || courses.filter((c: any) => c.status === 'PUBLISHED').length), COLORS.success);
  addKpiCard(doc, 25 + cardW * 2, y, cardW, 34, 'Avg Completion', `${(summary.avgCompletionRate || 0).toFixed(1)}%`, COLORS.info);
  addKpiCard(doc, 30 + cardW * 3, y, cardW, 34, 'Avg Rating', `${(summary.avgRating || 0).toFixed(1)} ★`, COLORS.warning);
  y += 42;

  // ── Charts ──
  if (courses.length > 0) {
    // Enrollment chart
    const topCourses = [...courses].sort((a, b) => b.enrolledStudents - a.enrolledStudents).slice(0, 8);
    drawBarChart(doc, 15, y, (pageW - 35) / 2, 70,
      topCourses.map((c, i) => ({
        label: (c.courseTitle || 'Course').substring(0, 10),
        value: c.enrolledStudents,
        color: COLORS.chartColors[i % COLORS.chartColors.length],
      })),
      'Top Courses by Enrollment'
    );

    // Completion rate comparison
    const chartRight = 20 + (pageW - 35) / 2;
    drawRoundedRect(doc, chartRight, y, (pageW - 35) / 2, 70, 4, COLORS.white);
    doc.setDrawColor(230, 230, 235);
    doc.roundedRect(chartRight, y, (pageW - 35) / 2, 70, 4, 4, 'S');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('Completion Rate by Course', chartRight + 10, y + 14);

    const topByRate = [...courses].sort((a, b) => b.completionRate - a.completionRate).slice(0, 5);
    const barW = (pageW - 35) / 2 - 30;
    topByRate.forEach((c, i) => {
      const name = c.courseTitle?.length > 22 ? c.courseTitle.substring(0, 20) + '..' : (c.courseTitle || 'Unknown');
      drawHorizontalBar(doc, chartRight + 10, y + 24 + i * 12, barW - 14, name,
        Math.round(c.completionRate), 100,
        COLORS.chartColors[i % COLORS.chartColors.length]);
    });

    y += 78;
  }

  // ── Data Table ──
  if (y > pageH - 60) { doc.addPage(); y = 15; }
  y = addSectionTitle(doc, y, 'Course Details', pageW);

  autoTable(doc, {
    startY: y,
    head: [['Course', 'College', 'Faculty', 'Status', 'Enrolled', 'Completed', 'Completion %', 'Rating']],
    body: courses.map(c => [
      c.courseTitle || 'Unknown',
      c.collegeName || '-',
      c.facultyName || '-',
      c.status,
      c.enrolledStudents,
      c.completedStudents,
      `${c.completionRate?.toFixed(1)}%`,
      c.avgRating ? `${c.avgRating.toFixed(1)} ★` : 'N/A',
    ]),
    styles: { fontSize: 7, cellPadding: 3, lineColor: [230, 230, 235], lineWidth: 0.2 },
    headStyles: { fillColor: COLORS.accent, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    margin: { left: 15, right: 15 },
    theme: 'grid',
  });
}


// ════════════════════════════════════════════════════════════════
//  COLLEGE COMPARISON PDF
// ════════════════════════════════════════════════════════════════

function buildCollegeReport(doc: jsPDF, data: any, pageW: number, pageH: number) {
  let y = addHeader(doc, 'College Comparison Report', 'Cross-college performance benchmarking', pageW);
  const colleges: any[] = data.colleges || [];
  const summary = data.summary || {};

  // ── KPI Cards ──
  y = addSectionTitle(doc, y, 'Platform Summary', pageW);
  const cardW = (pageW - 50) / 4;
  addKpiCard(doc, 15, y, cardW, 34, 'Total Colleges', String(summary.totalColleges || colleges.length), COLORS.primary);
  addKpiCard(doc, 20 + cardW, y, cardW, 34, 'Total Students', String(summary.totalStudents || colleges.reduce((s: number, c: any) => s + (c.studentCount || 0), 0)), COLORS.info);
  addKpiCard(doc, 25 + cardW * 2, y, cardW, 34, 'Avg Completion', `${(summary.avgCompletionRate || 0).toFixed(1)}%`, COLORS.success);
  addKpiCard(doc, 30 + cardW * 3, y, cardW, 34, 'Top College', summary.topCollege || (colleges[0]?.collegeName || '-'), COLORS.warning);
  y += 42;

  // ── Charts ──
  if (colleges.length > 0) {
    // Student count by college
    drawBarChart(doc, 15, y, (pageW - 35) / 2, 70,
      colleges.slice(0, 8).map((c: any, i: number) => ({
        label: (c.collegeName || c.collegeCode || 'College').substring(0, 10),
        value: c.studentCount,
        color: COLORS.chartColors[i % COLORS.chartColors.length],
      })),
      'Students per College'
    );

    // Completion rate comparison
    const chartRight = 20 + (pageW - 35) / 2;
    drawRoundedRect(doc, chartRight, y, (pageW - 35) / 2, 70, 4, COLORS.white);
    doc.setDrawColor(230, 230, 235);
    doc.roundedRect(chartRight, y, (pageW - 35) / 2, 70, 4, 4, 'S');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('Completion Rate Comparison', chartRight + 10, y + 14);

    const barW = (pageW - 35) / 2 - 30;
    const sortedByRate = [...colleges].sort((a, b) => b.completionRate - a.completionRate).slice(0, 5);
    sortedByRate.forEach((c, i) => {
      const name = c.collegeName?.length > 22 ? c.collegeName.substring(0, 20) + '..' : (c.collegeName || 'Unknown');
      drawHorizontalBar(doc, chartRight + 10, y + 24 + i * 12, barW - 14, name,
        Math.round(c.completionRate), 100,
        COLORS.chartColors[i % COLORS.chartColors.length]);
    });

    y += 78;
  }

  // ── Engagement Scores ──
  if (colleges.length > 0 && y < pageH - 90) {
    y = addSectionTitle(doc, y, 'Engagement & Accuracy Scores', pageW);

    const engagementData = colleges.slice(0, 8).map((c: any, i: number) => ({
      label: (c.collegeCode || c.collegeName || 'C').substring(0, 10),
      value: Math.round(c.engagementScore || 0),
      color: COLORS.chartColors[i % COLORS.chartColors.length],
    }));

    drawBarChart(doc, 15, y, (pageW - 35) / 2, 65, engagementData, 'Engagement Score');

    const accuracyData = colleges.slice(0, 8).map((c: any, i: number) => ({
      label: (c.collegeCode || c.collegeName || 'C').substring(0, 10),
      value: Math.round(c.avgAccuracy || 0),
      color: COLORS.chartColors[i % COLORS.chartColors.length],
    }));

    drawBarChart(doc, 20 + (pageW - 35) / 2, y, (pageW - 35) / 2, 65, accuracyData, 'Average Accuracy %');

    y += 73;
  }

  // ── Data Table ──
  if (y > pageH - 60) { doc.addPage(); y = 15; }
  y = addSectionTitle(doc, y, 'College Details', pageW);

  autoTable(doc, {
    startY: y,
    head: [['College', 'Code', 'Students', 'Faculty', 'Courses', 'Enrollments', 'Completion %', 'Accuracy %', 'Engagement']],
    body: colleges.map(c => [
      c.collegeName || 'Unknown',
      c.collegeCode || '-',
      c.studentCount,
      c.facultyCount,
      c.courseCount,
      c.totalEnrollments,
      `${c.completionRate?.toFixed(1)}%`,
      `${c.avgAccuracy?.toFixed(1)}%`,
      c.engagementScore?.toFixed(0) || '0',
    ]),
    styles: { fontSize: 7, cellPadding: 3, lineColor: [230, 230, 235], lineWidth: 0.2 },
    headStyles: { fillColor: COLORS.success, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    margin: { left: 15, right: 15 },
    theme: 'grid',
  });
}
