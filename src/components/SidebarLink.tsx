import { NavLink } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarLinkProps {
  to: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

export const SidebarLink = ({ to, icon: Icon, children }: SidebarLinkProps) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
          "text-sidebar-foreground hover:bg-sidebar-accent",
          isActive && "bg-sidebar-accent text-primary font-semibold"
        )
      }
    >
      <Icon className="h-5 w-5" />
      <span>{children}</span>
    </NavLink>
  );
};
