import type { ImageFile } from '@/types';
import { ImageCard } from './image-card';
import { FileQuestion } from 'lucide-react';

interface ImageQueueProps {
  images: ImageFile[];
  onClaim: (id: string) => void;
  onUpload: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ImageQueue({ images, onClaim, onUpload, onDelete }: ImageQueueProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight mb-6">Image Queue</h2>
      {images.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map(image => (
            <ImageCard 
              key={image.id}
              image={image}
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
