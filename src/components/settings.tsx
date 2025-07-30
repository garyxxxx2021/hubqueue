
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getSoundPreference, setSoundPreference } from '@/lib/preferences';
import { BellRing, BellOff } from 'lucide-react';

export default function Settings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This effect runs only on the client after mounting.
    // It prevents hydration mismatch by ensuring that the state
    // is only set after the component has mounted on the client.
    setIsClient(true);
    setNotificationsEnabled(getSoundPreference());
  }, []);

  const handleNotificationToggle = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    setSoundPreference(enabled);
  };

  if (!isClient) {
    // Render nothing on the server to avoid hydration mismatch.
    // The component will be fully rendered on the client.
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
        <Card>
            <CardHeader>
                <CardTitle>设置</CardTitle>
                <CardDescription>管理您的账户和应用偏好。</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                         {notificationsEnabled ? <BellRing className="h-6 w-6 text-primary" /> : <BellOff className="h-6 w-6 text-muted-foreground" />}
                        <div>
                            <Label htmlFor="sound-notification" className="font-semibold">新图片上传提醒</Label>
                            <p className="text-sm text-muted-foreground">当有新图片上传到队列时，接收弹窗和音效提醒。</p>
                        </div>
                    </div>
                    <Switch
                        id="sound-notification"
                        checked={notificationsEnabled}
                        onCheckedChange={handleNotificationToggle}
                        aria-label="Toggle new image notifications"
                    />
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
