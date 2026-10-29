export function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
