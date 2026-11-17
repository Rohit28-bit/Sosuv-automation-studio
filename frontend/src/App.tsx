import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { FeedbackProvider } from './components/Feedback'
import { Layout } from './components/Layout'
import { BuilderPage } from './pages/BuilderPage'
import { DashboardPage, RunsPage, ToolsPage, WorkflowsPage } from './pages/ListPages'
import { RunDetailPage } from './pages/RunDetailPage'

// A data router (createBrowserRouter) is needed for useBlocker, which the editor uses
// to warn about unsaved changes when you click away inside the app.
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'workflows', element: <WorkflowsPage /> },
      { path: 'workflows/new', element: <BuilderPage /> },
      { path: 'workflows/:id', element: <BuilderPage /> },
      { path: 'runs', element: <RunsPage /> },
      { path: 'runs/:id', element: <RunDetailPage /> },
      { path: 'tools', element: <ToolsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  return (
    <FeedbackProvider>
      <RouterProvider router={router} />
    </FeedbackProvider>
  )
}
