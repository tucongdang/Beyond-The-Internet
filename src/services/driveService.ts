import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({
  prompt: 'consent'
});

let cachedAccessToken: string | null = null;

export const driveService = {
  async authenticate(): Promise<string | null> {
    if (cachedAccessToken) return cachedAccessToken;
    
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
        return cachedAccessToken;
      }
      return null;
    } catch (error) {
      console.error("Failed to authenticate for Google Drive:", error);
      return null;
    }
  },

  async uploadImage(base64Data: string, filename: string): Promise<string | null> {
    const token = await this.authenticate();
    if (!token) throw new Error("Google Drive authentication failed.");

    // Extract raw base64 content
    const base64Content = base64Data.split(',')[1];
    
    const metadata = {
      name: filename,
      mimeType: 'image/png'
    };

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: image/png\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      base64Content +
      close_delim;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Drive upload failed: ${err}`);
    }

    const data = await res.json();
    return data.id; // Returns the file ID
  }
};
