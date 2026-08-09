import { useState } from 'react'
import BudgetSetup from './BudgetSetup.tsx'
import ExpenseLog from './ExpenseLog.tsx'
import BudgetVsActual from './BudgetVsActual.tsx'

type Tab = 'budgets' | 'expenses' | 'report'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('budgets')

  return (
    <>
      <header>
        <h1>Loop Budget</h1>
        <p>Personal budget tracker.</p>
        <nav>
          <button
            type="button"
            aria-current={activeTab === 'budgets' ? 'page' : undefined}
            onClick={() => setActiveTab('budgets')}
          >
            Budgets
          </button>
          <button
            type="button"
            aria-current={activeTab === 'expenses' ? 'page' : undefined}
            onClick={() => setActiveTab('expenses')}
          >
            Expenses
          </button>
          <button
            type="button"
            aria-current={activeTab === 'report' ? 'page' : undefined}
            onClick={() => setActiveTab('report')}
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
    </>
  )
}

export default App
