
import Image from 'next/image';
import { useState } from 'react';
import type { ImageFile } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, GitBranch, CheckCircle2, RefreshCcw, Trash2, User, Download, PartyPopper, Ban } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


interface ImageCardProps {
  image: ImageFile;
  currentUser: string;
  onClaim: (id: string) => void;
  onUpload: (id: string) => void; 
  onDelete: (id: string) => void;
}

const statusConfig = {
  queued: { variant: 'secondary', label: 'Queued' },
  'in-progress': { variant: 'default', label: 'In Progress' },
  uploaded: { variant: 'outline', label: 'Uploaded' },
  error: { variant: 'destructive', label: 'Error' },
} as const;

export function ImageCard({ image, currentUser, onClaim, onUpload, onDelete }: ImageCardProps) {
  const { id, name, url, status, claimedBy, isUploading } = image;
  const config = statusConfig[status];
  const [isImageLoading, setIsImageLoading] = useState(true);

  const getAiHint = (imageName: string): string => {
    return imageName.split('.')[0].replace(/-/g, ' ').split(' ').slice(0, 2).join(' ');
  };

  const handleRetryUpload = () => {
    // This functionality is now largely deprecated as uploads are instant.
    // Kept for potential "error" states during initial upload if that logic is added.
    onUpload(id); 
  }
  
  const handleDownload = async () => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();
    } catch (error) {
        console.error("Download failed:", error);
        // You could add a toast here to notify the user
    }
  };
  
  const isClaimedByCurrentUser = status === 'in-progress' && claimedBy === currentUser;
  const isClaimedByOther = status === 'in-progress' && claimedBy && claimedBy !== currentUser;

  return (
    <Card className="flex flex-col overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-lg">
      <CardContent className="p-0">
        <div className="aspect-video relative bg-muted">
          {isImageLoading && <Skeleton className="absolute inset-0 w-full h-full" />}
          <Image 
            src={url} 
            alt={name} 
            fill 
            className={`object-cover transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
            data-ai-hint={getAiHint(name)} 
            unoptimized
            onLoad={() => setIsImageLoading(false)}
            onError={() => setIsImageLoading(false)}
          />
        </div>
      </CardContent>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2 gap-2">
            <h3 className="font-semibold text-sm leading-snug break-all text-foreground">{name}</h3>
            <Badge variant={config.variant} className="flex-shrink-0">{config.label}</Badge>
        </div>
        {status === 'in-progress' && claimedBy && (
            <div className="flex items-center text-xs text-muted-foreground mb-4">
                <User className="w-3 h-3 mr-1.5"/>
                Claimed by {claimedBy}
            </div>
        )}
        <div className="flex-grow"></div>
        <CardFooter className="p-0 mt-4">
            <div className="w-full flex items-center justify-between gap-2">
                <div className='flex-1'>
                    {status === 'uploaded' && (
                        <Button onClick={() => onClaim(id)} size="sm" className="w-full">
                            <GitBranch className="mr-2 h-4 w-4"/>
                            Claim Task
                        </Button>
                    )}
                    {isClaimedByCurrentUser && (
                         <div className="w-full flex items-center gap-2">
                            <Button onClick={handleDownload} size="sm" variant="secondary" className="flex-1">
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button size="sm" className="flex-1">
                                        <PartyPopper className="mr-2 h-4 w-4" />
                                        Complete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Mark as Complete?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    This will remove the image <span className="font-semibold">{name}</span> from the queue. Make sure you have finished your work with it.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onDelete(id)}>Confirm</AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )}
                    {isClaimedByOther && (
                        <Button size="sm" className="w-full" disabled>
                            <Ban className="mr-2 h-4 w-4"/>
                            Claimed by other
                        </Button>
                    )}
                     {status === 'queued' && (
                        <div className="flex items-center justify-center text-sm font-medium text-muted-foreground">
                           Awaiting Upload
                        </div>
                    )}
                    {status === 'error' && (
                       <Button onClick={handleRetryUpload} variant="destructive" size="sm" className="w-full" disabled={isUploading}>
                            {isUploading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                            ) : (
                                <RefreshCcw className="mr-2 h-4 w-4"/>
                            )}
                            {isUploading ? 'Retrying...' : 'Retry Upload'}
                        </Button>
                    )}
                </div>
                
                <AlertDialog>
                  <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" disabled={isClaimedByOther}>
                                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive"/>
                                  <span className="sr-only">Delete</span>
                              </Button>
                            </AlertDialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                              <p>Remove from queue</p>
                          </TooltipContent>
                      </Tooltip>
                  </TooltipProvider>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the
                        image <span className="font-semibold">{name}</span> from the queue and the server.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(id)}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            </div>
        </CardFooter>
      </div>
    </Card>
  );
}
