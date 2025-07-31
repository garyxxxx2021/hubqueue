
'use server';

import { createClient, WebDAVClient } from 'webdav';
import { webdavConfig } from '@/config/webdav';
import type { ImageFile } from '@/types';
import Ably from 'ably';

// Define types locally since sqlite.ts is removed
export type UserRole = 'admin' | 'trusted' | 'user' | 'banned';
export interface StoredUser {
  username: string;
  passwordHash: string;
  role: UserRole;
}


const ABLY_API_KEY = process.env.ABLY_API_KEY;
const ABLY_CHANNEL_NAME = 'hubqueue:updates';

// --- File Paths on WebDAV ---
const USERS_FILE = '/users.json';
const IMAGES_FILE = '/images.json';
const HISTORY_FILE = '/history.json';
const MAINTENANCE_FILE = '/maintenance.json';
const UPLOADS_DIR = '/uploads';
const LOCK_FILE = '/~lock';


// --- WebDAV Client & Locking Mechanism ---

function getWebdavClient(): WebDAVClient {
  if (!webdavConfig.url || !webdavConfig.username || !webdavConfig.password) {
    throw new Error('WebDAV configuration is incomplete. Please check your .env file.');
  }
  return createClient(webdavConfig.url, {
    username: webdavConfig.username,
    password: webdavConfig.password,
  });
}

const acquireLock = async (client: WebDAVClient, retries = 5, delay = 200): Promise<boolean> => {
  for (let i = 0; i < retries; i++) {
    try {
      // The 'wx' flag means "write if not exists", which is an atomic operation for locking.
      await client.putFileContents(LOCK_FILE, '', { flag: 'wx' });
      return true; // Lock acquired
    } catch (error: any) {
      if (error.status === 412) { // Precondition Failed - lock file exists
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error; // Other unexpected error
      }
    }
  }
  return false; // Failed to acquire lock
};

const releaseLock = async (client: WebDAVClient) => {
  try {
    if (await client.exists(LOCK_FILE)) {
      await client.deleteFile(LOCK_FILE);
    }
  } catch (error) {
    console.error("Failed to release lock, it may need to be manually removed:", error);
  }
};


// --- Ably Notifications ---

async function notifyClients(messageName: string, messageData: any) {
  if (!ABLY_API_KEY) {
    console.warn("Ably API Key not found, skipping notification.");
    return;
  }
  try {
    const ably = new Ably.Rest(ABLY_API_KEY);
    const channel = ably.channels.get(ABLY_CHANNEL_NAME);
    await channel.publish(messageName, messageData);
  } catch (error) {
    console.error('Failed to notify Ably:', error);
  }
}


// --- Generic Read/Write with Locking ---

async function readFile<T>(client: WebDAVClient, filePath: string, defaultValue: T): Promise<T> {
    try {
        if (await client.exists(filePath)) {
            const content = await client.getFileContents(filePath, { format: 'text' }) as string;
            return JSON.parse(content) as T;
        }
    } catch (error) {
        console.error(`Failed to read or parse ${filePath}, returning default.`, error);
    }
    return defaultValue;
}


async function writeFile<T>(client: WebDAVClient, filePath: string, data: T): Promise<{success: boolean, error?: string}> {
    try {
        await client.putFileContents(filePath, JSON.stringify(data, null, 2));
        return { success: true };
    } catch (error: any) {
        console.error(`Failed to write to ${filePath}.`, error);
        return { success: false, error: error.message };
    }
}


// --- High-Level Data Functions ---

export async function getUsers(): Promise<StoredUser[]> {
    const client = getWebdavClient();
    return readFile<StoredUser[]>(client, USERS_FILE, []);
}

export async function saveUsers(users: StoredUser[]): Promise<{success: boolean, error?: string}> {
    const client = getWebdavClient();
    if (!await acquireLock(client)) return { success: false, error: 'Could not acquire a lock to save users. Please try again.' };

    try {
        const result = await writeFile(client, USERS_FILE, users);
        if (result.success) {
            await notifyClients('users_updated', {});
        }
        return result;
    } finally {
        await releaseLock(client);
    }
}


export async function addUser(user: StoredUser): Promise<{success: boolean, error?: string}> {
    const client = getWebdavClient();
    if (!await acquireLock(client)) return { success: false, error: 'Could not acquire a lock to add user. Please try again.' };

    try {
        const users = await getUsers();
        if (users.some(u => u.username === user.username)) {
            return { success: false, error: 'User already exists.' };
        }
        users.push(user);
        return await saveUsers(users);
    } finally {
        await releaseLock(client);
    }
}

export async function getImageList(): Promise<ImageFile[]> {
    const client = getWebdavClient();
    const images = await readFile<ImageFile[]>(client, IMAGES_FILE, []);
    return images.map(img => ({
        ...img,
        url: `/api/image?path=${encodeURIComponent(img.webdavPath)}`
    }));
}

export async function addImage(image: Omit<ImageFile, 'url'>): Promise<{success: boolean, error?: string}> {
    const client = getWebdavClient();
    if (!await acquireLock(client)) return { success: false, error: 'Could not acquire a lock to add image. Please try again.' };

    try {
        const images = await readFile<ImageFile[]>(client, IMAGES_FILE, []);
        const newImageWithUrl = { ...image, url: `/api/image?path=${encodeURIComponent(image.webdavPath)}` };
        images.unshift(newImageWithUrl); // Add to the beginning
        const result = await writeFile(client, IMAGES_FILE, images);
        if (result.success) {
            await notifyClients('image_added', newImageWithUrl);
        }
        return result;
    } finally {
        await releaseLock(client);
    }
}


export async function updateImage(image: ImageFile): Promise<{success: boolean, error?: string}> {
    const client = getWebdavClient();
    if (!await acquireLock(client)) return { success: false, error: 'Could not acquire a lock to update image. Please try again.' };

    try {
        if (image.status === 'completed') {
             // Move from images.json to history.json
            const images = await readFile<ImageFile[]>(client, IMAGES_FILE, []);
            const history = await readFile<ImageFile[]>(client, HISTORY_FILE, []);

            const imageToMoveIndex = images.findIndex(img => img.id === image.id);
            if (imageToMoveIndex === -1) return { success: false, error: 'Image not found in queue.' };

            const [imageToMove] = images.splice(imageToMoveIndex, 1);
            const updatedImage = { ...imageToMove, ...image };
            history.unshift(updatedImage); // Add to beginning of history

            const saveImagesResult = await writeFile(client, IMAGES_FILE, images);
            const saveHistoryResult = await writeFile(client, HISTORY_FILE, history);
            
            if (saveImagesResult.success && saveHistoryResult.success) {
                 await notifyClients('image_completed', { imageId: image.id, completedImage: updatedImage });
                 return { success: true };
            } else {
                // Attempt to rollback, though it's tricky. Best-effort.
                images.splice(imageToMoveIndex, 0, imageToMove);
                await writeFile(client, IMAGES_FILE, images);
                return { success: false, error: 'Failed to complete image transaction.' };
            }

        } else {
            // Just update in images.json
            const images = await readFile<ImageFile[]>(client, IMAGES_FILE, []);
            const imageIndex = images.findIndex(img => img.id === image.id);
            if (imageIndex === -1) return { success: false, error: 'Image not found in queue.' };
            
            images[imageIndex] = { ...images[imageIndex], ...image };
            const result = await writeFile(client, IMAGES_FILE, images);
            if (result.success) {
                 await notifyClients('image_updated', images[imageIndex]);
            }
            return result;
        }
    } finally {
        await releaseLock(client);
    }
}

export async function deleteImage(id: string): Promise<{success: boolean, error?: string}> {
    const client = getWebdavClient();
    if (!await acquireLock(client)) return { success: false, error: 'Could not acquire a lock to delete image. Please try again.' };

    try {
        const images = await readFile<ImageFile[]>(client, IMAGES_FILE, []);
        const filteredImages = images.filter(img => img.id !== id);

        if (images.length === filteredImages.length) {
            return { success: false, error: 'Image not found to delete.' };
        }

        const result = await writeFile(client, IMAGES_FILE, filteredImages);
        if (result.success) {
            await notifyClients('image_deleted', { imageId: id });
        }
        return result;
    } finally {
        await releaseLock(client);
    }
}


export async function getHistoryList(): Promise<ImageFile[]> {
    const client = getWebdavClient();
    const history = await readFile<ImageFile[]>(client, HISTORY_FILE, []);
    return history.map(img => ({
        ...img,
        url: `/api/image?path=${encodeURIComponent(img.webdavPath)}`
    }));
}


export async function getMaintenanceStatus(): Promise<{ isMaintenance: boolean }> {
    const client = getWebdavClient();
    return readFile<{ isMaintenance: boolean }>(client, MAINTENANCE_FILE, { isMaintenance: false });
}

export async function saveMaintenanceStatus(status: { isMaintenance: boolean }): Promise<{ success: boolean, error?: string }> {
    const client = getWebdavClient();
    const result = await writeFile(client, MAINTENANCE_FILE, status);
    if(result.success) {
        await notifyClients('maintenance_updated', {});
    }
    return result;
}

export async function uploadToWebdav(fileName: string, dataUrl: string): Promise<{success: boolean, path?: string, error?: string}> {
  const client = getWebdavClient();
  const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
  
  try {
    const filePath = `${UPLOADS_DIR}/${fileName}`;
    
    if (!(await client.exists(UPLOADS_DIR))) {
        await client.createDirectory(UPLOADS_DIR);
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
    return { success: false, error: error.message || 'An unknown error occurred during upload.' };
  }
}
