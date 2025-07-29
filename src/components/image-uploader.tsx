"use client";

import { useRef, useState } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { uploadToWebdav } from '@/services/webdav';
import type { ImageFile } from '@/types';

interface ImageUploaderProps {
  onImageUploaded: (image: Omit<ImageFile, 'id' | 'status'| 'url'> & { webdavPath: string }) => void;
}

export function ImageUploader({ onImageUploaded }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleCardClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        const result = await uploadToWebdav(file.name, dataUrl);

        if (result.success && result.path) {
          toast({
            title: "Upload Successful",
            description: `${file.name} has been uploaded.`,
          });
          onImageUploaded({ name: file.name, webdavPath: result.path });
        } else {
          throw new Error(result.error || 'Upload failed due to an unknown error.');
        }
        
        setIsUploading(false);
      };
      reader.onerror = (error) => {
        throw new Error('Could not read the file.');
      }
    } catch (error: any) {
      console.error("Upload failed", error);
      toast({
          variant: "destructive",
          title: "Upload Failed",
          description: error.message || `Could not upload ${file.name}.`,
      });
      setIsUploading(false);
    }

    // Reset file input to allow uploading the same file again
    event.target.value = '';
  };

  return (
    <Card className="mb-8 shadow-sm">
      <CardHeader>
        <CardTitle>Upload New Image</CardTitle>
        <CardDescription>Select an image to upload it to WebDAV and add it to the queue.</CardDescription>
      </CardHeader>
      <CardContent>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
          disabled={isUploading}
        />
        <div 
          className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg text-center bg-background hover:border-primary transition-colors cursor-pointer data-[uploading=true]:cursor-not-allowed data-[uploading=true]:bg-muted"
          onClick={handleCardClick}
          role="button"
          tabIndex={isUploading ? -1 : 0}
          onKeyDown={(e) => !isUploading && (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
          data-uploading={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-12 h-12 text-muted-foreground mb-4 animate-spin" />
              <p className="font-semibold mb-1">Uploading...</p>
              <p className="text-muted-foreground text-sm">Please wait while the file is being uploaded.</p>
            </>
          ) : (
            <>
              <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="font-semibold mb-1">Click to upload an image</p>
              <p className="text-muted-foreground text-sm">The image will be uploaded and then added to the queue.</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
