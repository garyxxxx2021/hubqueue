export type ImageStatus = 'queued' | 'in-progress' | 'uploaded' | 'error';

export type ImageFile = {
  id: string;
  name: string;
  url: string;
  status: ImageStatus;
  claimedBy?: string;
  isUploading?: boolean;
};
