/** Format a number as Indonesian Rupiah */
export function formatIDR(num: number | null | undefined): string {
  if (num == null) return '-'
  return 'Rp ' + Number(num).toLocaleString('id-ID')
}

/** Format an ISO date string to Indonesian locale (e.g. "14 Mei 2026") */
export function formatDate(str: string | null | undefined): string {
  if (!str) return '-'
  const d = new Date(str)
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Resolve image URLs from Google Drive or Squarespace into a direct
 * image source URL.
 */
export function resolveImg(url: string | null | undefined): string {
  if (!url) return ''
  url = url.trim()

  if (url.includes('lh3.googleusercontent.com')) return url

  let m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (m) return 'https://lh3.googleusercontent.com/d/' + m[1] + '=s600'

  m = url.match(/drive\.google\.com\/.*[?&]id=([a-zA-Z0-9_-]+)/)
  if (m) return 'https://lh3.googleusercontent.com/d/' + m[1] + '=s600'

  m = url.match(/drive\.google\.com\/thumbnail\?id=([a-zA-Z0-9_-]+)/)
  if (m) return 'https://lh3.googleusercontent.com/d/' + m[1] + '=s600'

  if (url.includes('squarespace-cdn.com')) return url + '?format=500w'

  return url
}
