import { useState } from 'react'
import BudgetSetup from './BudgetSetup.tsx'
import ExpenseLog from './ExpenseLog.tsx'
import BudgetVsActual from './BudgetVsActual.tsx'

type Tab = 'budgets' | 'expenses' | 'report'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('budgets')

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-4xl p-6">
        <header className="mb-6 border-b border-neutral-200 pb-4 dark:border-neutral-700">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Loop Budget
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">Personal budget tracker.</p>
          <nav className="mt-4 flex gap-2">
            <button
              type="button"
              aria-current={activeTab === 'budgets' ? 'page' : undefined}
              onClick={() => setActiveTab('budgets')}
              className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2
                text-neutral-900 hover:bg-neutral-100 aria-[current=page]:border-blue-600
                aria-[current=page]:bg-blue-600 aria-[current=page]:text-white
                dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100
                dark:hover:bg-neutral-800 dark:aria-[current=page]:border-blue-500
                dark:aria-[current=page]:bg-blue-500"
            >
              Budgets
            </button>
            <button
              type="button"
              aria-current={activeTab === 'expenses' ? 'page' : undefined}
              onClick={() => setActiveTab('expenses')}
              className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2
                text-neutral-900 hover:bg-neutral-100 aria-[current=page]:border-blue-600
                aria-[current=page]:bg-blue-600 aria-[current=page]:text-white
                dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100
                dark:hover:bg-neutral-800 dark:aria-[current=page]:border-blue-500
                dark:aria-[current=page]:bg-blue-500"
            >
              Expenses
            </button>
            <button
              type="button"
              aria-current={activeTab === 'report' ? 'page' : undefined}
              onClick={() => setActiveTab('report')}
              className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2
                text-neutral-900 hover:bg-neutral-100 aria-[current=page]:border-blue-600
                aria-[current=page]:bg-blue-600 aria-[current=page]:text-white
                dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100
                dark:hover:bg-neutral-800 dark:aria-[current=page]:border-blue-500
                dark:aria-[current=page]:bg-blue-500"
            >
              Budget vs Actual
            </button>
          </nav>
        </header>
        <main>
          <div data-testid="tab-budgets" hidden={activeTab !== 'budgets'}>
            <BudgetSetup />
          </div>
          <div data-testid="tab-expenses" hidden={activeTab !== 'expenses'}>
            <ExpenseLog />
          </div>
          <div data-testid="tab-report" hidden={activeTab !== 'report'}>
            <BudgetVsActual />
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
