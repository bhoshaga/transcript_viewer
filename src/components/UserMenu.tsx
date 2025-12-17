import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Separator } from "./ui/separator";
import { UserCircle, CreditCard, LogOut, LogIn } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { logout } from "../lib/auth";
import { useNavigate } from "react-router-dom";

export function UserMenu() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  // Not logged in - show sign in option
  if (!user) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 [&_svg]:size-5">
            <UserCircle />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 bg-card border-border p-2" align="end">
          <div className="space-y-3">
            <div className="px-2 py-1.5">
              <div className="font-medium">Guest</div>
            </div>
            <Separator />
            <Button
              variant="ghost"
              className="w-full justify-start"
              size="sm"
              onClick={handleSignIn}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign in
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Logged in - show full menu
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 [&_svg]:size-5">
          <UserCircle />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 bg-card border-border p-2" align="end">
        <div className="space-y-3">
          <div className="px-2 py-1.5">
            <div className="font-medium">{user.displayName || 'User'}</div>
            <div className="text-xs text-muted-foreground">{user.email || ''}</div>
          </div>
          <Separator />
          <Button variant="ghost" className="w-full justify-start" size="sm">
            <CreditCard className="mr-2 h-4 w-4" />
            Billing
          </Button>
          <Separator />
          <div className="px-2 py-1.5 space-y-1">
            <div className="text-xs flex justify-between items-center">
              <span className="text-muted-foreground">Version</span>
              <span>2.0.0</span>
            </div>
            <a
              href="https://bhosh.notion.site/Trasncript-View-change-log-1d81b0bad55d80d69203f18bcb8ce699?pvs=4"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:underline inline-block"
            >
              Changelog
            </a>
          </div>
          <Separator />
          <Button
            variant="ghost"
            className="w-full justify-start text-red-500 hover:text-red-500 hover:bg-red-500/10"
            size="sm"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
