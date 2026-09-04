import { describe, expect, it } from 'vitest'
import { truncateNote } from './noteTruncation.ts'

describe('truncateNote', () => {
  it('does not truncate a note whose length equals the threshold', () => {
    const note = 'a'.repeat(40)
    expect(truncateNote(note)).toEqual({ display: note, isTruncated: false })
  })

  it('truncates to the threshold and appends an ellipsis when the note exceeds it', () => {
    const note = `${'a'.repeat(40)}bcdef`
    expect(truncateNote(note)).toEqual({ display: `${'a'.repeat(40)}…`, isTruncated: true })
  })

  it('trims trailing whitespace at the cut point before appending the ellipsis', () => {
    const note = `${'a'.repeat(38)}  bcdef`
    expect(truncateNote(note)).toEqual({ display: `${'a'.repeat(38)}…`, isTruncated: true })
  })
})
