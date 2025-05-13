import { jsPDF } from "jspdf";

export interface PDFExportOptions {
  title: string;
  content: string;
  translatedContent?: string;
  targetLanguage?: string;
  evaluation?: {
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  };
}

export function exportToPDF(options: PDFExportOptions): void {
  const { title, content, translatedContent, targetLanguage, evaluation } =
    options;

  // Create a new PDF document
  const doc = new jsPDF();

  // Set font size and add title
  doc.setFontSize(18);
  doc.text(title, 20, 20);

  // Add date
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);

  // Add original content
  doc.setFontSize(12);
  doc.text("Cover Letter:", 20, 40);

  // Split the content into lines to fit the page width
  const contentLines = doc.splitTextToSize(content, 170);
  doc.setFontSize(10);
  doc.text(contentLines, 20, 50);

  let yPosition = 50 + contentLines.length * 5;

  // Add translated content if available
  if (translatedContent && targetLanguage) {
    yPosition += 10;
    doc.setFontSize(12);
    doc.text(`Translated Version (${targetLanguage}):`, 20, yPosition);

    const translatedLines = doc.splitTextToSize(translatedContent, 170);
    doc.setFontSize(10);
    doc.text(translatedLines, 20, yPosition + 10);

    yPosition += 10 + translatedLines.length * 5;
  }

  // Add evaluation if available
  if (evaluation) {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    yPosition += 10;
    doc.setFontSize(12);
    doc.text("Evaluation:", 20, yPosition);

    yPosition += 10;
    doc.setFontSize(10);
    doc.text(`Score: ${evaluation.score}/100`, 20, yPosition);

    yPosition += 10;
    const feedbackLines = doc.splitTextToSize(
      `Feedback: ${evaluation.feedback}`,
      170,
    );
    doc.text(feedbackLines, 20, yPosition);

    yPosition += feedbackLines.length * 5 + 10;
    doc.text("Strengths:", 20, yPosition);

    yPosition += 5;
    evaluation.strengths.forEach((strength, index) => {
      yPosition += 5;
      doc.text(`• ${strength}`, 25, yPosition);
    });

    yPosition += 10;
    doc.text("Areas for Improvement:", 20, yPosition);

    yPosition += 5;
    evaluation.improvements.forEach((improvement, index) => {
      yPosition += 5;
      doc.text(`• ${improvement}`, 25, yPosition);
    });
  }

  // Save the PDF
  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}
