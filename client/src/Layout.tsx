import { useState } from 'react'
import BudgetSetup from './BudgetSetup.tsx'
import ExpenseLog from './ExpenseLog.tsx'
import BudgetVsActual from './BudgetVsActual.tsx'
import { pageBackgroundClassName } from './theme.ts'

type Tab = 'budgets' | 'expenses' | 'report'

interface LayoutProps {
  onLogout: () => void
}

function Layout({ onLogout }: LayoutProps) {
  const [activeTab, setActiveTab] = useState<Tab>('budgets')

  return (
    <div className={`flex ${pageBackgroundClassName}`}>
      <aside className="sticky top-0 h-screen w-56 shrink-0 overflow-y-auto border-r border-neutral-200 p-6 dark:border-neutral-700">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Loop Budget</h1>
        <p className="text-neutral-600 dark:text-neutral-400">Personal budget tracker.</p>
        <nav className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            aria-current={activeTab === 'budgets' ? 'page' : undefined}
            onClick={() => setActiveTab('budgets')}
            className="w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2
              text-left text-neutral-900 hover:bg-neutral-100 aria-[current=page]:border-rose-600
              aria-[current=page]:bg-rose-600 aria-[current=page]:text-white
              dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100
              dark:hover:bg-neutral-800 dark:aria-[current=page]:border-rose-500
              dark:aria-[current=page]:bg-rose-500"
          >
            Budgets
          </button>
          <button
            type="button"
            aria-current={activeTab === 'expenses' ? 'page' : undefined}
            onClick={() => setActiveTab('expenses')}
            className="w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2
              text-left text-neutral-900 hover:bg-neutral-100 aria-[current=page]:border-rose-600
              aria-[current=page]:bg-rose-600 aria-[current=page]:text-white
              dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100
              dark:hover:bg-neutral-800 dark:aria-[current=page]:border-rose-500
              dark:aria-[current=page]:bg-rose-500"
          >
            Expenses
          </button>
          <button
            type="button"
            aria-current={activeTab === 'report' ? 'page' : undefined}
            onClick={() => setActiveTab('report')}
            className="w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2
              text-left text-neutral-900 hover:bg-neutral-100 aria-[current=page]:border-rose-600
              aria-[current=page]:bg-rose-600 aria-[current=page]:text-white
              dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100
              dark:hover:bg-neutral-800 dark:aria-[current=page]:border-rose-500
              dark:aria-[current=page]:bg-rose-500"
          >
            Budget vs Actual
          </button>
        </nav>
      </aside>
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex justify-end border-b border-neutral-200 pb-4 dark:border-neutral-700">
            <button
              type="button"
              onClick={onLogout}
              className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2
                text-neutral-900 hover:bg-neutral-100
                dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100
                dark:hover:bg-neutral-800"
            >
              Log out
            </button>
          </div>
          <div data-testid="tab-budgets" hidden={activeTab !== 'budgets'}>
            <BudgetSetup />
          </div>
          <div data-testid="tab-expenses" hidden={activeTab !== 'expenses'}>
            <ExpenseLog />
          </div>
          <div data-testid="tab-report" hidden={activeTab !== 'report'}>
            <BudgetVsActual />
          </div>
        </div>
      </main>
    </div>
  )
}

export default Layout
