import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { CURRENT_USER } from "@/lib/mock-users";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <Sidebar currentUser={CURRENT_USER} />
      <div className="main">
        <Topbar />
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
