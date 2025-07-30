
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Settings() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
        <Card>
            <CardHeader>
                <CardTitle>设置</CardTitle>
                <CardDescription>管理您的账户和应用偏好。</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">当前没有可用的设置。</p>
            </CardContent>
        </Card>
    </div>
  );
}
