import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Input } from "./ui/input"
import { Badge } from "./ui/badge"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Separator } from "./ui/separator"
import { Mail, Users } from "lucide-react"
import { speakerColors } from '../data/meetings'
import { Member } from '../types'

interface TeamManagementProps {
  members: Member[];
}

export function TeamManagement({ members }: TeamManagementProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="mr-2 h-4 w-4" />
          {members.length} Members
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Team Members</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Email address"
              className="bg-background"
              noFocusRing
            />
            <Button>
              <Mail className="mr-2 h-4 w-4" />
              Invite
            </Button>
          </div>
          <Separator className="bg-border" />
          <div className="space-y-2">
            {members.map((member) => (
              <div 
                key={member.id} 
                className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Avatar className={speakerColors[member.name]}>
                    <AvatarFallback>{member.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-foreground">{member.name}</div>
                    <div className="text-sm text-muted-foreground">{member.email}</div>
                  </div>
                </div>
                <Badge variant="secondary">{member.role}</Badge>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}