import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Heart, Download, LogOut, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Header = ({ searchQuery, onSearchChange }: HeaderProps) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "تم تسجيل الخروج", description: "نراك قريباً" });
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/30 glass-effect shadow-card">
      <div className="container flex h-20 items-center justify-between px-4 md:px-8 gap-4">

        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <h1
            className="text-4xl md:text-5xl font-extrabold bg-gradient-primary bg-clip-text text-transparent tracking-wide"
            style={{ fontFamily: "'Almarai', system-ui, sans-serif", filter: "drop-shadow(0 0 8px hsl(30 45% 55% / 0.6))" }}
          >
            ألحان
          </h1>
        </div>

        {/* Search */}
        <div className="relative w-full max-w-lg">
          <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            type="text"
            placeholder="ابحث عن أغنية..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-12 pr-12 pl-4 bg-secondary/60 border-border/60 focus:border-primary/70 focus:shadow-glow transition-smooth text-right rounded-2xl backdrop-blur-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <Button
                variant="ghost" size="icon"
                onClick={() => navigate("/favorites")}
                title="المفضلة"
                className="hover:bg-accent/20 hover:text-accent transition-bounce rounded-xl"
              >
                <Heart className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost" size="icon"
                onClick={() => navigate("/downloads")}
                title="التنزيلات"
                className="hover:bg-primary/20 hover:text-primary transition-bounce rounded-xl"
              >
                <Download className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost" size="icon"
                onClick={handleLogout}
                title="تسجيل الخروج"
                className="hover:bg-destructive/20 hover:text-destructive transition-bounce rounded-xl"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Button
              variant="default" size="sm"
              onClick={() => navigate("/auth")}
              className="bg-gradient-primary hover:shadow-glow transition-bounce rounded-xl px-6 h-10"
            >
              <User className="h-5 w-5 ml-2" />
              تسجيل الدخول
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};