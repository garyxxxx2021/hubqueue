import { GitCommit, LogOut, User, Users } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from './ui/avatar';


export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  }
  
  const handleUserManagement = () => {
    router.push('/users');
  }

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
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                        <User className="h-5 w-5"/>
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.username}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.isAdmin ? '管理员' : (user.isTrusted ? '受信任用户' : '用户')}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user.isAdmin && (
                  <DropdownMenuItem onClick={handleUserManagement}>
                    <Users className="mr-2 h-4 w-4" />
                    <span>用户管理</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
