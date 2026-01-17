/**
 * downloadUtils.ts
 *
 * 코스 빌더 콘텐츠 다운로드 유틸리티 함수
 * JSON, Markdown, Word, PDF, PPTX 등 다양한 형식으로 내보내기 지원
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';

type ContentType = 'lesson_plan' | 'slides' | 'hands_on_activity' | 'assessment' | 'supplementary_materials' | 'discussion_prompts' | 'instructor_notes' | 'infographic';

interface GeneratedContent {
  contentType: string;
  content: any;
  markdown?: string;
}

/**
 * JSON 형식으로 다운로드
 */
export const downloadAsJSON = (content: GeneratedContent, filename: string) => {
  const dataStr = JSON.stringify(content.content, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Markdown 형식으로 다운로드
 */
export const downloadAsMarkdown = (content: GeneratedContent, filename: string, contentType: ContentType) => {
  let markdown = '';

  if (content.markdown) {
    markdown = content.markdown;
  } else {
    // JSON 콘텐츠를 Markdown으로 변환
    markdown = convertContentToMarkdown(content.content, contentType);
  }

  const dataBlob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * 텍스트 형식으로 다운로드
 */
export const downloadAsText = (content: GeneratedContent, filename: string, contentType: ContentType) => {
  const text = convertContentToText(content.content, contentType);
  const dataBlob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Word (.docx) 형식으로 다운로드
 */
export const downloadAsWord = async (content: GeneratedContent, filename: string, contentType: ContentType) => {
  try {
    const markdown = content.markdown || convertContentToMarkdown(content.content, contentType);
    const paragraphs = markdownToWordParagraphs(markdown);

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs,
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${filename}.docx`);
  } catch (error) {
    console.error('Word 다운로드 실패:', error);
    throw new Error('Word 파일 생성에 실패했습니다.');
  }
};

/**
 * PDF 형식으로 다운로드
 */
export const downloadAsPDF = (content: GeneratedContent, filename: string, contentType: ContentType) => {
  try {
    const markdown = content.markdown || convertContentToMarkdown(content.content, contentType);
    const pdf = new jsPDF();

    // 한글 폰트 문제로 인해 간단한 텍스트로 변환
    const text = markdown
      .replace(/^#+\s+(.+)$/gm, '$1\n') // 헤딩
      .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
      .replace(/\*(.+?)\*/g, '$1') // Italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // 링크

    // 텍스트를 PDF에 추가 (한글 지원을 위해 splitTextToSize 사용)
    const lines = pdf.splitTextToSize(text, 180);
    let y = 20;

    lines.forEach((line: string) => {
      if (y > 280) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(line, 15, y);
      y += 7;
    });

    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('PDF 다운로드 실패:', error);
    throw new Error('PDF 파일 생성에 실패했습니다.');
  }
};

/**
 * 모든 콘텐츠를 ZIP으로 다운로드
 */
export const downloadAllAsZip = async (
  contents: Record<ContentType, GeneratedContent | null>,
  lessonTitle: string
) => {
  // JSZip 라이브러리를 동적으로 import (필요 시 설치: npm install jszip)
  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    Object.entries(contents).forEach(([type, content]) => {
      if (content) {
        const contentType = type as ContentType;
        const filename = getContentTypeLabel(contentType);

        // JSON 파일 추가
        zip.file(`${filename}.json`, JSON.stringify(content.content, null, 2));

        // Markdown 파일 추가
        const markdown = content.markdown || convertContentToMarkdown(content.content, contentType);
        zip.file(`${filename}.md`, markdown);
      }
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${lessonTitle}-contents.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('ZIP 다운로드 실패:', error);
    throw new Error('ZIP 다운로드에 실패했습니다. jszip 라이브러리를 설치해주세요.');
  }
};

/**
 * 슬라이드를 PowerPoint 형식으로 변환 (간단한 텍스트 기반)
 * 실제 PPTX 생성은 서버 사이드에서 처리하는 것이 좋습니다
 */
export const downloadSlidesAsPPTX = (content: any, filename: string) => {
  // pptxgenjs 라이브러리를 사용한 PPTX 생성
  // 여기서는 간단히 구현하지 않고, 서버 API를 호출하거나
  // 별도 라이브러리를 설치하여 구현할 수 있습니다
  console.warn('PPTX 다운로드는 추후 구현 예정입니다.');

  // 임시로 Markdown으로 다운로드
  const markdown = convertSlidesToMarkdown(content);
  const dataBlob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_slides.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * JSON 콘텐츠를 Markdown으로 변환
 */
function convertContentToMarkdown(data: any, contentType: ContentType): string {
  let markdown = '';

  switch (contentType) {
    case 'slides':
      markdown = convertSlidesToMarkdown(data);
      break;
    case 'assessment':
      markdown = convertAssessmentToMarkdown(data);
      break;
    case 'hands_on_activity':
      markdown = convertHandsOnToMarkdown(data);
      break;
    case 'lesson_plan':
      markdown = convertLessonPlanToMarkdown(data);
      break;
    case 'supplementary_materials':
      markdown = convertSupplementaryToMarkdown(data);
      break;
    case 'discussion_prompts':
      markdown = convertDiscussionToMarkdown(data);
      break;
    case 'instructor_notes':
      markdown = convertInstructorNotesToMarkdown(data);
      break;
    default:
      markdown = `# ${contentType}\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
  }

  return markdown;
}

/**
 * JSON 콘텐츠를 일반 텍스트로 변환
 */
function convertContentToText(data: any, contentType: ContentType): string {
  // Markdown을 생성한 후 마크다운 기호 제거
  const markdown = convertContentToMarkdown(data, contentType);
  return markdown
    .replace(/^#+\s+/gm, '') // 헤딩 제거
    .replace(/\*\*/g, '') // Bold 제거
    .replace(/\*/g, '') // Italic 제거
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 링크 제거
    .replace(/`([^`]+)`/g, '$1'); // 인라인 코드 제거
}

/**
 * 슬라이드를 Markdown으로 변환
 */
function convertSlidesToMarkdown(data: any): string {
  let markdown = `# ${data.deckTitle || '슬라이드'}\n\n`;

  if (data.slides && Array.isArray(data.slides)) {
    data.slides.forEach((slide: any, index: number) => {
      markdown += `## 슬라이드 ${slide.slideNumber || index + 1}: ${slide.title}\n\n`;

      if (slide.bulletPoints && Array.isArray(slide.bulletPoints)) {
        slide.bulletPoints.forEach((point: string) => {
          markdown += `- ${point}\n`;
        });
      }

      if (slide.speakerNotes) {
        markdown += `\n**발표자 노트:**\n${slide.speakerNotes}\n`;
      }

      markdown += '\n---\n\n';
    });
  }

  return markdown;
}

/**
 * 평가를 Markdown으로 변환
 */
function convertAssessmentToMarkdown(data: any): string {
  let markdown = `# ${data.title || '평가'}\n\n`;

  if (data.items && Array.isArray(data.items)) {
    data.items.forEach((item: any, index: number) => {
      markdown += `## 문제 ${item.questionNumber || index + 1}\n\n`;
      markdown += `**난이도:** ${item.difficulty || 'N/A'} | **배점:** ${item.points || 0}점\n\n`;
      markdown += `${item.question}\n\n`;

      if (item.options && Array.isArray(item.options)) {
        item.options.forEach((option: string, idx: number) => {
          const isCorrect = option === item.correctAnswer ? ' ✓' : '';
          markdown += `${idx + 1}. ${option}${isCorrect}\n`;
        });
      }

      if (item.explanation) {
        markdown += `\n**해설:** ${item.explanation}\n`;
      }

      markdown += '\n---\n\n';
    });
  }

  return markdown;
}

/**
 * 실습 활동을 Markdown으로 변환
 */
function convertHandsOnToMarkdown(data: any): string {
  let markdown = `# ${data.labTitle || '실습 가이드'}\n\n`;
  markdown += `**예상 시간:** ${data.estimatedTime || 'N/A'}\n\n`;

  if (data.steps && Array.isArray(data.steps)) {
    data.steps.forEach((step: any, index: number) => {
      markdown += `## 단계 ${step.stepNumber || index + 1}: ${step.title}\n\n`;
      markdown += `${step.instruction}\n\n`;

      if (step.code) {
        markdown += `\`\`\`\n${step.code}\n\`\`\`\n\n`;
      }

      if (step.expectedOutput) {
        markdown += `**예상 결과:** ${step.expectedOutput}\n\n`;
      }
    });
  }

  return markdown;
}

/**
 * 레슨 플랜을 Markdown으로 변환
 */
function convertLessonPlanToMarkdown(data: any): string {
  let markdown = `# ${data.title || '레슨 플랜'}\n\n`;

  if (data.objectives) {
    markdown += `## 학습 목표\n\n`;
    if (Array.isArray(data.objectives)) {
      data.objectives.forEach((obj: string) => {
        markdown += `- ${obj}\n`;
      });
    }
    markdown += '\n';
  }

  if (data.activities) {
    markdown += `## 학습 활동\n\n`;
    if (Array.isArray(data.activities)) {
      data.activities.forEach((activity: any, index: number) => {
        markdown += `### ${index + 1}. ${activity.name || '활동'}\n`;
        markdown += `**시간:** ${activity.duration || 'N/A'}\n\n`;
        markdown += `${activity.description}\n\n`;
      });
    }
  }

  return markdown;
}

/**
 * 보충 자료를 Markdown으로 변환
 */
function convertSupplementaryToMarkdown(data: any): string {
  let markdown = `# 보충 자료\n\n`;

  if (data.resources && Array.isArray(data.resources)) {
    data.resources.forEach((resource: any) => {
      markdown += `## ${resource.title || '자료'}\n\n`;
      markdown += `${resource.description || ''}\n\n`;
      if (resource.link) {
        markdown += `[링크](${resource.link})\n\n`;
      }
    });
  }

  return markdown;
}

/**
 * 토론 주제를 Markdown으로 변환
 */
function convertDiscussionToMarkdown(data: any): string {
  let markdown = `# 토론 주제\n\n`;

  if (data.prompts && Array.isArray(data.prompts)) {
    data.prompts.forEach((prompt: any, index: number) => {
      markdown += `## ${index + 1}. ${prompt.question || '질문'}\n\n`;
      markdown += `${prompt.context || ''}\n\n`;
    });
  }

  return markdown;
}

/**
 * 강사 노트를 Markdown으로 변환
 */
function convertInstructorNotesToMarkdown(data: any): string {
  let markdown = `# 강사 노트\n\n`;

  if (data.tips && Array.isArray(data.tips)) {
    markdown += `## 티칭 팁\n\n`;
    data.tips.forEach((tip: string) => {
      markdown += `- ${tip}\n`;
    });
    markdown += '\n';
  }

  if (data.faqs && Array.isArray(data.faqs)) {
    markdown += `## 자주 묻는 질문\n\n`;
    data.faqs.forEach((faq: any) => {
      markdown += `**Q:** ${faq.question}\n\n`;
      markdown += `**A:** ${faq.answer}\n\n`;
    });
  }

  return markdown;
}

/**
 * 콘텐츠 타입 레이블 가져오기
 */
function getContentTypeLabel(contentType: ContentType): string {
  const labels: Record<ContentType, string> = {
    lesson_plan: '레슨플랜',
    slides: '슬라이드',
    hands_on_activity: '실습활동',
    assessment: '평가',
    supplementary_materials: '보충자료',
    discussion_prompts: '토론주제',
    instructor_notes: '강사노트',
    infographic: '인포그래픽',
  };
  return labels[contentType] || contentType;
}

/**
 * Markdown을 Word Paragraphs로 변환
 */
function markdownToWordParagraphs(markdown: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = markdown.split('\n');

  for (const line of lines) {
    if (line.trim() === '') {
      paragraphs.push(new Paragraph({ text: '' }));
      continue;
    }

    // 헤딩 처리
    if (line.startsWith('# ')) {
      paragraphs.push(new Paragraph({
        text: line.replace(/^#\s+/, ''),
        heading: HeadingLevel.HEADING_1,
      }));
    } else if (line.startsWith('## ')) {
      paragraphs.push(new Paragraph({
        text: line.replace(/^##\s+/, ''),
        heading: HeadingLevel.HEADING_2,
      }));
    } else if (line.startsWith('### ')) {
      paragraphs.push(new Paragraph({
        text: line.replace(/^###\s+/, ''),
        heading: HeadingLevel.HEADING_3,
      }));
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // 불렛 포인트
      paragraphs.push(new Paragraph({
        text: line.replace(/^[-*]\s+/, ''),
        bullet: { level: 0 },
      }));
    } else {
      // 일반 텍스트 (Bold, Italic 처리)
      const textRuns: TextRun[] = [];
      const boldRegex = /\*\*(.+?)\*\*/g;
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          textRuns.push(new TextRun({ text: line.substring(lastIndex, match.index) }));
        }
        textRuns.push(new TextRun({ text: match[1], bold: true }));
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < line.length) {
        textRuns.push(new TextRun({ text: line.substring(lastIndex) }));
      }

      paragraphs.push(new Paragraph({ children: textRuns.length > 0 ? textRuns : [new TextRun({ text: line })] }));
    }
  }

  return paragraphs;
}
