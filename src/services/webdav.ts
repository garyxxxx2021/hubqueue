'use server';

import { createClient } from 'webdav';
import { webdavConfig } from '@/config/webdav';

export async function uploadToWebdav(fileName: string, dataUrl: string): Promise<{success: boolean, path?: string, error?: string}> {
  if (!webdavConfig.url || !webdavConfig.username || !webdavConfig.password) {
    const errorMessage = 'WebDAV configuration is incomplete. Please check your .env file.';
    console.error(errorMessage);
    return { success: false, error: errorMessage };
  }

  const client = createClient(webdavConfig.url, {
    username: webdavConfig.username,
    password: webdavConfig.password,
  });

  const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
  
  try {
    const filePath = `/uploads/${fileName}`;
    // Ensure the directory exists
    if (!(await client.exists('/uploads'))) {
        await client.createDirectory('/uploads');
    }

    const success = await client.putFileContents(filePath, buffer);
    if (success) {
      console.log(`${fileName} uploaded successfully.`);
      return { success: true, path: filePath };
    } else {
      throw new Error('WebDAV server returned an error on upload.');
    }
  } catch (error: any) {
    console.error('Failed to upload to WebDAV', error);
    // Rethrow a more user-friendly error or return a structured error response
    return { success: false, error: error.message || 'An unknown error occurred during upload.' };
  }
}
