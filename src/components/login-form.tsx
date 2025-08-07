
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wrench } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import Logo from '@/components/logo';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login, user, isLoading: isAuthLoading, isMaintenanceMode, isSelfDestructed } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  useEffect(() => {
    if (!isAuthLoading && user) {
      router.push(callbackUrl);
    }
  }, [user, isAuthLoading, router, callbackUrl]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    const result = await login(username, password);
    if (result.success) {
      router.push(callbackUrl);
    } else {
      toast({
        variant: "destructive",
        title: "登录失败",
        description: result.message || "无效的用户名或密码。",
      });
    }
    setIsLoggingIn(false);
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleLogin();
    }
  };

  if (isAuthLoading || (!isAuthLoading && user)) {
     return <div className="w-screen h-screen bg-background" />;
  }

  if (isSelfDestructed) {
    return <div className="w-screen h-screen bg-background" />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
                <div className="relative h-10 w-10">
                    <Logo width={40} height={40} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">HubQueue</h1>
            </div>
          <CardTitle>欢迎回来</CardTitle>
          <CardDescription>输入您的凭据以访问仪表板。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isMaintenanceMode && (
            <Alert variant="default" className="border-primary/50 text-primary">
              <Wrench className="h-4 w-4" />
              <AlertTitle>正在维护</AlertTitle>
              <AlertDescription>
                网站正在维护中，只有管理员可以登录。
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入您的用户名"
              required
              disabled={isLoggingIn}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入您的密码"
              required
              disabled={isLoggingIn}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button onClick={handleLogin} className="w-full" disabled={isLoggingIn}>
            {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            登录
          </Button>
           <p className="text-sm text-center text-muted-foreground">
              还没有账户？{' '}
              <Link href="/register" className="font-semibold text-primary hover:underline">
                注册
              </Link>
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
