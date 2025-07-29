
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ImageFile } from '@/types';
import { ImageUploader } from './image-uploader';
import { ImageQueue } from './image-queue';
import { useToast } from "@/hooks/use-toast";
import { getImageList, saveImageList, uploadToWebdav, deleteWebdavFile } from '@/services/webdav';
import { Skeleton } from './ui/skeleton';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const POLLING_INTERVAL = 5000; // 5 seconds

export default function Dashboard() {
  const { user } = useAuth();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const fetchImages = useCallback(async (showSyncingIndicator = false) => {
    if (showSyncingIndicator) {
      setIsSyncing(true);
    }
    try {
      const imageList = await getImageList();
      if (JSON.stringify(imageList) !== JSON.stringify(imagesRef.current)) {
        setImages(imageList);
      }
    } catch (error: any) {
      if (showSyncingIndicator) {
          toast({
            variant: "destructive",
            title: "Failed to load image list",
            description: error.message || "Could not connect to WebDAV.",
          });
      }
      console.error("Polling failed:", error);
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
    };
    initialFetch();
  }, [fetchImages]);
  
  useEffect(() => {
    const interval = setInterval(() => {
        fetchImages(true);
    }, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchImages]);

  const handleClaimImage = async (id: string) => {
    if (!user) {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "You must be logged in to claim a task.",
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
          setImages(updatedImages);
          toast({
            title: "Task Claimed",
            description: `You have claimed ${imageToClaim.name}.`
          });
        } else {
          throw new Error(error || "Failed to save updated image list.");
        }
      } else {
         toast({
            variant: "destructive",
            title: "Action Failed",
            description: "This task may have already been claimed by another user."
        });
        setImages(currentImages);
      }
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Sync Error",
        description: error.message || "Could not claim the task.",
      });
      await fetchImages(false);
    } finally {
        setIsSyncing(false);
    }
  };
  
  const handleImageUploaded = async (uploadedImage: { name: string, webdavPath: string }) => {
    setIsSyncing(true);
    try {
        const newImage: ImageFile = {
            id: Math.random().toString(36).substring(2, 9),
            name: uploadedImage.name,
            webdavPath: uploadedImage.webdavPath,
            url: `/api/image?path=${encodeURIComponent(uploadedImage.webdavPath)}`,
            status: 'uploaded',
            createdAt: Date.now(),
        };

        const currentImages = await getImageList();
        const updatedImages = [newImage, ...currentImages];

        const { success, error } = await saveImageList(updatedImages);
        if (success) {
            setImages(updatedImages);
            toast({
                title: "Upload Successful",
                description: `${newImage.name} has been added to the queue.`
            });
        } else {
            throw new Error(error || 'Could not save the image list to WebDAV.');
        }
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Sync Failed",
            description: error.message,
        });
        await fetchImages(false);
    } finally {
        setIsSyncing(false);
    }
  };
  
  const handleDeleteImage = async (id: string) => {
    const imageToDelete = images.find(img => img.id === id);
    if (!imageToDelete) return;

    setIsSyncing(true);

    try {
        const { success: deleteSuccess, error: deleteError } = await deleteWebdavFile(imageToDelete.webdavPath);
        if (!deleteSuccess) {
            throw new Error(deleteError || `Could not delete file from storage.`);
        }

        const currentImages = await getImageList();
        const updatedImages = currentImages.filter(img => img.id !== id);

        const { success: saveSuccess, error: saveError } = await saveImageList(updatedImages);
        if(saveSuccess) {
            setImages(updatedImages);
            toast({
                title: "Image Deleted",
                description: `${imageToDelete.name} has been removed.`,
            });
        } else {
            throw new Error(saveError || "Could not update the image list.");
        }
    } catch (error: any) {
         toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: error.message,
        });
        await fetchImages(false);
    } finally {
        setIsSyncing(false);
    }
  };
  
  const handleUploadFromQueue = (id: string) => {
      console.log("This action is deprecated as images are uploaded before being queued.", id)
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <ImageUploader onImageUploaded={handleImageUploaded} />
      {isLoading ? (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
                <Skeleton className="h-8 w-48" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Loading...</span>
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
          images={images}
          onClaim={handleClaimImage}
          onUpload={handleUploadFromQueue}
          onDelete={handleDeleteImage}
          isSyncing={isSyncing}
        />
      )}
    </div>
  );
}
