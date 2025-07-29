"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ImageFile } from '@/types';
import { ImageUploader } from './image-uploader';
import { ImageQueue } from './image-queue';
import { useToast } from "@/hooks/use-toast";
import { getImageList, saveImageList, uploadToWebdav, deleteWebdavFile } from '@/services/webdav';
import { Skeleton } from './ui/skeleton';
import { Syncing } from 'lucide-react';

const POLLING_INTERVAL = 5000; // 5 seconds

export default function Dashboard() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  
  // Ref to store the latest version of images to prevent stale state in closures
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const fetchImages = useCallback(async (showSyncingIndicator = false) => {
    if (showSyncingIndicator) {
      setIsSyncing(true);
    }
    try {
      const imageList = await getImageList();
      // Only update if the fetched list is different from the current one
      if (JSON.stringify(imageList) !== JSON.stringify(imagesRef.current)) {
        setImages(imageList);
      }
    } catch (error: any) {
      // Don't show toast on background polls
      if (!showSyncingIndicator) {
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


  // Initial fetch
  useEffect(() => {
    const initialFetch = async () => {
      setIsLoading(true);
      await fetchImages(false);
      setIsLoading(false);
    };
    initialFetch();
  }, [fetchImages]);
  
  // Set up polling
  useEffect(() => {
    const interval = setInterval(() => {
        fetchImages(true);
    }, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchImages]);

  const updateAndSave = async (updatedImages: ImageFile[], successMessage?: {title: string, description: string}) => {
    setImages(updatedImages); // Optimistic update
    const { success, error } = await saveImageList(updatedImages);
    if (success) {
      if(successMessage) {
        toast(successMessage);
      }
    } else {
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error || "Could not save the image list to WebDAV.",
      });
      // On failure, refetch to get the ground truth from the server
      await fetchImages(true);
    }
  };


  const updateImage = (id: string, updates: Partial<ImageFile>) => {
    const updatedImages = images.map(img => img.id === id ? { ...img, ...updates } : img)
    updateAndSave(updatedImages);
  };

  const handleClaimImage = (id: string) => {
    const image = images.find(img => img.id === id);
    if(image && image.status === 'uploaded'){
        const updatedImages = images.map(img => img.id === id ? { ...img, status: 'in-progress', claimedBy: 'You' } : img);
        updateAndSave(updatedImages, {
          title: "Task Claimed",
          description: `You have claimed ${image.name}.`
        });
    }
  };
  
  const handleImageUploaded = (uploadedImage: { name: string, webdavPath: string }) => {
    const newImage: ImageFile = {
      id: Math.random().toString(36).substring(2, 9),
      name: uploadedImage.name,
      webdavPath: uploadedImage.webdavPath,
      url: `/api/image?path=${encodeURIComponent(uploadedImage.webdavPath)}`,
      status: 'uploaded',
      createdAt: Date.now(),
    };
    const updatedImages = [newImage, ...images];
    updateAndSave(updatedImages, {
      title: "Upload Successful",
      description: `${newImage.name} has been added to the queue.`
    });
  };
  
  const handleDeleteImage = async (id: string) => {
    const imageToDelete = images.find(img => img.id === id);
    if (!imageToDelete) return;

    // Optimistically remove from UI
    const updatedImages = images.filter(img => img.id !== id);
    setImages(updatedImages);

    // Delete from WebDAV storage
    const { success: deleteSuccess, error: deleteError } = await deleteWebdavFile(imageToDelete.webdavPath);
    if (!deleteSuccess) {
       toast({
        variant: "destructive",
        title: "Deletion Failed on Storage",
        description: deleteError || `Could not delete ${imageToDelete.name} from WebDAV storage.`,
      });
      // Revert UI change and show error
      await fetchImages(true);
      return;
    }

    // Save the updated list
    const { success, error } = await saveImageList(updatedImages);

    if (success) {
      toast({
          title: "Image Deleted",
          description: `${imageToDelete.name} has been removed from the queue and WebDAV.`,
      });
    } else {
      // Revert UI change and show error
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error || `Could not delete ${imageToDelete.name} from WebDAV.`,
      });
      await fetchImages(true);
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
                <Skeleton className="h-4 w-24" />
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
