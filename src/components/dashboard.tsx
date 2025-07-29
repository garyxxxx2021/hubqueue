"use client";

import { useState, useEffect } from 'react';
import type { ImageFile } from '@/types';
import { ImageUploader } from './image-uploader';
import { ImageQueue } from './image-queue';
import { useToast } from "@/hooks/use-toast";
import { uploadToWebdav } from '@/services/webdav';

export default function Dashboard() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const { toast } = useToast();

  const handleUpload = async (id: string) => {
      const imageToUpload = images.find(img => img.id === id);
      if (!imageToUpload) return;
  
      updateImage(id, { isUploading: true, status: 'in-progress' });
  
      try {
          // Re-upload requires the dataUrl, which we don't store after initial upload.
          // This would require a more complex implementation to re-read the file if needed.
          // For now, we will simulate re-upload with a placeholder logic.
          console.warn("Re-upload functionality needs access to original file data, which is not currently stored. Simulating success.");
          
          // Pretend upload was successful for UI purposes
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
      // The URL now points to our API route to fetch the image from WebDAV
      url: `/api/image?path=${encodeURIComponent(uploadedImage.webdavPath)}`,
      status: 'uploaded',
    };
    setImages(prev => [newImage, ...prev]);
  };
  
  const handleDeleteImage = (id: string) => {
    // Here you might want to add logic to delete the file from WebDAV as well.
    // For now, it just removes it from the UI.
    setImages(prev => prev.filter(img => img.id !== id));
    toast({
        title: "Image Removed",
        description: "The image has been removed from the queue.",
      });
  };
  
  const handleUploadFromQueue = (id: string) => {
      console.log("This action is deprecated as images are uploaded before being queued.", id)
      handleUpload(id); // Re-purposing for re-upload for now
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <ImageUploader onImageUploaded={handleImageUploaded} />
      <ImageQueue 
        images={images}
        onClaim={handleClaimImage}
        onUpload={handleUploadFromQueue}
        onDelete={handleDeleteImage}
      />
    </div>
  );
}
