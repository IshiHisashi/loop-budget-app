import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// RTL's auto-cleanup relies on detecting a global `afterEach`, which
// isn't present here since vite.config.ts doesn't set `test.globals`
// (tests import from 'vitest' explicitly instead). Without this,
// renders from one test file leak into the next test, causing
// "multiple elements" ambiguity in any file with more than one test
// that queries the same labels/roles (surfaced by BudgetSetup.test.tsx
// once it grew past 2 tests).
afterEach(() => {
  cleanup()
})

// jsdom doesn't implement scrollIntoView at all — calling it throws.
// Stubbed globally so any component/test can call it without a crash.
Element.prototype.scrollIntoView = vi.fn()
