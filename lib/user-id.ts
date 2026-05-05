const KEY = 'chatbot_user_id'

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function getUserId(): string {
  if (typeof window === 'undefined') return ''

  let id = localStorage.getItem(KEY)
  if (!id) {
    id = generateId()
    localStorage.setItem(KEY, id)
    // Set as cookie so server-side routes can read it without JS
    document.cookie = `${KEY}=${id}; path=/; max-age=31536000; SameSite=Lax`
  }
  return id
}
