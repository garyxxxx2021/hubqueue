
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getSoundPreference, setSoundPreference } from '@/lib/preferences';
import { Volume2, VolumeX } from 'lucide-react';

export default function Settings() {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Ensure this runs only on the client
    setIsClient(true);
    setSoundEnabled(getSoundPreference());
  }, []);

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    setSoundPreference(enabled);
  };

  if (!isClient) {
    // Render a skeleton or null on the server to avoid hydration mismatches
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
                         {soundEnabled ? <Volume2 className="h-6 w-6 text-primary" /> : <VolumeX className="h-6 w-6 text-muted-foreground" />}
                        <div>
                            <Label htmlFor="sound-notification" className="font-semibold">新图片提醒音效</Label>
                            <p className="text-sm text-muted-foreground">当有新图片上传到队列时，播放提示音。</p>
                        </div>
                    </div>
                    <Switch
                        id="sound-notification"
                        checked={soundEnabled}
                        onCheckedChange={handleSoundToggle}
                        aria-label="Toggle sound notification"
                    />
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
