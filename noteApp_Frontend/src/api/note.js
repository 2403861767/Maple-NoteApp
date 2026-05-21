import axios from 'axios'
import { ElMessage } from 'element-plus'
import request from './index'
import { renderMarkdown } from '../utils/md'

export const queryNotes = (data) => request.post('/note/query', data)
export const createNote = (data) => request.post('/note/create', data)
export const getNoteDetail = (id) => request.get(`/note/detail/${id}`)
export const updateNote = (data) => request.post('/note/update', data)
export const deleteNote = (id) => request.post(`/note/delete/${id}`)
export const getNoteTags = (noteId) => request.get(`/note/${noteId}/tags`)
export const setNoteTags = (noteId, tagIds) => request.post(`/note/${noteId}/tags`, tagIds)
export const getBatchNoteTags = (noteIds) => {
  const query = noteIds.map(id => `ids=${id}`).join('&')
  return request.get(`/note/tags/batch?${query}`)
}

// 上传 Markdown 文件
export const uploadNote = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/note/upload', formData)
}

// 上传笔记内嵌图片
export const uploadNoteImage = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/note/image/upload', formData)
}

// 导出笔记为 PDF（通过浏览器打印）
export const exportNotePdf = async (id, title) => {
  const res = await getNoteDetail(id)
  const note = res.data
  const contentHtml = renderMarkdown(note.content || '')

  const printHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { margin: 20mm; size: A4; }
    body {
      font-family: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
      line-height: 1.8; color: #1a1a1a; max-width: 100%;
    }
    h1 { font-size: 1.8em; border-bottom: 2px solid #0D9488; padding-bottom: 0.3em; color: #0D9488; }
    h2 { font-size: 1.4em; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.2em; }
    h3 { font-size: 1.2em; }
    pre { background: #f5f5f5; padding: 12px 16px; border-radius: 4px; overflow-x: auto; font-size: 0.9em; }
    code { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.9em; background: #f5f5f5; padding: 2px 4px; border-radius: 2px; }
    pre code { background: transparent; padding: 0; }
    blockquote { border-left: 4px solid #0D9488; margin: 1em 0; padding: 8px 16px; background: #f0fdfa; color: #555; }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f0fdfa; font-weight: 600; }
    a { color: #0D9488; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${contentHtml}
</body>
</html>`

  const blob = new Blob([printHtml], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const printWindow = window.open(url, '_blank', 'width=800,height=600')
  if (printWindow) {
    printWindow.addEventListener('load', () => {
      setTimeout(() => { printWindow.print() }, 300)
    }, { once: true })
    const checkClosed = setInterval(() => {
      if (printWindow.closed) {
        clearInterval(checkClosed)
        URL.revokeObjectURL(url)
      }
    }, 500)
  } else {
    URL.revokeObjectURL(url)
    ElMessage.warning('浏览器已阻止弹窗，请允许本站弹窗后重试')
  }
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

// 导出笔记为 Markdown 文件
export const exportNote = async (id, title) => {
  const token = localStorage.getItem('token')
  try {
    const response = await axios.get(`/api/note/${id}/export`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = `${title}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (e) {
    // 尝试从 blob 响应中提取错误信息
    if (e.response?.data instanceof Blob) {
      try {
        const text = await e.response.data.text()
        const err = JSON.parse(text)
        ElMessage.error(err.message || '导出失败')
        return
      } catch {}
    }
    ElMessage.error('导出失败，请稍后重试')
  }
}
