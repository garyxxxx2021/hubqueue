
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUsers, saveUsers, StoredUser } from '@/services/webdav';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { ShieldCheck, User as UserIcon, Trash2, Ban } from 'lucide-react';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function UserManagement() {
  const { user, isLoading: isAuthLoading, updateUserStatus } = useAuth();
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStates, setUpdatingStates] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthLoading && (!user || !user.isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, isAuthLoading, router]);

  const fetchUsers = async () => {
      if (user?.isAdmin) {
        setIsLoading(true);
        try {
           const userList = await getUsers();
           setUsers(userList);
        } catch (error) {
          toast({
            variant: "destructive",
            title: "加载失败",
            description: "无法从服务器获取用户列表。",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };
    
  useEffect(() => {
    fetchUsers();
  }, [user]);
  
  const handleTrustToggle = async (username: string, isTrusted: boolean) => {
    setUpdatingStates(prev => ({ ...prev, [`trust-${username}`]: true }));
    const originalUsers = [...users];
    const updatedUsers = users.map(u => 
        u.username === username ? { ...u, isTrusted } : u
    );
    setUsers(updatedUsers);

    const { success, error } = await saveUsers(updatedUsers);
    
    if (!success) {
        toast({
            variant: 'destructive',
            title: '更新失败',
            description: error || '无法保存用户权限更改。',
        });
        setUsers(originalUsers);
    } else {
         toast({
            title: '更新成功',
            description: `用户 ${username} 的可信状态已更新。`,
        });
        
        if (user && user.username === username) {
           await updateUserStatus(username);
        }
        await fetchUsers();
    }
    setUpdatingStates(prev => ({ ...prev, [`trust-${username}`]: false }));
  };

  const handleAdminToggle = async (username: string, isAdmin: boolean) => {
    setUpdatingStates(prev => ({ ...prev, [`admin-${username}`]: true }));
    const originalUsers = [...users];
    const updatedUsers = users.map(u => 
        u.username === username ? { ...u, isAdmin, isTrusted: u.isTrusted || isAdmin } : u
    );
    setUsers(updatedUsers);

    const { success, error } = await saveUsers(updatedUsers);

    if (!success) {
        toast({
            variant: 'destructive',
            title: '更新失败',
            description: error || '无法保存用户权限更改。',
        });
        setUsers(originalUsers);
    } else {
        toast({
            title: '更新成功',
            description: `用户 ${username} 的管理员状态已更新。`,
        });
        if (user && user.username === username) {
           await updateUserStatus(username);
        }
        await fetchUsers();
    }
    setUpdatingStates(prev => ({ ...prev, [`admin-${username}`]: false }));
  };

  const handleBanToggle = async (username: string, isBanned: boolean) => {
    setUpdatingStates(prev => ({ ...prev, [`ban-${username}`]: true }));
    const originalUsers = [...users];
    const updatedUsers = users.map(u => 
        u.username === username ? { ...u, isBanned } : u
    );
    setUsers(updatedUsers);

    const { success, error } = await saveUsers(updatedUsers);
    
    if (!success) {
        toast({
            variant: 'destructive',
            title: '更新失败',
            description: error || '无法保存用户封禁状态。',
        });
        setUsers(originalUsers);
    } else {
         toast({
            title: '更新成功',
            description: `用户 ${username} 已被${isBanned ? '封禁' : '解封'}。`,
        });
        await fetchUsers();
    }
    setUpdatingStates(prev => ({ ...prev, [`ban-${username}`]: false }));
  };

  const handleDeleteUser = async (username: string) => {
    if (user?.username === username) {
        toast({
            variant: 'destructive',
            title: '操作失败',
            description: '您不能删除自己。',
        });
        return;
    }

    setUpdatingStates(prev => ({ ...prev, [`delete-${username}`]: true }));
    const originalUsers = [...users];
    const updatedUsers = users.filter(u => u.username !== username);
    setUsers(updatedUsers);

    const { success, error } = await saveUsers(updatedUsers);
    if (!success) {
        toast({
            variant: 'destructive',
            title: '删除失败',
            description: error || '无法删除用户。',
        });
        setUsers(originalUsers);
    } else {
        toast({
            title: '删除成功',
            description: `用户 ${username} 已被删除。`,
        });
        await fetchUsers();
    }
    setUpdatingStates(prev => ({ ...prev, [`delete-${username}`]: false }));
  };

  if (isAuthLoading || isLoading) {
    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <Card>
                <CardHeader>
                    <CardTitle>用户管理</CardTitle>
                    <CardDescription>正在加载用户列表...</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead><Skeleton className="h-4 w-12" /></TableHead>
                            <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                            <TableHead className="text-right"><Skeleton className="h-4 w-16" /></TableHead>
                            <TableHead className="text-right"><Skeleton className="h-4 w-16" /></TableHead>
                            <TableHead className="text-right"><Skeleton className="h-4 w-16" /></TableHead>
                            <TableHead className="text-right"><Skeleton className="h-4 w-16" /></TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {[...Array(3)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-6 w-11 ml-auto" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-6 w-11 ml-auto" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-6 w-11 ml-auto" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
        <Card>
            <CardHeader>
            <CardTitle>用户管理</CardTitle>
            <CardDescription>管理用户的角色、权限和状态。</CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead className="text-center">可信</TableHead>
                    <TableHead className="text-center">管理员</TableHead>
                    <TableHead className="text-center">封禁</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {users.map((u, index) => {
                    const isInitialAdmin = index === 0;
                    const isSelf = u.username === user?.username;
                    return (
                        <TableRow key={u.username} className={u.isBanned ? 'bg-destructive/10' : ''}>
                        <TableCell className="font-medium">{u.username}</TableCell>
                        <TableCell>
                            {u.isAdmin ? (
                                <span className="flex items-center gap-2 font-semibold text-primary">
                                    <ShieldCheck className="h-4 w-4" /> 管理员
                                </span>
                            ) : (
                                <span className="flex items-center gap-2 text-muted-foreground">
                                    <UserIcon className="h-4 w-4" /> 用户
                                </span>
                            )}
                        </TableCell>
                        <TableCell className="text-center">
                             <Switch
                                checked={u.isTrusted || u.isAdmin}
                                onCheckedChange={(checked) => handleTrustToggle(u.username, checked)}
                                disabled={u.isAdmin || updatingStates[`trust-${u.username}`] || isInitialAdmin}
                                aria-label={`Toggle trusted status for ${u.username}`}
                            />
                        </TableCell>
                        <TableCell className="text-center">
                             <Switch
                                checked={u.isAdmin}
                                onCheckedChange={(checked) => handleAdminToggle(u.username, checked)}
                                disabled={updatingStates[`admin-${u.username}`] || isInitialAdmin}
                                aria-label={`Toggle admin status for ${u.username}`}
                            />
                        </TableCell>
                        <TableCell className="text-center">
                             <Switch
                                checked={!!u.isBanned}
                                onCheckedChange={(checked) => handleBanToggle(u.username, checked)}
                                disabled={updatingStates[`ban-${u.username}`] || isInitialAdmin || isSelf}
                                aria-label={`Toggle banned status for ${u.username}`}
                            />
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={isInitialAdmin || isSelf || updatingStates[`delete-${u.username}`]}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <span className="sr-only">删除用户</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>确定要删除用户 {u.username} 吗？</AlertDialogTitle>
                                <AlertDialogDescription>
                                  此操作无法撤销。这将永久删除该用户账户，但不会删除其历史操作记录。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(u.username)}>确认删除</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                        </TableRow>
                    );
                })}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
    </div>
  );
}
