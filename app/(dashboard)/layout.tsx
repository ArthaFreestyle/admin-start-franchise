import Sidebar from '@/app/components/Sidebar'
import AuthGuard from '@/app/components/AuthGuard'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="sf-layout">
        <Sidebar />
        <div className="sf-main">
          <div className="sf-wrapper">{children}</div>
        </div>
      </div>
    </AuthGuard>
  )
}
