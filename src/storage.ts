import { auth } from './firebase';

/**
 * Uploads an image file or blob to the secure backend endpoint.
 * The backend will then upload it to Supabase Storage using a service role key.
 *
 * @param file The file or blob to upload.
 * @param originalName The original name of the file, used by the server.
 * @param folder The destination folder in the Supabase bucket (e.g., 'listings', 'profiles').
 * @returns An object containing the public URL of the uploaded image.
 */
export async function uploadImage(file: File | Blob, originalName: string, folder: 'listings' | 'profiles' | 'hero' | 'health' | 'coupling' | 'coupling_res' | 'lost-found' | string): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Authentication required to upload files.');
  }

  let token = await user.getIdToken();
  const formData = new FormData();
  formData.append('file', file, originalName);
  formData.append('folder', folder);

  let response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (response.status === 401) {
    token = await user.getIdToken(true);
    response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.error || `Server responded with status ${response.status}`);
  }

  if (!result?.url) {
    throw new Error('Upload response did not include a file URL.');
  }

  return result.url;
}
