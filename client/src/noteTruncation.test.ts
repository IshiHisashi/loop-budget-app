import { describe, expect, it } from 'vitest'
import { NOTE_TRUNCATION_THRESHOLD, truncateNote } from './noteTruncation.ts'

describe('truncateNote', () => {
  it('does not truncate a note whose length equals the threshold', () => {
    const note = 'a'.repeat(NOTE_TRUNCATION_THRESHOLD)
    expect(truncateNote(note)).toEqual({ display: note, isTruncated: false })
  })

  it('truncates to the threshold and appends an ellipsis when the note exceeds it', () => {
    const note = `${'a'.repeat(NOTE_TRUNCATION_THRESHOLD)}bcdef`
    expect(truncateNote(note)).toEqual({
      display: `${'a'.repeat(NOTE_TRUNCATION_THRESHOLD)}…`,
      isTruncated: true,
    })
  })

  it('trims trailing whitespace at the cut point before appending the ellipsis', () => {
    const note = `${'a'.repeat(NOTE_TRUNCATION_THRESHOLD - 2)}  bcdef`
    expect(truncateNote(note)).toEqual({
      display: `${'a'.repeat(NOTE_TRUNCATION_THRESHOLD - 2)}…`,
      isTruncated: true,
    })
  })
})
