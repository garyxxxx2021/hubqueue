"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { BellRing } from 'lucide-react';
import { Label } from './ui/label';
import { getNotificationPreference, setNotificationPreference } from '@/lib/notifications';

export default function Settings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const { toast } = useToast();

   useEffect(() => {
    if (typeof window !== 'undefined' && window.Notification) {
        setNotificationPermission(Notification.permission);
        setNotificationsEnabled(getNotificationPreference() && Notification.permission === 'granted');
    }
  }, []);

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      if (notificationPermission === 'granted') {
        setNotificationsEnabled(true);
        setNotificationPreference(true);
      } else if (notificationPermission !== 'denied') {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          setNotificationsEnabled(true);
          setNotificationPreference(true);
        } else {
            toast({
                variant: 'destructive',
                title: '通知权限被拒绝',
                description: '您需要允许通知才能启用此功能。',
            });
        }
      } else {
         toast({
            variant: 'destructive',
            title: '通知权限被阻止',
            description: '请在您的浏览器设置中允许通知。',
        });
      }
    } else {
      setNotificationsEnabled(false);
      setNotificationPreference(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
        <Card>
            <CardHeader>
                <CardTitle>通知设置</CardTitle>
                <CardDescription>管理您的通知偏好。</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                        <BellRing className="h-6 w-6 text-muted-foreground" />
                        <div>
                            <Label htmlFor="notification-switch" className="font-semibold">新图片上传提醒</Label>
                            <p className="text-sm text-muted-foreground">当有新图片上传到队列时，接收浏览器通知。</p>
                        </div>
                    </div>
                    <Switch
                        id="notification-switch"
                        checked={notificationsEnabled}
                        onCheckedChange={handleNotificationToggle}
                        disabled={notificationPermission === 'denied'}
                    />
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
