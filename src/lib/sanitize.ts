import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'table',
  'thead', 'tbody', 'tr', 'th', 'td', 'code', 'pre', 'blockquote',
]

const ALLOWED_ATTR = ['href', 'target', 'rel', 'class', 'id']

export function sanitize(dirty: string): string {
  if (typeof window === 'undefined') {
    // Server-side: strip all HTML tags
    return dirty.replace(/<[^>]*>/g, '')
  }
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  })
}

export function sanitizeText(text: string): string {
  // For plain text contexts: escape HTML entities
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
