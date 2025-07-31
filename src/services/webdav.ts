'use server';

import { createClient, WebDAVClient } from 'webdav';
import { webdavConfig } from '@/config/webdav';
import type { ImageFile } from '@/types';
import Ably from 'ably';
import { db } from './sqlite';
import { StoredUser, UserRole } from './sqlite';

export type { StoredUser, UserRole };


const ABLY_API_KEY = process.env.ABLY_API_KEY;
const ABLY_CHANNEL_NAME = 'hubqueue:updates';

interface NotificationPayload {
  type: 'add' | 'update' | 'complete' | 'delete' | 'users' | 'maintenance';
  payload: any;
}

// Internal function to notify Ably
async function notifyClients(notification: NotificationPayload) {
  if (!ABLY_API_KEY) {
    console.warn("Ably API Key not found, skipping notification.");
    return;
  }
  try {
    const ably = new Ably.Rest(ABLY_API_KEY);
    const channel = ably.channels.get(ABLY_CHANNEL_NAME);
    let messageName = '';
    let messageData = notification.payload;

    switch(notification.type) {
      case 'add':
        messageName = 'image_added';
        break;
      case 'update':
        messageName = 'image_updated';
        break;
      case 'complete':
        messageName = 'image_completed';
        break;
      case 'delete':
        messageName = 'image_deleted';
        break;
      default:
        messageName = 'general_update';
        messageData = { type: notification.type };
    }
    
    await channel.publish(messageName, messageData);
  } catch (error) {
    console.error('Failed to notify Ably:', error);
  }
}

function getWebdavClient(): WebDAVClient {
  if (!webdavConfig.url || !webdavConfig.username || !webdavConfig.password) {
    throw new Error('WebDAV configuration is incomplete. Please check your .env file.');
  }
  return createClient(webdavConfig.url, {
    username: webdavConfig.username,
    password: webdavConfig.password,
  });
}

const UPLOADS_DIR = '/uploads';

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


export async function getImageList(): Promise<ImageFile[]> {
    return db.prepare("SELECT * FROM images WHERE status != 'completed' ORDER BY createdAt DESC").all() as ImageFile[];
}

export async function addImage(image: Omit<ImageFile, 'url'>): Promise<{success: boolean, error?: string}> {
    try {
        const newImage: ImageFile = {
            ...image,
            url: `/api/image?path=${encodeURIComponent(image.webdavPath)}`,
        }
        db.prepare(
            `INSERT INTO images (id, name, webdavPath, url, status, uploadedBy, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(newImage.id, newImage.name, newImage.webdavPath, newImage.url, newImage.status, newImage.uploadedBy, newImage.createdAt);

        await notifyClients({ type: 'add', payload: newImage });
        return { success: true };
    } catch(error: any) {
        console.error('Failed to add image to DB', error);
        return { success: false, error: error.message };
    }
}

export async function updateImage(image: ImageFile): Promise<{success: boolean, error?: string}> {
    try {
        db.prepare(
            `UPDATE images 
             SET status = ?, claimedBy = ?, completedBy = ?, completionNotes = ?, completedAt = ?
             WHERE id = ?`
        ).run(image.status, image.claimedBy, image.completedBy, image.completionNotes, image.completedAt, image.id);
        
        const notificationType = image.status === 'completed' ? 'complete' : 'update';
        const payload = image.status === 'completed' 
            ? { imageId: image.id, completedImage: image }
            : image;

        await notifyClients({ type: notificationType, payload });
        return { success: true };
    } catch (error: any) {
        console.error('Failed to update image in DB', error);
        return { success: false, error: error.message };
    }
}

export async function deleteImage(id: string): Promise<{success: boolean, error?: string}> {
    try {
        db.prepare("DELETE FROM images WHERE id = ?").run(id);
        await notifyClients({ type: 'delete', payload: { imageId: id } });
        return { success: true };
    } catch (error: any) {
        console.error('Failed to delete image from DB', error);
        return { success: false, error: error.message };
    }
}

export async function getHistoryList(): Promise<ImageFile[]> {
    return db.prepare("SELECT * FROM images WHERE status = 'completed' ORDER BY completedAt DESC").all() as ImageFile[];
}

export async function getUsers(): Promise<StoredUser[]> {
    return db.prepare("SELECT * FROM users").all() as StoredUser[];
}

export async function saveUsers(users: StoredUser[]): Promise<{success: boolean, error?: string}> {
    const insert = db.prepare('INSERT OR REPLACE INTO users (username, passwordHash, role) VALUES (?, ?, ?)');
    const deleteAll = db.prepare('DELETE FROM users');

    const transaction = db.transaction((userList: StoredUser[]) => {
        deleteAll.run();
        for (const user of userList) {
            insert.run(user.username, user.passwordHash, user.role);
        }
    });

    try {
        transaction(users);
        await notifyClients({ type: 'users', payload: {} });
        return { success: true };
    } catch (error: any) {
        console.error('Failed to save users to DB', error);
        return { success: false, error: error.message };
    }
}

export async function addUser(user: StoredUser): Promise<{success: boolean, error?: string}> {
    try {
        db.prepare(
            'INSERT INTO users (username, passwordHash, role) VALUES (?, ?, ?)'
        ).run(user.username, user.passwordHash, user.role);
        return { success: true };
    } catch (error: any) {
        if ((error as any).code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
             return { success: false, error: 'User already exists.' };
        }
        console.error('Failed to add user to DB', error);
        return { success: false, error: error.message };
    }
}

export async function getMaintenanceStatus(): Promise<{ isMaintenance: boolean }> {
  try {
    const row: any = db.prepare("SELECT value FROM app_settings WHERE key = 'maintenanceMode'").get();
    return { isMaintenance: row ? row.value === 'true' : false };
  } catch (error) {
    return { isMaintenance: false };
  }
}

export async function saveMaintenanceStatus(status: { isMaintenance: boolean }): Promise<{ success: boolean, error?: string }> {
  try {
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('maintenanceMode', ?)")
      .run(status.isMaintenance.toString());
    await notifyClients({ type: 'maintenance', payload: {} });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: (error as Error).message };
  }
}