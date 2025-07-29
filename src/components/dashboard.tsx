"use client";

import { useState, useEffect } from 'react';
import type { ImageFile } from '@/types';
import { ImageUploader } from './image-uploader';
import { ImageQueue } from './image-queue';
import { uploadImage, UploadImageInput } from '@/ai/flows/upload-image-flow';
import { useToast } from "@/hooks/use-toast";

const initialImagesData: Omit<ImageFile, 'id'>[] = [
  { name: 'landscape-sunset.jpg', url: 'https://placehold.co/600x400.png', status: 'queued' },
  { name: 'modern-architecture.png', url: 'https://placehold.co/600x400.png', status: 'queued' },
  { name: 'abstract-design.gif', url: 'https://placehold.co/600x400.png', status: 'in-progress', claimedBy: 'User' },
  { name: 'city-skyline-night.jpg', url: 'https://placehold.co/600x400.png', status: 'uploaded' },
];

async function urlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function Dashboard() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setImages(initialImagesData.map(img => ({ ...img, id: Math.random().toString(36).substring(2, 9) })));
  }, []);

  const updateImage = (id: string, updates: Partial<ImageFile>) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, ...updates } : img));
  };

  const handleClaimImage = (id: string) => {
    updateImage(id, { status: 'in-progress', claimedBy: 'You' });
  };

  const handleUploadToWebdav = async (id: string) => {
    const imageToUpload = images.find(img => img.id === id);
    if (!imageToUpload) return;

    updateImage(id, { isUploading: true });

    try {
        const dataUrl = await urlToDataUrl(imageToUpload.url);

        const input: UploadImageInput = {
            fileName: imageToUpload.name,
            dataUrl: dataUrl,
        };

        const result = await uploadImage(input);

        if (result.success) {
            updateImage(id, { status: 'uploaded', isUploading: false });
            toast({
              title: "Upload Successful",
              description: `${imageToUpload.name} has been uploaded.`,
            });
        } else {
            throw new Error('Upload flow failed.');
        }

    } catch (error) {
        console.error("Upload failed", error);
        updateImage(id, { status: 'error', isUploading: false });
        toast({
            variant: "destructive",
            title: "Upload Failed",
            description: `Could not upload ${imageToUpload.name}. Please check the console for details.`,
        });
    }
  };

  const handleAddNewImage = () => {
    const newImage: ImageFile = {
      id: Math.random().toString(36).substring(2, 9),
      name: `new-image-${Math.floor(Math.random() * 100)}.jpg`,
      url: 'https://placehold.co/600x400.png',
      status: 'queued',
    };
    setImages(prev => [newImage, ...prev]);
  };
  
  const handleDeleteImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <ImageUploader onImageAdded={handleAddNewImage} />
      <ImageQueue 
        images={images}
        onClaim={handleClaimImage}
        onUpload={handleUploadToWebdav}
        onDelete={handleDeleteImage}
      />
    </div>
  );
}
