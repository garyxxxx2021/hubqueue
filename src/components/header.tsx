import { GitCommit, Bell, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export default function Header() {
  return (
    <header className="bg-card border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/20 rounded-lg">
            <GitCommit className="h-6 w-6" style={{ color: 'hsl(var(--accent))' }}/>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">GitShare</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="h-5 w-5" />
            <span className="sr-only">View notifications</span>
          </Button>
          <Avatar className="h-9 w-9">
             <AvatarImage src="https://placehold.co/40x40.png" data-ai-hint="person avatar" />
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
