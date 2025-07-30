
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { ImageFile } from '@/types';
import { ImageUploader } from './image-uploader';
import { ImageQueue } from './image-queue';
import { useToast } from "@/hooks/use-toast";
import { getImageList, saveImageList, getHistoryList, saveHistoryList } from '@/services/webdav';
import { Skeleton } from './ui/skeleton';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getSoundPreference, getNotificationPreference } from '@/lib/preferences';
import Ably from 'ably';


export default function Dashboard() {
  const { user } = useAuth();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [history, setHistory] = useState<ImageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const isInitialLoad = useRef(true);
  const ablyRef = useRef<Ably.Realtime | null>(null);

  const fetchImages = useCallback(async (showSyncingIndicator = false) => {
    if (showSyncingIndicator) {
      setIsSyncing(true);
    }
    try {
      const [imageList, historyList] = await Promise.all([getImageList(), getHistoryList()]);
      const migratedImageList = imageList.map(img => ({ ...img, uploadedBy: img.uploadedBy || 'unknown' }));
      
      if (document.visibilityState === 'visible' && !isInitialLoad.current) {
        const oldImageIds = new Set(imagesRef.current.map(img => img.id));
        const newImages = migratedImageList.filter(img => !oldImageIds.has(img.id));
        
        if (newImages.length > 0) {
          const newImageNames = newImages.map(img => img.name).join(', ');
          
          if (getNotificationPreference()) {
            toast({
              title: '有新图片加入队列',
              description: `新图片: ${newImageNames}`,
            });
          }
          
          if (getSoundPreference()) {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(error => {
              // Gracefully handle cases where the sound file might not exist or fails to play.
            });
          }
        }
      }
      
      if (JSON.stringify(migratedImageList) !== JSON.stringify(imagesRef.current)) {
        setImages(migratedImageList);
      }
      setHistory(historyList);

    } catch (error: any) {
      if (showSyncingIndicator) {
          toast({
            variant: "destructive",
            title: "无法加载图片列表",
            description: error.message || "无法连接到 WebDAV。",
          });
      }
      console.error("Data fetch failed:", error);
    } finally {
      if (showSyncingIndicator) {
        setIsSyncing(false);
      }
    }
  }, [toast]);

  useEffect(() => {
    const initialFetch = async () => {
      setIsLoading(true);
      await fetchImages(false);
      setIsLoading(false);
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 100);
    };
    
    initialFetch();

    // Setup Ably client
    ablyRef.current = new Ably.Realtime({ authUrl: '/api/ably-auth' });

    ablyRef.current.connection.on('connected', () => {
      console.log('Connected to Ably!');
    });

    const channel = ablyRef.current.channels.get('hubqueue:updates');
    channel.subscribe('update', (message) => {
      console.log('Update notification received via Ably');
      fetchImages(true);
    });

    return () => {
      if (ablyRef.current) {
        ablyRef.current.close();
        ablyRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const handleClaimImage = async (id: string) => {
    if (!user) {
        toast({
            variant: "destructive",
            title: "认证错误",
            description: "您必须登录才能认领任务。",
        });
        return;
    }

    setIsSyncing(true);
    try {
      const currentImages = await getImageList();
      const imageToClaim = currentImages.find(img => img.id === id);

      if (imageToClaim && imageToClaim.status === 'uploaded') {
        const updatedImages = currentImages.map(img => 
          img.id === id ? { ...img, status: 'in-progress', claimedBy: user.username } : img
        );
        
        const { success, error } = await saveImageList(updatedImages);
        
        if (success) {
          // No need to setImages locally, Ably will trigger update
        } else {
          throw new Error(error || "无法保存更新后的图片列表。");
        }
      } else {
         toast({
            variant: "destructive",
            title: "操作失败",
            description: "该任务可能已被其他用户认领。"
        });
        await fetchImages(false);
      }
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "同步错误",
        description: error.message || "无法认领任务。",
      });
      await fetchImages(false);
    } finally {
        setIsSyncing(false);
    }
  };
  
  const handleUnclaimImage = async (id: string) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const currentImages = await getImageList();
      const imageToUnclaim = currentImages.find(img => img.id === id);

      if (imageToUnclaim && (imageToUnclaim.claimedBy === user.username || user.isAdmin)) {
        const updatedImages = currentImages.map(img =>
          img.id === id ? { ...img, status: 'uploaded', claimedBy: undefined } : img
        );

        const { success, error } = await saveImageList(updatedImages);

        if (!success) {
          throw new Error(error || "无法保存更新后的图片列表。");
        }
      } else {
        toast({
          variant: "destructive",
          title: "操作失败",
          description: "您没有权限放回此任务。",
        });
        setImages(currentImages.map(img => ({ ...img, uploadedBy: img.uploadedBy || 'unknown' })));
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "同步错误",
        description: error.message || "无法放回任务。",
      });
      await fetchImages(false);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImageUploaded = async (uploadedImage: { name: string, webdavPath: string }) => {
    if (!user) {
        toast({
            variant: "destructive",
            title: "认证错误",
            description: "您必须登录才能上传图片。",
        });
        return;
    }
    setIsSyncing(true);
    try {
        const newImage: ImageFile = {
            id: Math.random().toString(36).substring(2, 9),
            name: uploadedImage.name,
            webdavPath: uploadedImage.webdavPath,
            url: `/api/image?path=${encodeURIComponent(uploadedImage.webdavPath)}`,
            status: 'uploaded',
            uploadedBy: user.username,
            createdAt: Date.now(),
        };

        const currentImages = await getImageList();
        const updatedImages = [newImage, ...currentImages];

        const { success, error } = await saveImageList(updatedImages);
        if (!success) {
            throw new Error(error || '无法将图片列表保存到 WebDAV。');
        }
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "同步失败",
            description: error.message,
        });
        await fetchImages(false);
    } finally {
        setIsSyncing(false);
    }
  };
  
  const handleCompleteImage = async (id: string, notes: string) => {
    if (!user) return;
    setIsSyncing(true);

    try {
        const currentImages = await getImageList();
        const imageToComplete = currentImages.find(img => img.id === id);
        if (!imageToComplete) {
            toast({ variant: "destructive", title: "错误", description: "找不到要完成的任务。" });
            return;
        }

        const currentHistory = await getHistoryList();
        
        const completedImageRecord: ImageFile = {
            ...imageToComplete,
            status: 'completed',
            completedBy: user.username,
            completedAt: Date.now(),
            completionNotes: notes,
        };

        const updatedImages = currentImages.filter(img => img.id !== id);
        const updatedHistory = [completedImageRecord, ...currentHistory];

        const [saveImagesResult, saveHistoryResult] = await Promise.all([
            saveImageList(updatedImages),
            saveHistoryList(updatedHistory)
        ]);

        if (!saveImagesResult.success || !saveHistoryResult.success) {
             throw new Error(saveImagesResult.error || saveHistoryResult.error || "无法更新列表。");
        }
    } catch (error: any) {
         toast({
            variant: "destructive",
            title: "操作失败",
            description: error.message,
        });
        await fetchImages(false);
    } finally {
        setIsSyncing(false);
    }
  };

  const handleDeleteImage = async (id: string) => {
    setIsSyncing(true);
    try {
        const currentImages = await getImageList();
        const imageToDelete = currentImages.find(img => img.id === id);
        if (!imageToDelete) {
             toast({ variant: "destructive", title: "错误", description: "找不到要删除的记录。" });
             return;
        }

        const updatedImages = currentImages.filter(img => img.id !== id);
        const { success: saveSuccess, error: saveError } = await saveImageList(updatedImages);

        if(!saveSuccess) {
            throw new Error(saveError || "无法更新图片列表。");
        }
    } catch (error: any) {
         toast({
            variant: "destructive",
            title: "删除失败",
            description: error.message,
        });
        await fetchImages(false);
    } finally {
        setIsSyncing(false);
    }
  };
  
  const handleUploadFromQueue = (id: string) => {
      console.log("此操作已弃用，因为图片在加入队列前就已上传。", id)
  }

  const activeImages = images.filter(img => img.status !== 'completed');
  
  const queueStats = useMemo(() => {
    const totalUploaded = images.length + history.length;
    const totalCompleted = history.length;
    const userUploaded = user ? (images.filter(img => img.uploadedBy === user.username).length + history.filter(img => img.uploadedBy === user.username).length) : 0;
    const userCompleted = user ? history.filter(img => img.completedBy === user.username).length : 0;
    return { totalUploaded, totalCompleted, userUploaded, userCompleted };
  }, [images, history, user]);

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <ImageUploader onImageUploaded={handleImageUploaded} />
      {isLoading ? (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
                <Skeleton className="h-8 w-48" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>加载中...</span>
                </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-4">
                        <Skeleton className="h-40 w-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-8 w-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
      ) : (
        <ImageQueue
          images={activeImages}
          stats={queueStats}
          onClaim={handleClaimImage}
          onUnclaim={handleUnclaimImage}
          onUpload={handleUploadFromQueue}
          onComplete={handleCompleteImage}
          onDelete={handleDeleteImage}
          isSyncing={isSyncing}
        />
      )}
    </div>
  );
}
