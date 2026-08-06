import React, { useState, useEffect } from 'react';
import { api, getUserRole } from '../services/api';
import { useToast } from '../components/ToastContext';
import { SkeletonBox, SkeletonCard } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { 
  FileText, 
  Cpu, 
  Loader2, 
  Trash2, 
  Download, 
  ChevronRight, 
  BookOpen,
  ArrowLeft,
  Check,
  FileCode,
  FileType,
  FileSpreadsheet,
  Globe,
  Printer,
  ChevronDown,
  Sparkles,
  FilePlus
} from 'lucide-react';

// --- MARKDOWN PARSING AND HTML FORMATTING UTILITIES ---

const escapeHtml = (text) => {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const formatInlineMarkdown = (text) => {
  if (!text) return '';
  let str = text;
  // Bold
  str = str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  str = str.replace(/__(.*?)__/g, '<strong>$1</strong>');
  // Italic
  str = str.replace(/\*(.*?)\*/g, '<em>$1</em>');
  str = str.replace(/_(.*?)_/g, '<em>$1</em>');
  // Inline code
  str = str.replace(/`(.*?)`/g, '<code style="background: rgba(99, 102, 241, 0.15); color: #818cf8; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px;">$1</code>');
  // Links [text](url) -> clean text or link
  str = str.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: var(--color-secondary); text-decoration: underline;" target="_blank" rel="noopener noreferrer">$1</a>');
  return str;
};

const parseMarkdownToHtml = (mdText) => {
  if (!mdText) return '';
  
  const lines = mdText.split('\n');
  let html = '';
  let inList = false;
  let listType = null; // 'ul' or 'ol'
  let inCodeBlock = false;
  let codeBuffer = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Code block detection
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        html += `<pre style="background: #0d1117; border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; font-family: monospace; font-size: 13px; color: #e2e8f0; overflow-x: auto; margin-bottom: 16px;"><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`;
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        if (inList) { html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false; }
        if (inTable) { html += '</tbody></table>'; inTable = false; }
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Table detection
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (inList) { html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false; }
      
      // Skip divider lines like |---|---|
      if (line.includes('---')) {
        continue;
      }

      let cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
      
      if (!inTable) {
        inTable = true;
        html += `<div style="overflow-x: auto; margin-bottom: 20px;"><table style="width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid var(--border-color);"><thead><tr style="background: rgba(99, 102, 241, 0.15); color: var(--text-main);">`;
        cells.forEach(c => {
          html += `<th style="padding: 10px 14px; border: 1px solid var(--border-color); text-align: left; font-weight: 600;">${formatInlineMarkdown(c)}</th>`;
        });
        html += `</tr></thead><tbody>`;
      } else {
        html += `<tr style="border-bottom: 1px solid var(--border-color);">`;
        cells.forEach(c => {
          html += `<td style="padding: 10px 14px; border: 1px solid var(--border-color); color: var(--text-muted);">${formatInlineMarkdown(c)}</td>`;
        });
        html += `</tr>`;
      }
      continue;
    } else if (inTable) {
      html += `</tbody></table></div>`;
      inTable = false;
    }

    // Unordered List (- or *)
    const ulMatch = line.match(/^(\s*)([-*])\s+(.*)/);
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) html += listType === 'ul' ? '</ul>' : '</ol>';
        html += '<ul style="margin-bottom: 16px; padding-left: 24px; color: var(--text-muted); display: flex; flex-direction: column; gap: 6px;">';
        inList = true;
        listType = 'ul';
      }
      html += `<li style="line-height: 1.6;"><span style="color: var(--text-main);">${formatInlineMarkdown(ulMatch[3])}</span></li>`;
      continue;
    }

    // Ordered List (1. 2. etc)
    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) html += listType === 'ul' ? '</ul>' : '</ol>';
        html += '<ol style="margin-bottom: 16px; padding-left: 24px; color: var(--text-muted); display: flex; flex-direction: column; gap: 6px;">';
        inList = true;
        listType = 'ol';
      }
      html += `<li style="line-height: 1.6;"><span style="color: var(--text-main);">${formatInlineMarkdown(olMatch[3])}</span></li>`;
      continue;
    }

    // Close list if line is not a list item
    if (inList) {
      html += listType === 'ul' ? '</ul>' : '</ol>';
      inList = false;
    }

    // Headers
    if (line.startsWith('# ')) {
      html += `<h1 style="font-size: 24px; font-weight: 700; color: var(--text-main); margin-top: 24px; margin-bottom: 16px; border-bottom: 2px solid var(--color-primary); padding-bottom: 8px;">${formatInlineMarkdown(line.substring(2))}</h1>`;
    } else if (line.startsWith('## ')) {
      html += `<h2 style="font-size: 19px; font-weight: 600; color: var(--color-secondary); margin-top: 20px; margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">${formatInlineMarkdown(line.substring(3))}</h2>`;
    } else if (line.startsWith('### ')) {
      html += `<h3 style="font-size: 16px; font-weight: 600; color: var(--text-main); margin-top: 16px; margin-bottom: 8px;">${formatInlineMarkdown(line.substring(4))}</h3>`;
    } else if (line.startsWith('#### ')) {
      html += `<h4 style="font-size: 14px; font-weight: 600; color: var(--text-muted); margin-top: 12px; margin-bottom: 6px;">${formatInlineMarkdown(line.substring(5))}</h4>`;
    } else if (line.startsWith('> ')) {
      html += `<blockquote style="border-left: 3px solid var(--color-primary); background: rgba(99, 102, 241, 0.06); padding: 12px 16px; margin-bottom: 16px; border-radius: 0 8px 8px 0; color: var(--text-muted); font-style: italic;">${formatInlineMarkdown(line.substring(2))}</blockquote>`;
    } else if (line.trim() === '---' || line.trim() === '***') {
      html += `<hr style="border: none; border-top: 1px solid var(--border-color); margin: 24px 0;" />`;
    } else if (line.trim().length > 0) {
      html += `<p style="margin-bottom: 12px; line-height: 1.7; color: var(--text-main); font-size: 14px;">${formatInlineMarkdown(line)}</p>`;
    }
  }

  if (inList) html += listType === 'ul' ? '</ul>' : '</ol>';
  if (inTable) html += '</tbody></table></div>';

  return html;
};

// Convert Markdown to clean plain text
const convertMarkdownToPlainText = (mdText) => {
  if (!mdText) return '';
  let str = mdText;
  str = str.replace(/^#{1,6}\s+/gm, '');
  str = str.replace(/\*\*(.*?)\*\*/g, '$1');
  str = str.replace(/\*(.*?)\*/g, '$1');
  str = str.replace(/__(.*?)__/g, '$1');
  str = str.replace(/_(.*?)_/g, '$1');
  str = str.replace(/`(.*?)`/g, '$1');
  str = str.replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)');
  str = str.replace(/\|/g, '  ');
  return str;
};

// Generate Standalone HTML Document
const generateStandaloneHtmlDoc = (title, docType, author, content) => {
  const parsedBody = parseMarkdownToHtml(content);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - FKIP Specification</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-main: #090d16;
      --bg-card: #0f172a;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --color-primary: #6366f1;
      --color-secondary: #06b6d4;
      --border-color: rgba(255, 255, 255, 0.1);
    }
    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-main);
      color: var(--text-main);
      margin: 0;
      padding: 40px 20px;
      line-height: 1.7;
    }
    .doc-container {
      max-width: 900px;
      margin: 0 auto;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .doc-header {
      border-bottom: 2px solid var(--color-primary);
      padding-bottom: 16px;
      margin-bottom: 32px;
    }
    .doc-title {
      font-family: 'Outfit', sans-serif;
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px 0;
      color: #ffffff;
    }
    .doc-meta {
      font-size: 13px;
      color: var(--text-muted);
    }
    h1 { font-family: 'Outfit', sans-serif; font-size: 24px; color: var(--text-main); border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-top: 32px; }
    h2 { font-family: 'Outfit', sans-serif; font-size: 20px; color: var(--color-secondary); margin-top: 24px; }
    h3 { font-family: 'Outfit', sans-serif; font-size: 16px; color: var(--text-main); margin-top: 20px; }
    p { font-size: 14px; margin-bottom: 16px; color: #cbd5e1; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    th { background: rgba(99, 102, 241, 0.2); color: var(--text-main); padding: 10px 14px; border: 1px solid var(--border-color); text-align: left; }
    td { padding: 10px 14px; border: 1px solid var(--border-color); color: var(--text-muted); }
    code, pre { font-family: monospace; background: rgba(0,0,0,0.4); padding: 12px; border-radius: 6px; border: 1px solid var(--border-color); color: #818cf8; }
    blockquote { border-left: 3px solid var(--color-primary); background: rgba(99, 102, 241, 0.08); padding: 12px 16px; margin: 16px 0; font-style: italic; }
  </style>
</head>
<body>
  <div class="doc-container">
    <div class="doc-header">
      <h1 class="doc-title">${title}</h1>
      <div class="doc-meta">
        Type: <strong>${docType.toUpperCase()}</strong> | Author: <strong>${author || 'System'}</strong> | Platform: <strong>FKIP Enterprise Suite</strong>
      </div>
    </div>
    ${parsedBody}
  </div>
</body>
</html>`;
};

// Generate Microsoft Word (.docx) HTML Blob
const generateWordDocHtml = (title, docType, author, content) => {
  const parsedBody = parseMarkdownToHtml(content);
  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset='utf-8'>
    <title>${title}</title>
    <style>
      body { font-family: 'Calibri', 'Segoe UI', sans-serif; margin: 40px; color: #1e293b; line-height: 1.6; background: #ffffff; }
      h1 { color: #1e1b4b; font-size: 24pt; border-bottom: 2pt solid #4f46e5; padding-bottom: 6pt; margin-top: 20pt; }
      h2 { color: #312e81; font-size: 16pt; margin-top: 18pt; border-bottom: 1pt solid #cbd5e1; padding-bottom: 4pt; }
      h3 { color: #4338ca; font-size: 13pt; margin-top: 14pt; }
      p { font-size: 11pt; margin-bottom: 10pt; color: #334155; }
      table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
      th { background-color: #4f46e5; color: white; padding: 8pt; font-weight: bold; text-align: left; border: 1pt solid #cbd5e1; }
      td { border: 1pt solid #cbd5e1; padding: 8pt; font-size: 10pt; color: #334155; }
      tr:nth-child(even) td { background-color: #f8fafc; }
      code, pre { font-family: 'Consolas', monospace; background: #f1f5f9; padding: 4pt; font-size: 9.5pt; border-radius: 4pt; }
      blockquote { border-left: 3pt solid #6366f1; padding-left: 10pt; color: #475569; font-style: italic; background: #f8fafc; margin: 10pt 0; }
      ul, ol { margin-bottom: 10pt; padding-left: 20pt; }
      li { font-size: 11pt; margin-bottom: 4pt; }
    </style>
  </head>
  <body>
    <div style="border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 24px;">
      <h1 style="margin: 0; color: #1e1b4b;">${title}</h1>
      <p style="font-size: 10pt; color: #64748b; margin-top: 4pt;">
        <strong>Document Type:</strong> ${docType.toUpperCase()} | <strong>Author:</strong> ${author || 'System'} | <strong>Generated via FKIP Enterprise Suite</strong>
      </p>
    </div>
    ${parsedBody}
  </body>
  </html>`;
};

// Generate PDF Print Window HTML
const generatePdfPrintHtml = (title, docType, author, content) => {
  const parsedBody = parseMarkdownToHtml(content);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} - PDF Document</title>
  <style>
    @page { size: letter; margin: 20mm; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; line-height: 1.6; background: #fff; padding: 20px; }
    .header { border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 24px; }
    h1 { color: #1e1b4b; font-size: 24px; margin: 0 0 6px 0; }
    .meta { font-size: 12px; color: #64748b; }
    h2 { color: #312e81; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 24px; }
    h3 { color: #4338ca; font-size: 15px; margin-top: 18px; }
    p { font-size: 13px; color: #334155; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
    th { background: #4f46e5; color: #fff; padding: 8px 12px; border: 1px solid #cbd5e1; text-align: left; }
    td { border: 1px solid #cbd5e1; padding: 8px 12px; color: #334155; }
    tr:nth-child(even) td { background: #f8fafc; }
    code, pre { font-family: monospace; background: #f1f5f9; padding: 8px; border-radius: 4px; font-size: 11px; }
    blockquote { border-left: 3px solid #6366f1; padding-left: 12px; color: #475569; font-style: italic; background: #f8fafc; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <div class="meta">Document Type: ${docType.toUpperCase()} | Author: ${author || 'System'} | FKIP Enterprise Suite</div>
  </div>
  ${parsedBody}
</body>
</html>`;
};


export default function DocGenerator() {
  const [docList, setDocList] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [selectedDocContent, setSelectedDocContent] = useState(null);
  const [docType, setDocType] = useState('BRD');
  const [docTitle, setDocTitle] = useState('Project BRD Spec');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const userRole = getUserRole() || 'CONSUMER';
  const toast = useToast();

  const loadDocList = async () => {
    try {
      setIsLoadingList(true);
      const data = await api.get('/docs');
      setDocList(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch generated specs registry.');
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadDocList();
  }, []);

  const handleGenerate = async () => {
    if (!docTitle.trim()) {
      toast.warning('Please provide a document title.');
      return;
    }

    if (userRole === 'CONSUMER') {
      toast.error('Viewer accounts cannot trigger AI doc generation.');
      return;
    }

    setIsGenerating(true);

    try {
      const res = await api.post('/docs/generate', { doc_type: docType, title: docTitle });
      setDocList([res, ...docList]);
      toast.success(`Successfully drafted ${docType} "${docTitle}".`);
      setSelectedDocId(res.id);
      setSelectedDocContent(res);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Auto-draft generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectDoc = async (id) => {
    setSelectedDocId(id);
    setIsLoadingDetail(true);
    setError('');
    setIsExportMenuOpen(false);
    
    try {
      const data = await api.get(`/docs/${id}`);
      setSelectedDocContent(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load document content.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleDeleteDoc = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/docs/${id}`);
      const updated = docList.filter(d => d.id !== id);
      setDocList(updated);
      if (selectedDocId === id) {
        setSelectedDocId(null);
        setSelectedDocContent(null);
      }
      setSuccess('Document purged from database.');
    } catch (err) {
      console.error(err);
      setError('Failed to delete document.');
    }
  };

  // Helper helper to trigger download blob
  const downloadBlob = (blob, filename) => {
    const element = document.createElement("a");
    element.href = URL.createObjectURL(blob);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Multi-format Export Handler
  const handleExportFormat = (format) => {
    if (!selectedDocContent) return;
    setIsExportMenuOpen(false);
    
    const doc = selectedDocContent;
    const filename = `${doc.title.replace(/\s+/g, '_').toLowerCase()}`;

    if (format === 'md') {
      const file = new Blob([doc.content], { type: 'text/markdown;charset=utf-8' });
      downloadBlob(file, `${filename}.md`);
    } else if (format === 'txt') {
      const cleanText = convertMarkdownToPlainText(doc.content);
      const file = new Blob([cleanText], { type: 'text/plain;charset=utf-8' });
      downloadBlob(file, `${filename}.txt`);
    } else if (format === 'html') {
      const fullHtml = generateStandaloneHtmlDoc(doc.title, doc.doc_type, doc.author, doc.content);
      const file = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      downloadBlob(file, `${filename}.html`);
    } else if (format === 'docx') {
      const docxHtml = generateWordDocHtml(doc.title, doc.doc_type, doc.author, doc.content);
      const file = new Blob([docxHtml], { type: 'application/msword;charset=utf-8' });
      downloadBlob(file, `${filename}.docx`);
    } else if (format === 'pdf') {
      const pdfHtml = generatePdfPrintHtml(doc.title, doc.doc_type, doc.author, doc.content);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(pdfHtml);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>AI Documentation Generator</h1>
        <p style={{ color: 'var(--text-muted)' }}>Generate context-aware software specifications, business requirements, and manuals drafted using local LLM algorithms.</p>
      </div>

      {error && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: 'rgba(239, 68, 68, 0.1)', 
          color: 'var(--status-failed)', 
          padding: '16px', 
          borderRadius: '8px',
          marginBottom: '32px',
          fontSize: '14px',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 2s linear infinite', marginRight: '6px' }} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: 'rgba(16, 185, 129, 0.1)', 
          color: 'var(--status-completed)', 
          padding: '16px', 
          borderRadius: '8px',
          marginBottom: '32px',
          fontSize: '14px',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}>
          <Check size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '32px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Generation Form & Archive Registry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Form Card */}
          <div className="card">
            <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Draft New Specification</span>
            </h3>

            <div className="form-group">
              <label className="form-label">Template Type</label>
              <select 
                value={docType} 
                onChange={(e) => {
                  setDocType(e.target.value);
                  const names = {
                    'BRD': 'Project BRD Spec',
                    'SRS': 'System SRS Spec',
                    'TECH_DESIGN': 'Technical Design Blueprint',
                    'API_DOCS': 'API Integration Reference',
                    'RELEASE_NOTES': 'Release Notes Summary',
                    'USER_MANUAL': 'End-User System Manual'
                  };
                  setDocTitle(names[e.target.value] || 'Spec draft');
                }}
                className="form-select"
              >
                <option value="BRD">Business Requirement Document (BRD)</option>
                <option value="SRS">Software Requirement Specification (SRS)</option>
                <option value="TECH_DESIGN">Technical Design Document</option>
                <option value="API_DOCS">API Documentation</option>
                <option value="RELEASE_NOTES">Release Notes</option>
                <option value="USER_MANUAL">User Manual</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Document Title</label>
              <input 
                type="text" 
                className="form-input" 
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Title name..."
              />
            </div>

            {userRole === 'CONSUMER' ? (
              <p style={{ color: 'var(--status-failed)', fontSize: '12px' }}>Viewer roles cannot generate documents.</p>
            ) : (
              <button 
                onClick={handleGenerate}
                className="btn btn-primary btn-full"
                disabled={isGenerating}
                style={{ gap: '8px' }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Ollama is drafting (approx 15s)...</span>
                  </>
                ) : (
                  <>
                    <FileText size={16} />
                    <span>Generate AI Document</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Registry Archive Card */}
          <div className="card">
            <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} style={{ color: 'var(--color-secondary)' }} />
              <span>Specs Archive</span>
            </h3>

            {isLoadingList ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading registry...</p>
            ) : docList.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>No documents generated yet. Use form above.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {docList.map(doc => (
                  <div 
                    key={doc.id}
                    onClick={() => handleSelectDoc(doc.id)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: selectedDocId === doc.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                      border: selectedDocId === doc.id ? '1px solid var(--color-primary)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                    className="spec-item"
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '170px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.title}>
                        {doc.title}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {doc.doc_type.toUpperCase()} • {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <button 
                      onClick={(e) => handleDeleteDoc(doc.id, e)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-dark)', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.target.style.color = 'var(--status-failed)'}
                      onMouseLeave={(e) => e.target.style.color = 'var(--text-dark)'}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Professional Rich Text Document View & Export Dropdown */}
        <div className="card" style={{ minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
          {!selectedDocId ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)', padding: '100px 0' }}>
              <FileText size={64} style={{ opacity: 0.1, marginBottom: '16px' }} />
              <p>Select a specification file from the specs archive to preview contents.</p>
            </div>
          ) : isLoadingDetail ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Loader2 size={40} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
            </div>
          ) : selectedDocContent ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              
              {/* Document Header & Multi-format Export Control */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{selectedDocContent.title}</h2>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Type: {selectedDocContent.doc_type.toUpperCase()} • Author: {selectedDocContent.author || 'system'}
                  </span>
                </div>

                {/* Dropdown Action Menu for Export Formats */}
                <div style={{ position: 'relative' }}>
                  <button 
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                    className="btn btn-primary" 
                    style={{ gap: '8px', padding: '8px 16px', fontSize: '13px' }}
                  >
                    <Download size={14} />
                    <span>Export & Download</span>
                    <ChevronDown size={14} />
                  </button>

                  {isExportMenuOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '6px',
                      background: 'var(--bg-sidebar)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                      zIndex: 100,
                      padding: '6px',
                      minWidth: '210px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <button 
                        onClick={() => handleExportFormat('pdf')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-main)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        <Printer size={15} style={{ color: '#ef4444' }} />
                        <span>PDF Document (.pdf)</span>
                      </button>

                      <button 
                        onClick={() => handleExportFormat('docx')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-main)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        <FileSpreadsheet size={15} style={{ color: '#3b82f6' }} />
                        <span>Microsoft Word (.docx)</span>
                      </button>

                      <button 
                        onClick={() => handleExportFormat('txt')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-main)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        <FileType size={15} style={{ color: '#94a3b8' }} />
                        <span>Plain Text (.txt)</span>
                      </button>

                      <button 
                        onClick={() => handleExportFormat('md')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-main)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        <FileCode size={15} style={{ color: '#6366f1' }} />
                        <span>Markdown (.md)</span>
                      </button>

                      <button 
                        onClick={() => handleExportFormat('html')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-main)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        <Globe size={15} style={{ color: '#06b6d4' }} />
                        <span>Web Webpage (.html)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Styled Rich Text Document Viewport (No raw markdown syntax symbols) */}
              <div 
                style={{ 
                  flex: 1, 
                  maxHeight: '620px', 
                  overflowY: 'auto', 
                  background: 'rgba(15, 23, 42, 0.6)', 
                  padding: '32px', 
                  borderRadius: '10px', 
                  border: '1px solid var(--border-color)',
                  color: '#f8fafc',
                  lineHeight: '1.7',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)'
                }}
              >
                {/* Embedded Document Header Banner */}
                <div style={{ 
                  background: 'rgba(99, 102, 241, 0.1)', 
                  border: '1px solid rgba(99, 102, 241, 0.2)', 
                  borderRadius: '8px', 
                  padding: '16px 20px', 
                  marginBottom: '28px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', tracking: '0.05em', color: 'var(--color-primary)', fontWeight: 700 }}>
                      Official Specification Draft
                    </span>
                    <h2 style={{ fontSize: '20px', margin: '4px 0 0 0', color: '#ffffff' }}>
                      {selectedDocContent.title}
                    </h2>
                  </div>
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: 600, 
                    padding: '4px 10px', 
                    borderRadius: '12px', 
                    background: 'rgba(6, 182, 212, 0.15)', 
                    color: 'var(--color-secondary)' 
                  }}>
                    {selectedDocContent.doc_type.toUpperCase()}
                  </span>
                </div>

                {/* Parsed & Formatted HTML Output */}
                <div 
                  dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(selectedDocContent.content) }}
                />
              </div>

            </div>
          ) : null}
        </div>

      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
