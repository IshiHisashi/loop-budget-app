import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Modal from './Modal.tsx'

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Add expense">
        <p>Content</p>
      </Modal>
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('renders the title and children with role="dialog" when open', () => {
    render(
      <Modal open onClose={vi.fn()} title="Add expense">
        <p>Content</p>
      </Modal>
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('Add expense')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal open onClose={onClose} title="Add expense">
        <p>Content</p>
      </Modal>
    )

    fireEvent.click(container.firstChild as Element)

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not call onClose when the panel itself is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Add expense">
        <p>Content</p>
      </Modal>
    )

    fireEvent.click(screen.getByRole('dialog'))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Add expense">
        <p>Content</p>
      </Modal>
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledOnce()
  })
})
