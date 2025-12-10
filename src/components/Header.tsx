import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Music2, Search, Heart, Download, LogOut, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Header = ({ searchQuery, onSearchChange }: HeaderProps) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  type BeforeInstallPromptEvent = {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  };
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as unknown as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      toast({ title: "تم التنزيل", description: "تم تثبيت التطبيق على هاتفك" });
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [toast]);

  const handleInstallApp = async () => {
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        toast({ title: "جارٍ التثبيت", description: "اتبع تعليمات المتصفح لإكمال التثبيت" });
      } else {
        toast({ title: "تم الإلغاء", description: "يمكنك المحاولة مرة أخرى لاحقاً" });
      }
      return;
    }
    if (isIOS) {
      toast({
        title: "تثبيت على iPhone",
        description: "اضغط على مشاركة ثم اختر 'أضف إلى الشاشة الرئيسية'",
      });
      return;
    }
    if (isAndroid) {
      toast({
        title: "التثبيت من المتصفح",
        description: "إذا ظهر خيار 'إضافة إلى الشاشة الرئيسية' استخدمه لتثبيت التطبيق",
      });
      return;
    }
    toast({ title: "تنزيل للهاتف", description: "افتح الموقع من هاتفك لتثبيت التطبيق كـ PWA" });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "تم تسجيل الخروج",
      description: "نراك قريباً",
    });
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/30 glass-effect shadow-card">
      <div className="container flex h-20 items-center justify-between px-4 md:px-8 gap-4">
        <div className="flex items-center gap-4">
          <h1
            className="text-4xl md:text-5xl font-extrabold bg-gradient-primary bg-clip-text text-transparent tracking-wide"
            style={{ fontFamily: "'Almarai', system-ui, sans-serif", filter: "drop-shadow(0 0 8px hsl(30 45% 55% / 0.6))" }}
          >
            ألحان
          </h1>
        </div>

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

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/favorites")}
                title="المفضلة"
                className="hover:bg-accent/20 hover:text-accent transition-bounce rounded-xl"
              >
                <Heart className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/downloads")}
                title="التنزيلات"
                className="hover:bg-primary/20 hover:text-primary transition-bounce rounded-xl"
              >
                <Download className="h-5 w-5" />
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleInstallApp}
                className="bg-gradient-primary hover:shadow-glow transition-bounce rounded-xl px-4 h-10"
                title="تنزيل للهاتف"
              >
                <Download className="h-5 w-5 ml-2" />
                تنزيل للهاتف
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="تسجيل الخروج"
                className="hover:bg-destructive/20 hover:text-destructive transition-bounce rounded-xl"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={handleInstallApp}
                className="bg-gradient-primary hover:shadow-glow transition-bounce rounded-xl px-4 h-10"
                title="تنزيل للهاتف"
              >
                <Download className="h-5 w-5 ml-2" />
                تنزيل للهاتف
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate("/auth")}
                className="bg-gradient-primary hover:shadow-glow transition-bounce rounded-xl px-6 h-10"
              >
                <User className="h-5 w-5 ml-2" />
                تسجيل الدخول
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
