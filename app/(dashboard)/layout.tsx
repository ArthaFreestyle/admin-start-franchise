import Sidebar from '@/app/components/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="sf-layout">
      <Sidebar />
      <div className="sf-main">
        <div className="sf-wrapper">{children}</div>
      </div>
    </div>
  )
}
