
import { GitCommit } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface HeaderProps {
    currentUser: string;
    onUserChange: (user: string) => void;
}

export default function Header({ currentUser, onUserChange }: HeaderProps) {
  return (
    <header className="bg-card border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/20 rounded-lg">
            <GitCommit className="h-6 w-6" style={{ color: 'hsl(var(--accent))' }}/>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">GitShare</h1>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="username" className="text-sm font-medium">Username:</Label>
          <Input 
            id="username"
            value={currentUser}
            onChange={(e) => onUserChange(e.target.value)}
            className="h-9 w-40"
            placeholder="Enter your name"
          />
        </div>
      </div>
    </header>
  );
}
