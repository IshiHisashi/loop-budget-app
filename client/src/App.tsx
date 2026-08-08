import BudgetSetup from './BudgetSetup.tsx'
import ExpenseLog from './ExpenseLog.tsx'
import BudgetVsActual from './BudgetVsActual.tsx'

function App() {
  return (
    <main>
      <h1>Loop Budget</h1>
      <p>Personal budget tracker.</p>
      <BudgetSetup />
      <ExpenseLog />
      <BudgetVsActual />
    </main>
  )
}

export default App
