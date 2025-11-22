import { Button } from "@/components/ui/button";
import { Rocket, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

const Header = () => {
  const { user, signOut } = useAuth();
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-primary">
              <Rocket className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Autopilot
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              기능
            </a>
            <a href="#pipeline" className="text-muted-foreground hover:text-foreground transition-colors">
              파이프라인
            </a>
            <a href="#personas" className="text-muted-foreground hover:text-foreground transition-colors">
              사용자
            </a>
            <a href="#metrics" className="text-muted-foreground hover:text-foreground transition-colors">
              성과
            </a>
          </nav>
          
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground hidden md:inline">
                  {user.email}
                </span>
                <Button 
                  variant="ghost" 
                  onClick={signOut}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" className="hidden md:inline-flex">
                    로그인
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="default" variant="hero">
                    시작하기
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
