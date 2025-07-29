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

  // This function is kept for potential future use (e.g., re-uploading an errored item)
  // For now, the primary upload is handled in ImageUploader
  const handleUpload = async (id: string, name: string, dataUrl: string) => {
      const imageToUpload = images.find(img => img.id === id);
      if (!imageToUpload) return;
  
      updateImage(id, { isUploading: true, status: 'in-progress' });
  
      try {
          const result = await uploadToWebdav(name, dataUrl);
  
          if (result.success) {
              updateImage(id, { status: 'uploaded', isUploading: false, url: result.path || imageToUpload.url });
              toast({
                title: "Upload Successful",
                description: `${name} has been re-uploaded.`,
              });
          } else {
              throw new Error(result.error || 'Upload failed due to an unknown error.');
          }
  
      } catch (error: any) {
          console.error("Upload failed", error);
          updateImage(id, { status: 'error', isUploading: false });
          toast({
              variant: "destructive",
              title: "Upload Failed",
              description: error.message || `Could not upload ${name}. Please check the console for details.`,
          });
      }
  };


  const updateImage = (id: string, updates: Partial<ImageFile>) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, ...updates } : img));
  };

  const handleClaimImage = (id: string) => {
    // This functionality might need to be re-evaluated as images are already uploaded.
    // For now, it just changes the status visually.
    const image = images.find(img => img.id === id);
    if(image && image.status === 'uploaded'){
        updateImage(id, { status: 'in-progress', claimedBy: 'You' });
    }
  };
  
  const handleImageUploaded = (uploadedImage: { name: string, webdavPath: string }) => {
    const newImage: ImageFile = {
      id: Math.random().toString(36).substring(2, 9),
      name: uploadedImage.name,
      url: `https://placehold.co/600x400.png`, // Placeholder, actual image is on WebDAV
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
  
  // No longer needed, as upload happens before adding to queue
  const handleUploadFromQueue = (id: string) => {
      console.log("This action is deprecated as images are uploaded before being queued.", id)
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <ImageUploader onImageUploaded={handleImageUploaded} />
      <ImageQueue 
        images={images}
        onClaim={handleClaimImage}
        onUpload={handleUploadFromQueue} // This is now a dummy function
        onDelete={handleDeleteImage}
      />
    </div>
  );
}
