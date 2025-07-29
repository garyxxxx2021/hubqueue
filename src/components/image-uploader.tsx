"use client";

import { useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  onImageAdded: (image: { name: string, url: string }) => void;
}

export function ImageUploader({ onImageAdded }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleCardClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast({
            variant: "destructive",
            title: "Invalid File Type",
            description: "Please select an image file.",
        });
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      onImageAdded({ name: file.name, url: dataUrl });
    };
    reader.readAsDataURL(file);

    // Reset file input to allow uploading the same file again
    event.target.value = '';
  };

  return (
    <Card className="mb-8 shadow-sm">
      <CardHeader>
        <CardTitle>Upload New Image</CardTitle>
        <CardDescription>Add an image to the processing queue.</CardDescription>
      </CardHeader>
      <CardContent>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />
        <div 
          className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg text-center bg-background hover:border-primary transition-colors cursor-pointer"
          onClick={handleCardClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
        >
          <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="font-semibold mb-1">Click to upload an image</p>
          <p className="text-muted-foreground text-sm">Select an image file from your device.</p>
        </div>
      </CardContent>
    </Card>
  );
}
