import { ReactNode, useEffect, useId, useRef } from 'react'
import { cardClassName } from './theme.ts'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

function Modal({ open, onClose, title, children }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    panelRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-6"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className={`${cardClassName} w-full max-w-md focus:outline-none`}
      >
        <h2
          id={titleId}
          className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100"
        >
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}

export default Modal
