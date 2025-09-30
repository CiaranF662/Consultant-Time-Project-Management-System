import jsPDF from 'jspdf'
import { formatDateTime } from '@/lib/formatDate';

export interface ReportData {
  title: string
  dateRange: string
  sections: {
    title: string
    data: Array<{
      label: string
      value: string | number
      type?: 'currency' | 'percentage' | 'number' | 'text'
    }>
  }[]
  charts?: {
    title: string
    data: Array<{ name: string; value: number }>
  }[]
}

export const generatePDFReport = (reportData: ReportData): void => {
  const doc = new jsPDF()
  let yPosition = 20
  
  // Header
  doc.setFontSize(20)
  doc.setTextColor(0, 102, 204) // Primary blue
  doc.text(reportData.title, 20, yPosition)
  
  yPosition += 10
  doc.setFontSize(12)
  doc.setTextColor(128, 128, 128)
  doc.text(reportData.dateRange, 20, yPosition)
  
  yPosition += 20
  
  // Sections
  reportData.sections.forEach((section, index) => {
    // Section title
    doc.setFontSize(16)
    doc.setTextColor(51, 65, 85) // Secondary foreground
    doc.text(section.title, 20, yPosition)
    yPosition += 15
    
    // Section data
    doc.setFontSize(10)
    section.data.forEach((item) => {
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 20
      }
      
      doc.setTextColor(0, 0, 0)
      doc.text(`${item.label}:`, 25, yPosition)
      
      let formattedValue = item.value.toString()
      if (item.type === 'currency') {
        formattedValue = `$${Number(item.value).toLocaleString()}`
      } else if (item.type === 'percentage') {
        formattedValue = `${item.value}%`
      } else if (item.type === 'number') {
        formattedValue = Number(item.value).toLocaleString()
      }
      
      doc.text(formattedValue, 100, yPosition)
      yPosition += 8
    })
    
    yPosition += 10
  })
  
  // Charts summary (if any)
  if (reportData.charts && reportData.charts.length > 0) {
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 20
    }
    
    doc.setFontSize(16)
    doc.setTextColor(51, 65, 85)
    doc.text('Chart Data', 20, yPosition)
    yPosition += 15
    
    reportData.charts.forEach((chart) => {
      doc.setFontSize(14)
      doc.text(chart.title, 25, yPosition)
      yPosition += 10
      
      doc.setFontSize(10)
      chart.data.forEach((item) => {
        if (yPosition > 270) {
          doc.addPage()
          yPosition = 20
        }
        doc.text(`${item.name}: ${item.value}`, 30, yPosition)
        yPosition += 6
      })
      yPosition += 10
    })
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
  doc.text(`Generated on ${formatDateTime(new Date())} - Page ${i} of ${pageCount}`, 20, 285)
    doc.text('Jira Insight - Resource Strategy Platform', 150, 285)
  }
  
  // Download
  const filename = `${reportData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}

export const generateAllocationPDF = (allocations: any[], consultants: any[], projects: any[]): void => {
  const doc = new jsPDF()
  let yPosition = 20
  
  // Header
  doc.setFontSize(20)
  doc.setTextColor(0, 102, 204)
  doc.text('Resource Allocation Report', 20, yPosition)
  
  yPosition += 10
  doc.setFontSize(12)
  doc.setTextColor(128, 128, 128)
  doc.text(`Generated on ${formatDateTime(new Date())}`, 20, yPosition)
  
  yPosition += 20
  
  // Summary
  doc.setFontSize(14)
  doc.setTextColor(51, 65, 85)
  doc.text('Summary', 20, yPosition)
  yPosition += 10
  
  doc.setFontSize(10)
  doc.text(`Total Allocations: ${allocations.length}`, 25, yPosition)
  yPosition += 6
  doc.text(`Active Consultants: ${consultants.length}`, 25, yPosition)
  yPosition += 6
  doc.text(`Active Projects: ${projects.length}`, 25, yPosition)
  yPosition += 15
  
  // Allocations by Project
  doc.setFontSize(14)
  doc.text('Allocations by Project', 20, yPosition)
  yPosition += 10
  
  projects.forEach((project) => {
    if (yPosition > 260) {
      doc.addPage()
      yPosition = 20
    }
    
    const projectAllocations = allocations.filter(a => a.projectId === project.id)
    
    doc.setFontSize(12)
    doc.setTextColor(0, 102, 204)
    doc.text(project.name, 25, yPosition)
    yPosition += 8
    
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    projectAllocations.forEach((allocation) => {
      const consultant = consultants.find(c => c.id === allocation.consultantId)
      const consultantName = consultant?.name || 'Unknown Consultant'
      doc.text(`• ${consultantName} - ${allocation.hoursPerWeek}h/week (${allocation.roleInProject || 'Consultant'})`, 30, yPosition)
      yPosition += 6
    })
    yPosition += 5
  })
  
  // Download
  const filename = `resource_allocation_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}