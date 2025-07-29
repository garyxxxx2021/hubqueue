
import type { ImageFile } from '@/types';
import { ImageCard } from './image-card';
import { FileQuestion, RefreshCw } from 'lucide-react';

interface ImageQueueProps {
  images: ImageFile[];
  currentUser: string;
  onClaim: (id: string) => void;
  onUpload: (id: string) => void;
  onDelete: (id: string) => void;
  isSyncing: boolean;
}

export function ImageQueue({ images, currentUser, onClaim, onUpload, onDelete, isSyncing }: ImageQueueProps) {
  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Image Queue</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSyncing && (
                <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> 
                    <span>Syncing...</span>
                </>
            )}
        </div>
      </div>
      {images.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map(image => (
            <ImageCard 
              key={image.id}
              image={image}
              currentUser={currentUser}
              onClaim={onClaim}
              onUpload={onUpload}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg text-center bg-card">
          <FileQuestion className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold">Queue is empty</h3>
          <p className="text-muted-foreground mt-2">Upload an image to get started.</p>
        </div>
      )}
    </div>
  );
}
