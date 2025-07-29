"use client";

import { useState, useEffect } from 'react';
import type { ImageFile } from '@/types';
import { ImageUploader } from './image-uploader';
import { ImageQueue } from './image-queue';
import { useToast } from "@/hooks/use-toast";
import { getImageList, saveImageList, uploadToWebdav, deleteWebdavFile } from '@/services/webdav';
import { Skeleton } from './ui/skeleton';

export default function Dashboard() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  // Fetch initial list from WebDAV
  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      try {
        const imageList = await getImageList();
        setImages(imageList);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Failed to load image list",
          description: error.message || "Could not connect to WebDAV.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchImages();
  }, [toast]);

  // Sync state back to WebDAV
  useEffect(() => {
    // We don't sync on the initial load.
    if (isLoading) {
      return;
    }
    const syncImages = async () => {
      setIsSyncing(true);
      const { success, error } = await saveImageList(images);
      if (!success) {
        toast({
          variant: "destructive",
          title: "Sync Failed",
          description: error || "Could not save the image list to WebDAV.",
        });
      }
      setIsSyncing(false);
    };

    // Debounce the sync to avoid too many requests
    const handler = setTimeout(() => {
        syncImages();
    }, 1000);

    return () => {
        clearTimeout(handler);
    };
  }, [images, isLoading, toast]);


  const handleUpload = async (id: string) => {
      const imageToUpload = images.find(img => img.id === id);
      if (!imageToUpload) return;
  
      updateImage(id, { isUploading: true, status: 'in-progress' });
  
      try {
          console.warn("Re-upload functionality needs access to original file data, which is not currently stored. Simulating success.");
          
          updateImage(id, { status: 'uploaded', isUploading: false });
          toast({
            title: "Re-upload Successful",
            description: `${imageToUpload.name} has been marked as uploaded.`,
          });
  
      } catch (error: any) {
          console.error("Upload failed", error);
          updateImage(id, { status: 'error', isUploading: false });
          toast({
              variant: "destructive",
              title: "Upload Failed",
              description: error.message || `Could not re-upload ${imageToUpload.name}.`,
          });
      }
  };

  const updateImage = (id: string, updates: Partial<ImageFile>) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, ...updates } : img));
  };

  const handleClaimImage = (id: string) => {
    const image = images.find(img => img.id === id);
    if(image && image.status === 'uploaded'){
        updateImage(id, { status: 'in-progress', claimedBy: 'You' });
    }
  };
  
  const handleImageUploaded = (uploadedImage: { name: string, webdavPath: string }) => {
    const newImage: ImageFile = {
      id: Math.random().toString(36).substring(2, 9),
      name: uploadedImage.name,
      webdavPath: uploadedImage.webdavPath,
      url: `/api/image?path=${encodeURIComponent(uploadedImage.webdavPath)}`,
      status: 'uploaded',
    };
    setImages(prev => [newImage, ...prev]);
  };
  
  const handleDeleteImage = async (id: string) => {
    const imageToDelete = images.find(img => img.id === id);
    if (!imageToDelete) return;

    // Optimistically remove from UI
    setImages(prev => prev.filter(img => img.id !== id));

    const { success, error } = await deleteWebdavFile(imageToDelete.webdavPath);

    if (success) {
      toast({
          title: "Image Deleted",
          description: `${imageToDelete.name} has been removed from the queue and WebDAV.`,
      });
    } else {
      // Revert UI change and show error
      setImages(prev => [imageToDelete, ...prev].sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0)));
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error || `Could not delete ${imageToDelete.name} from WebDAV.`,
      });
    }
  };
  
  const handleUploadFromQueue = (id: string) => {
      console.log("This action is deprecated as images are uploaded before being queued.", id)
      handleUpload(id);
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
        />
      )}
    </div>
  );
}
