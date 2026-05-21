import TurndownService from 'turndown'
import { renderMarkdown } from '../utils/md'

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
})

// TipTap 输出 HTML，存入数据库前先转回 Markdown
export function htmlToMarkdown(html) {
  if (!html) return ''
  return turndown.turndown(html)
}

// MD → HTML 统一走 md.js 的 renderMarkdown（带 highlight.js 配置）
export { renderMarkdown as markdownToHtml }
