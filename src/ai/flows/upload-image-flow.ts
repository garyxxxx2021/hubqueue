'use server';
/**
 * @fileOverview An AI flow for uploading images to a WebDAV server.
 *
 * - uploadImage - A function that handles the image upload process.
 * - UploadImageInput - The input type for the uploadImage function.
 * - UploadImageOutput - The return type for the uploadImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { uploadToWebdav } from '@/services/webdav';

export const UploadImageInputSchema = z.object({
  fileName: z.string().describe('The name of the file to upload.'),
  dataUrl: z.string().describe("The image data as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type UploadImageInput = z.infer<typeof UploadImageInputSchema>;

export const UploadImageOutputSchema = z.object({
  success: z.boolean().describe('Whether the upload was successful.'),
  path: z.string().optional().describe('The path to the uploaded file on the WebDAV server.'),
});
export type UploadImageOutput = z.infer<typeof UploadImageOutputSchema>;

const uploadImageFlow = ai.defineFlow(
  {
    name: 'uploadImageFlow',
    inputSchema: UploadImageInputSchema,
    outputSchema: UploadImageOutputSchema,
  },
  async (input) => {
    try {
      const result = await uploadToWebdav(input.fileName, input.dataUrl);
      return {
        success: result.success,
        path: result.path,
      };
    } catch (error) {
      console.error('Upload flow error:', error);
      return {
        success: false,
      };
    }
  }
);

export async function uploadImage(input: UploadImageInput): Promise<UploadImageOutput> {
  return uploadImageFlow(input);
}
