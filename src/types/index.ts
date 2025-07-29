export type ImageStatus = 'queued' | 'in-progress' | 'uploaded' | 'error';

export type ImageFile = {
  id: string;
  name: string;
  // Can be a remote URL or a local Data URL
  url: string; 
  status: ImageStatus;
  claimedBy?: string;
  isUploading?: boolean;
};
