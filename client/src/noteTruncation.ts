export const NOTE_TRUNCATION_THRESHOLD = 40

export function truncateNote(
  note: string,
  threshold = NOTE_TRUNCATION_THRESHOLD,
): { display: string; isTruncated: boolean } {
  if (note.length <= threshold) return { display: note, isTruncated: false }
  return { display: `${note.slice(0, threshold).trimEnd()}…`, isTruncated: true }
}
