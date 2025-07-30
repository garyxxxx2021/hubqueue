
'use server';

import { createClient, WebDAVClient, FileStat } from 'webdav';
import { webdavConfig } from '@/config/webdav';
import type { ImageFile } from '@/types';

const IMAGES_JSON_PATH = '/images.json';
const HISTORY_JSON_PATH = '/history.json';
const USERS_JSON_PATH = '/users.json';
const MAINTENANCE_JSON_PATH = '/maintenance.json';
const UPLOADS_DIR = '/uploads';

let lastCleanupTime = 0;
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes


export type UserRole = 'admin' | 'trusted' | 'user' | 'banned';

export interface StoredUser {
  username: string;
  passwordHash: string;
  role: UserRole;
}

// This is the old format, kept for migration purposes.
interface LegacyStoredUser {
  username: string;
  passwordHash: string;
  isAdmin: boolean;
  isTrusted: boolean;
  isBanned?: boolean;
}


function getClient(): WebDAVClient {
  if (!webdavConfig.url || !webdavConfig.username || !webdavConfig.password) {
    throw new Error('WebDAV configuration is incomplete. Please check your .env file.');
  }
  return createClient(webdavConfig.url, {
    username: webdavConfig.username,
    password: webdavConfig.password,
  });
}

function migrateUser(user: LegacyStoredUser | StoredUser): StoredUser {
    if ('role' in user) {
        return user; // Already new format
    }
    // Migration logic for old format
    const legacyUser = user as LegacyStoredUser;
    let role: UserRole = 'user';
    if (legacyUser.isAdmin) {
        role = 'admin';
    } else if (legacyUser.isTrusted) {
        role = 'trusted';
    }
    if (legacyUser.isBanned) {
        role = 'banned';
    }
    return {
        username: legacyUser.username,
        passwordHash: legacyUser.passwordHash,
        role: role
    };
}


export async function uploadToWebdav(fileName: string, dataUrl: string): Promise<{success: boolean, path?: string, error?: string}> {
  const client = getClient();
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

export async function getImageList(): Promise<ImageFile[]> {
  const client = getClient();
  try {
    if (await client.exists(IMAGES_JSON_PATH)) {
      const content = await client.getFileContents(IMAGES_JSON_PATH, { format: 'text' });
      return JSON.parse(content as string);
    }
    return [];
  } catch (error: any) {
    console.error('Failed to get image list from WebDAV', error);
    return [];
  }
}

export async function saveImageList(images: ImageFile[]): Promise<{success: boolean, error?: string}> {
  const client = getClient();
  try {
    await client.putFileContents(IMAGES_JSON_PATH, JSON.stringify(images, null, 2));
    console.log('Image list saved successfully to WebDAV.');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to save image list to WebDAV', error);
    return { success: false, error: error.message || 'An unknown error occurred during save.' };
  }
}

export async function getHistoryList(): Promise<ImageFile[]> {
  const client = getClient();
  try {
    if (await client.exists(HISTORY_JSON_PATH)) {
      const content = await client.getFileContents(HISTORY_JSON_PATH, { format: 'text' });
      return JSON.parse(content as string);
    }
    return [];
  } catch (error: any) {
    console.error('Failed to get history list from WebDAV', error);
    return [];
  }
}

export async function saveHistoryList(images: ImageFile[]): Promise<{success: boolean, error?: string}> {
  const client = getClient();
  try {
    await client.putFileContents(HISTORY_JSON_PATH, JSON.stringify(images, null, 2));
    console.log('History list saved successfully to WebDAV.');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to save history list to WebDAV', error);
    return { success: false, error: error.message || 'An unknown error occurred during save.' };
  }
}

export async function deleteWebdavFile(path: string): Promise<{success: boolean, error?: string}> {
    const client = getClient();
    try {
        if (await client.exists(path)) {
            await client.deleteFile(path);
        }
        return { success: true };
    } catch (error: any) {
        console.error(`Failed to delete file from WebDAV: ${path}`, error);
        // Return the error message, which might include status code like 404
        return { success: false, error: error.message || 'Unknown error' };
    }
}

async function cleanupOrphanedFiles(): Promise<void> {
    const client = getClient();
    try {
        if (!(await client.exists(UPLOADS_DIR))) {
            console.log("Uploads directory does not exist, skipping cleanup.");
            return;
        }

        const [directoryContents, images, history] = await Promise.all([
            client.getDirectoryContents(UPLOADS_DIR),
            getImageList(),
            getHistoryList()
        ]);
        
        const knownImagePaths = new Set([
            ...images.map(img => img.webdavPath),
            ...history.map(img => img.webdavPath)
        ]);

        const filesInUploads = (directoryContents as FileStat[]).filter(item => item.type === 'file');

        for (const file of filesInUploads) {
            if (!knownImagePaths.has(file.filename)) {
                console.log(`[Lazy Deletion] Deleting orphaned file: ${file.filename}`);
                await deleteWebdavFile(file.filename);
            }
        }
    } catch (error: any) {
        console.error("[Lazy Deletion] Error during orphaned file cleanup:", error.message);
    }
}


export async function getUsers(): Promise<StoredUser[]> {
  const client = getClient();
  try {
    if (await client.exists(USERS_JSON_PATH)) {
      const content = await client.getFileContents(USERS_JSON_PATH, { format: 'text' });
      const users = JSON.parse(content as string) as (StoredUser | LegacyStoredUser)[];
      // Check if migration is needed
      const needsMigration = users.some(u => !('role' in u));
      const migratedUsers = users.map(migrateUser);

      // If migration occurred, save the updated file
      if (needsMigration) {
        await saveUsers(migratedUsers);
      }
      return migratedUsers;
    }
    return [];
  } catch (error) {
    console.error("Failed to get or migrate users:", error);
    return [];
  }
}

export async function saveUsers(users: StoredUser[]): Promise<{success: boolean, error?: string}> {
  const client = getClient();
  try {
    await client.putFileContents(USERS_JSON_PATH, JSON.stringify(users, null, 2));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMaintenanceStatus(): Promise<{ isMaintenance: boolean }> {
  const client = getClient();
  try {
    const now = Date.now();
    if (now - lastCleanupTime > CLEANUP_INTERVAL) {
        console.log("[Lazy Deletion] Triggering cleanup task from server...");
        lastCleanupTime = now;
        // Run cleanup but don't wait for it to finish to not slow down the request
        cleanupOrphanedFiles().catch(err => console.error("[Lazy Deletion] Background cleanup failed:", err));
    }

    if (await client.exists(MAINTENANCE_JSON_PATH)) {
      const content = await client.getFileContents(MAINTENANCE_JSON_PATH, { format: 'text' });
      return JSON.parse(content as string);
    }
    return { isMaintenance: false };
  } catch (error) {
    return { isMaintenance: false };
  }
}

export async function saveMaintenanceStatus(status: { isMaintenance: boolean }): Promise<{ success: boolean, error?: string }> {
  const client = getClient();
  try {
    await client.putFileContents(MAINTENANCE_JSON_PATH, JSON.stringify(status, null, 2));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

    