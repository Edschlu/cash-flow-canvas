import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface MemoSection {
  key: string;
  label: string;
  content: string;
}

/**
 * Export memo to PDF
 */
export async function exportMemoPDF(
  businessCaseName: string,
  sections: MemoSection[],
  filename: string = 'strategiedokument.pdf'
) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Strategiedokument', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(businessCaseName, margin, yPosition);
  yPosition += 15;

  // Sections
  sections.forEach((section) => {
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = margin;
    }

    // Section title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(section.label, margin, yPosition);
    yPosition += 8;

    // Section content
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    const content = section.content || 'Noch kein Inhalt vorhanden';
    const lines = pdf.splitTextToSize(content, maxWidth);
    
    lines.forEach((line: string) => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(line, margin, yPosition);
      yPosition += 6;
    });

    yPosition += 10;
  });

  pdf.save(filename);
}

/**
 * Export scenario comparison charts to PDF
 */
export async function exportScenarioChartsPDF(
  chartContainerIds: string[],
  businessCaseName: string,
  filename: string = 'szenario-vergleich.pdf'
) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;

  // Title page
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Szenario-Vergleich', margin, 20);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(businessCaseName, margin, 30);

  let isFirstChart = true;

  for (const containerId of chartContainerIds) {
    const element = document.getElementById(containerId);
    if (!element) continue;

    if (!isFirstChart) {
      pdf.addPage();
    }
    isFirstChart = false;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', margin, isFirstChart ? 40 : 20, imgWidth, imgHeight);
    } catch (error) {
      console.error('Error capturing chart:', error);
    }
  }

  pdf.save(filename);
}
