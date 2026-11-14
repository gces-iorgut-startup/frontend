// Páginas exibidas com reticências: 1 … 4 5 6 … 10. Retorna números e '...'.
export function getPaginationPages(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages: (number | '...')[] = [1]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  if (start > 2) pages.push('...')
  for (let page = start; page <= end; page += 1) pages.push(page)
  if (end < totalPages - 1) pages.push('...')
  pages.push(totalPages)

  return pages
}
