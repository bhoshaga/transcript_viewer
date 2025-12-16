import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Separator } from "./ui/separator";
import { UserCircle, CreditCard } from "lucide-react";
import { getEnv } from "../lib/useEnv";

export function UserMenu() {
  const { USER_NAME, USER_EMAIL } = getEnv();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <UserCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 bg-card border-border p-2">
        <div className="space-y-3">
          <div className="px-2 py-1.5">
            <div className="font-medium">{USER_NAME}</div>
            <div className="text-xs text-muted-foreground">{USER_EMAIL}</div>
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
