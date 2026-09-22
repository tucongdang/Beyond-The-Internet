import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/forms.body');
provider.addScope('https://www.googleapis.com/auth/forms.responses.readonly');
provider.setCustomParameters({
  prompt: 'consent'
});

let cachedAccessToken: string | null = null;

export const driveService = {
  getAccessToken(): string | null {
    return cachedAccessToken;
  },

  setAccessToken(token: string | null) {
    cachedAccessToken = token;
  },

  isConnected(): boolean {
    return Boolean(cachedAccessToken);
  },

  async authenticate(interactive: boolean = false, forceRefresh: boolean = false): Promise<string | null> {
    if (cachedAccessToken && !forceRefresh) return cachedAccessToken;
    if (!interactive) return cachedAccessToken;
    if (!auth) {
      throw new Error('Firebase Auth chưa sẵn sàng.');
    }
    
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
        return cachedAccessToken;
      }
      throw new Error('Không nhận được Access Token từ Google.');
    } catch (error: any) {
      if (error?.code === 'auth/popup-closed-by-user' || error?.message?.includes('popup-closed-by-user')) {
        throw new Error('Cửa sổ đăng nhập Google đã bị đóng trước khi hoàn tất.');
      } else if (error?.code === 'auth/popup-blocked' || error?.message?.includes('popup-blocked')) {
        throw new Error('Trình duyệt đã chặn cửa sổ Popup. Vui lòng bấm cho phép Popup trên thanh địa chỉ và thử lại.');
      } else if (error?.code === 'auth/cancelled-popup-request' || error?.message?.includes('cancelled-popup-request')) {
        throw new Error('Yêu cầu mở popup Google bị huỷ do có thao tác khác.');
      } else if (error?.code === 'auth/unauthorized-domain') {
        throw new Error('Domain hiện tại chưa được cấp phép trong Firebase Auth Console.');
      } else {
        console.error("Failed to authenticate for Google Workspace:", error);
        throw new Error(error?.message || 'Lỗi đăng nhập tài khoản Google.');
      }
    }
  },

  async uploadImage(base64Data: string, filename: string): Promise<string | null> {
    // Do not trigger background popup if not already authenticated
    if (!cachedAccessToken) {
      return null;
    }

    const token = cachedAccessToken;
    if (!token) return null;

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
