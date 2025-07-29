"use client";

import { UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ImageUploaderProps {
  onImageAdded: () => void;
}

export function ImageUploader({ onImageAdded }: ImageUploaderProps) {
  // In a real app, this would handle file selection
  // For now, we just call the passed function
  const handleFileSelect = () => {
    onImageAdded();
  }
  
  return (
    <Card className="mb-8 shadow-sm">
      <CardHeader>
        <CardTitle>Upload New Image</CardTitle>
        <CardDescription>Add an image to the processing queue.</CardDescription>
      </CardHeader>
      <CardContent>
        <div 
          className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg text-center bg-background hover:border-primary transition-colors cursor-pointer"
          onClick={handleFileSelect}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleFileSelect()}
        >
          <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="font-semibold mb-1">Click to simulate upload</p>
          <p className="text-muted-foreground text-sm">This will add a new placeholder image to the queue.</p>
        </div>
      </CardContent>
    </Card>
  );
}
