export type ImageStatus = 'queued' | 'in-progress' | 'uploaded' | 'error';

export type ImageFile = {
  id: string;
  name: string;
  // This will now store the WebDAV path or a placeholder for display
  url: string; 
  status: ImageStatus;
  claimedBy?: string;
  isUploading?: boolean;
};
