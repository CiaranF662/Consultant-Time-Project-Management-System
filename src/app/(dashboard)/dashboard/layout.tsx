import { SidebarProvider } from "@/app/components/ui/sidebar"
import Sidebar from '@/app/components/add-sidebar';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <main>
        
        {children}
      </main>
    </SidebarProvider>
  )
}