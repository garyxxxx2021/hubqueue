
"use client";

import { useState, useEffect } from 'react';
import { getImageList, ImageFile } from '@/services/webdav';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from './ui/skeleton';
import { TrendingUp, Users, CheckCircle, Upload } from 'lucide-react';

interface UserStats {
  completed: number;
  uploaded: number;
}

interface AllStats {
  totalCompleted: number;
  totalUploaded: number;
  userStats: Record<string, UserStats>;
}

export default function Stats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AllStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAndComputeStats() {
      setIsLoading(true);
      try {
        const images = await getImageList();
        const userStats: Record<string, UserStats> = {};

        images.forEach(image => {
          // Initialize user entry if not exists
          if (image.uploadedBy && !userStats[image.uploadedBy]) {
            userStats[image.uploadedBy] = { completed: 0, uploaded: 0 };
          }
          if (image.completedBy && !userStats[image.completedBy]) {
            userStats[image.completedBy] = { completed: 0, uploaded: 0 };
          }

          // Tally stats
          if (image.uploadedBy) {
            userStats[image.uploadedBy].uploaded++;
          }
          if (image.status === 'completed' && image.completedBy) {
            userStats[image.completedBy].completed++;
          }
        });
        
        const totalUploaded = images.length;
        const totalCompleted = images.filter(img => img.status === 'completed').length;

        setStats({
          totalCompleted,
          totalUploaded,
          userStats,
        });
      } catch (error) {
        console.error("Failed to load stats:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAndComputeStats();
  }, []);
  
  const sortedUsers = stats ? Object.entries(stats.userStats).sort(([, a], [, b]) => b.completed - a.completed) : [];

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
        </div>
        <Card>
            <CardHeader>
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-40 w-full" />
            </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!stats) {
     return (
        <div className="container mx-auto py-8 px-4 md:px-6 text-center">
            <p>无法加载统计数据。</p>
        </div>
     );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-6">统计数据</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总上传数</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUploaded}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总完成数</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompleted}</div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>用户排行榜</CardTitle>
          <CardDescription>按完成任务数排序</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>排名</TableHead>
                <TableHead>用户</TableHead>
                <TableHead className="text-right">完成数</TableHead>
                <TableHead className="text-right">上传数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map(([username, data], index) => (
                <TableRow key={username}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{username}{user?.username === username && " (您)"}</TableCell>
                  <TableCell className="text-right">{data.completed}</TableCell>
                  <TableCell className="text-right">{data.uploaded}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
