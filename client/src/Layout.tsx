import { SVGProps, useState } from 'react'
import BudgetSetup from './BudgetSetup.tsx'
import ExpenseLog from './ExpenseLog.tsx'
import BudgetVsActual from './BudgetVsActual.tsx'
import { cardClassName, pageBackgroundClassName } from './theme.ts'

type Tab = 'budgets' | 'expenses' | 'report' | 'settings'

function iconProps(props: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: 'h-5 w-5 shrink-0',
    'aria-hidden': true,
    ...props,
  }
}

function WalletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps(props)}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16" cy="14" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  )
}

function ReceiptIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps(props)}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  )
}

function BarChartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  )
}

function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  )
}

interface LayoutProps {
  onLogout: () => void
}

const navItemClassName =
  'flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-neutral-700 hover:text-rose-600 aria-[current=page]:text-rose-600 aria-[current=page]:font-medium dark:text-neutral-300 dark:hover:text-rose-300 dark:aria-[current=page]:text-rose-400'

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
            className={navItemClassName}
          >
            <WalletIcon />
            Budgets
          </button>
          <button
            type="button"
            aria-current={activeTab === 'expenses' ? 'page' : undefined}
            onClick={() => setActiveTab('expenses')}
            className={navItemClassName}
          >
            <ReceiptIcon />
            Expenses
          </button>
          <button
            type="button"
            aria-current={activeTab === 'report' ? 'page' : undefined}
            onClick={() => setActiveTab('report')}
            className={navItemClassName}
          >
            <BarChartIcon />
            Budget vs Actual
          </button>
          <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-700">
            <button
              type="button"
              aria-current={activeTab === 'settings' ? 'page' : undefined}
              onClick={() => setActiveTab('settings')}
              className={navItemClassName}
            >
              <SettingsIcon />
              Settings
            </button>
          </div>
        </nav>
      </aside>
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-4xl">
          <div data-testid="tab-budgets" hidden={activeTab !== 'budgets'}>
            <BudgetSetup />
          </div>
          <div data-testid="tab-expenses" hidden={activeTab !== 'expenses'}>
            <ExpenseLog />
          </div>
          <div data-testid="tab-report" hidden={activeTab !== 'report'}>
            <BudgetVsActual />
          </div>
          <div data-testid="tab-settings" hidden={activeTab !== 'settings'}>
            <section className={cardClassName}>
              <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Settings
              </h2>
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
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Layout
