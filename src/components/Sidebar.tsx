import { Home, Search, Heart, Download, Music2, Settings } from "lucide-react";
import { SidebarLink } from "./SidebarLink";

export const Sidebar = () => {
  return (
    <aside className="hidden md:flex fixed right-0 top-0 h-screen w-64 bg-sidebar border-l border-sidebar-border p-6 flex-col gap-6 z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
          <Music2 className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          ألحان
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2">
        <SidebarLink to="/" icon={Home}>
          الرئيسية
        </SidebarLink>
        <SidebarLink to="/" icon={Search}>
          البحث
        </SidebarLink>
      </nav>

      {/* Library */}
      <div className="flex flex-col gap-2 mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground px-4 mb-2">
          مكتبتي
        </h2>
        <SidebarLink to="/favorites" icon={Heart}>
          المفضلة
        </SidebarLink>
        <SidebarLink to="/downloads" icon={Download}>
          التنزيلات
        </SidebarLink>
        <SidebarLink to="/settings" icon={Settings}>
          الإعدادات
        </SidebarLink>
      </div>
    </aside>
  );
};
