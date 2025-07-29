"use client";

import { useState, useEffect } from 'react';
import type { ImageFile } from '@/types';
import { ImageUploader } from './image-uploader';
import { ImageQueue } from './image-queue';

const initialImagesData: Omit<ImageFile, 'id'>[] = [
  { name: 'landscape-sunset.jpg', url: 'https://placehold.co/600x400.png', status: 'queued' },
  { name: 'modern-architecture.png', url: 'https://placehold.co/600x400.png', status: 'queued' },
  { name: 'abstract-design.gif', url: 'https://placehold.co/600x400.png', status: 'in-progress', claimedBy: 'User' },
  { name: 'city-skyline-night.jpg', url: 'https://placehold.co/600x400.png', status: 'uploaded' },
];

export default function Dashboard() {
  const [images, setImages] = useState<ImageFile[]>([]);

  useEffect(() => {
    // Generate IDs on the client to avoid hydration mismatch
    setImages(initialImagesData.map(img => ({ ...img, id: Math.random().toString(36).substring(2, 9) })));
  }, []);

  const updateImage = (id: string, updates: Partial<ImageFile>) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, ...updates } : img));
  };

  const handleClaimImage = (id: string) => {
    updateImage(id, { status: 'in-progress', claimedBy: 'You' });
  };

  const handleUploadToGithub = (id: string) => {
    updateImage(id, { isUploading: true });

    setTimeout(() => {
      updateImage(id, { status: 'uploaded', isUploading: false });
    }, 1500);
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
        onUpload={handleUploadToGithub}
        onDelete={handleDeleteImage}
      />
    </div>
  );
}
