import { Activity, Blocks, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Plus, Workflow as WorkflowIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/workflows', label: 'Workflows', icon: WorkflowIcon },
  { to: '/runs', label: 'Executions', icon: Activity },
  { to: '/tools', label: 'Nodes', icon: Blocks },
]

export function Layout() {
  const { pathname } = useLocation()
  const isCanvasRoute = pathname.startsWith('/workflows/') && pathname !== '/workflows'
  const [collapsed, setCollapsed] = useState(isCanvasRoute)

  return (
    <div className="flex h-screen bg-[#18191e] text-[#e4e6eb]">
      {/* left navigation rail */}
      <aside
        className={`flex shrink-0 flex-col border-r border-[#2c2f3b] bg-[#1f2128] transition-all duration-200 ${
          collapsed ? 'w-[60px]' : 'w-56'
        }`}
      >
        <div className={`flex h-14 items-center border-b border-[#2c2f3b] ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          <Link to="/" className="flex items-center gap-2.5 overflow-hidden">
            <img
              src="/sosuv-logo.png"
              alt="Sosuv logo"
              className="h-8 w-8 shrink-0 rounded-lg shadow-sm shadow-black/30"
            />
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold tracking-tight text-white">Sosuv</div>
                <div className="truncate text-[10px] font-medium uppercase tracking-wider text-[#7f8699]">Automation Studio</div>
              </div>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="rounded-md p-1 text-[#7f8699] hover:bg-[#2a2d37] hover:text-white"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>

        <div className="p-2.5">
          <Link
            to="/workflows/new"
            title="Create new workflow"
            className={`flex items-center justify-center gap-2 rounded-lg bg-[#3d6ccc] font-medium text-white shadow-sm shadow-[#3d6ccc]/20 transition-colors hover:bg-[#2f5cb8] ${
              collapsed ? 'h-9 w-full' : 'px-3 py-2 text-sm'
            }`}
          >
            <Plus size={16} />
            {!collapsed && <span>New Workflow</span>}
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-2.5 py-2">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                    collapsed ? 'justify-center' : ''
                  } ${
                    isActive
                      ? 'bg-[#2c303c] font-medium text-white shadow-inner shadow-black/10'
                      : 'text-[#9aa1b2] hover:bg-[#262933] hover:text-[#e4e6eb]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={17} className={isActive ? 'text-[#8fb2f5]' : 'text-[#7f8699]'} />
                    {!collapsed && <span>{item.label}</span>}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {collapsed && (
          <div className="border-t border-[#2c2f3b] p-2.5">
            <button
              onClick={() => setCollapsed(false)}
              className="flex h-9 w-full items-center justify-center rounded-lg text-[#7f8699] hover:bg-[#2a2d37] hover:text-white"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen size={16} />
            </button>
          </div>
        )}
      </aside>

      <main className="min-w-0 flex-1 overflow-auto bg-[#18191e]">
        <Outlet />
      </main>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#2a2d38] pb-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[#8f96a8]">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}
