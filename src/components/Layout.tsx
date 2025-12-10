import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Sidebar />
      <main className="md:mr-64 pb-32">
        {children}
      </main>
    </div>
  );
};
