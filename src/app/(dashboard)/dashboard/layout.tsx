import { SidebarProvider, SidebarTrigger } from "@/app/components/ui/sidebar"
import DashSidebar from "@/app/components/add-sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashSidebar>{/* optional sidebar content */}</DashSidebar>
      <SidebarTrigger />
      <main>
        
        {children}
      </main>
    </SidebarProvider>
  )
}