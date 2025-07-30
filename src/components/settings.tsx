
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getSoundPreference, setSoundPreference, getNotificationPreference, setNotificationPreference } from '@/lib/preferences';
import { BellRing, BellOff, Volume2, VolumeX, Wrench } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { saveMaintenanceStatus } from '@/services/webdav';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { user, isMaintenanceMode, setMaintenanceMode } = useAuth();
  const { toast } = useToast();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [updatingStates, setUpdatingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIsClient(true);
    // Preferences are loaded from localStorage, ensuring they are client-side
    setNotificationsEnabled(getNotificationPreference());
    setSoundEnabled(getSoundPreference());
  }, []);
  
  const handleMaintenanceToggle = async (isMaintenance: boolean) => {
    setUpdatingStates(prev => ({ ...prev, maintenance: true }));
    setMaintenanceMode(isMaintenance);
    const { success, error } = await saveMaintenanceStatus({ isMaintenance });
     if (!success) {
        toast({
            variant: 'destructive',
            title: '操作失败',
            description: error || '无法更新维护状态。',
        });
        setMaintenanceMode(!isMaintenance);
    } else {
         toast({
            title: '操作成功',
            description: `网站维护模式已${isMaintenance ? '开启' : '关闭'}。`,
        });
    }
    setUpdatingStates(prev => ({ ...prev, maintenance: false }));
  }

  const handleNotificationToggle = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    setNotificationPreference(enabled);
  };

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    setSoundPreference(enabled);
  };

  if (!isClient) {
    // Render nothing or a skeleton on the server to avoid hydration mismatch
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
        {user?.isAdmin && (
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>系统设置</CardTitle>
                    <CardDescription>管理整个应用程序的全局设置。</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                            <Wrench className="h-6 w-6 text-muted-foreground" />
                            <div>
                                <Label htmlFor="maintenance-mode" className="font-semibold">维护模式</Label>
                                <p className="text-sm text-muted-foreground">开启后，只有管理员可以访问网站。</p>
                            </div>
                        </div>
                        <Switch
                            id="maintenance-mode"
                            checked={isMaintenanceMode}
                            onCheckedChange={handleMaintenanceToggle}
                            disabled={updatingStates['maintenance']}
                            aria-label="Toggle maintenance mode"
                        />
                    </div>
                </CardContent>
            </Card>
        )}
        <Card>
            <CardHeader>
                <CardTitle>通知设置</CardTitle>
                <CardDescription>管理您的账户和应用偏好。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                         {notificationsEnabled ? <BellRing className="h-6 w-6 text-primary" /> : <BellOff className="h-6 w-6 text-muted-foreground" />}
                        <div>
                            <Label htmlFor="toast-notification" className="font-semibold">新图片上传提醒</Label>
                            <p className="text-sm text-muted-foreground">当有新图片上传到队列时，接收弹窗提醒。</p>
                        </div>
                    </div>
                    <Switch
                        id="toast-notification"
                        checked={notificationsEnabled}
                        onCheckedChange={handleNotificationToggle}
                        aria-label="Toggle new image toast notifications"
                    />
                </div>
                 <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                         {soundEnabled ? <Volume2 className="h-6 w-6 text-primary" /> : <VolumeX className="h-6 w-6 text-muted-foreground" />}
                        <div>
                            <Label htmlFor="sound-notification" className="font-semibold">提醒音效</Label>
                            <p className="text-sm text-muted-foreground">当有新图片上传到队列时，播放音效提醒。</p>
                        </div>
                    </div>
                    <Switch
                        id="sound-notification"
                        checked={soundEnabled}
                        onCheckedChange={handleSoundToggle}
                        aria-label="Toggle new image sound notification"
                    />
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
