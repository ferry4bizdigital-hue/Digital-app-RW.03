import { getAccessToken } from './googleAuthService';

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  parents?: string[];
  isFolder: boolean;
}

export interface DriveQuota {
  limit?: string;
  usage?: string;
  usageInDrive?: string;
  usageInDriveTrash?: string;
  userDisplayName?: string;
  userEmail?: string;
  userPhoto?: string;
}

export class GoogleDriveService {
  private static async getAuthHeaders(): Promise<HeadersInit> {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Belum terhubung ke Google Drive. Silakan hubungkan akun Google terlebih dahulu.');
    }
    return {
      Authorization: `Bearer ${token}`
    };
  }

  /**
   * Mengambil daftar file dan folder dalam folder tertentu (atau root)
   */
  public static async listFiles(
    folderId?: string, 
    searchKeyword?: string
  ): Promise<{ files: DriveItem[]; nextPageToken?: string }> {
    const headers = await this.getAuthHeaders();

    let queryParts = ['trashed = false'];
    if (folderId) {
      queryParts.push(`'${folderId}' in parents`);
    } else {
      // Default to root if no search keyword, or allow all files when searching
      if (!searchKeyword) {
        queryParts.push(`'root' in parents`);
      }
    }

    if (searchKeyword && searchKeyword.trim()) {
      const sanitized = searchKeyword.replace(/'/g, "\\'");
      queryParts.push(`name contains '${sanitized}'`);
    }

    const q = encodeURIComponent(queryParts.join(' and '));
    const fields = encodeURIComponent('nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, iconLink, thumbnailLink, parents)');
    const orderBy = encodeURIComponent('folder, modifiedTime desc');

    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=${orderBy}&pageSize=100`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Gagal mengambil daftar file Drive: ${res.statusText}`);
    }

    const data = await res.json();
    const items: DriveItem[] = (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size,
      modifiedTime: f.modifiedTime,
      webViewLink: f.webViewLink,
      webContentLink: f.webContentLink,
      iconLink: f.iconLink,
      thumbnailLink: f.thumbnailLink,
      parents: f.parents,
      isFolder: f.mimeType === 'application/vnd.google-apps.folder'
    }));

    return { files: items, nextPageToken: data.nextPageToken };
  }

  /**
   * Membuat folder baru di Google Drive
   */
  public static async createFolder(folderName: string, parentFolderId?: string): Promise<DriveItem> {
    const headers = await this.getAuthHeaders();

    const metadata: Record<string, any> = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };

    if (parentFolderId) {
      metadata.parents = [parentFolderId];
    }

    const res = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Gagal membuat folder di Google Drive');
    }

    const data = await res.json();
    return {
      id: data.id,
      name: data.name,
      mimeType: data.mimeType,
      modifiedTime: new Date().toISOString(),
      isFolder: true
    };
  }

  /**
   * Mengunggah file (File object) ke Google Drive menggunakan Multipart Upload
   */
  public static async uploadFile(
    file: File, 
    parentFolderId?: string,
    customName?: string
  ): Promise<DriveItem> {
    const token = await getAccessToken();
    if (!token) throw new Error('Akses Google Drive belum tersedia');

    const metadata: Record<string, any> = {
      name: customName || file.name,
      mimeType: file.type || 'application/octet-stream'
    };

    if (parentFolderId) {
      metadata.parents = [parentFolderId];
    }

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
    const mediaPartHeader = `${delimiter}Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;

    const fileBuffer = await file.arrayBuffer();

    const body = new Blob([
      metadataPart,
      mediaPartHeader,
      fileBuffer,
      closeDelimiter
    ], { type: `multipart/related; boundary=${boundary}` });

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink,webContentLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Gagal mengunggah file ke Google Drive');
    }

    const data = await res.json();
    return {
      id: data.id,
      name: data.name,
      mimeType: data.mimeType,
      size: data.size,
      modifiedTime: data.modifiedTime,
      webViewLink: data.webViewLink,
      webContentLink: data.webContentLink,
      isFolder: false
    };
  }

  /**
   * Mengunggah data JSON (seperti Backup Database RW 03) ke Google Drive
   */
  public static async uploadJsonBackup(
    jsonData: object, 
    fileName: string, 
    parentFolderId?: string
  ): Promise<DriveItem> {
    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const file = new File([blob], fileName, { type: 'application/json' });
    return this.uploadFile(file, parentFolderId, fileName);
  }

  /**
   * Mengunduh isi teks file dari Google Drive (misalnya file backup JSON)
   */
  public static async downloadFileText(fileId: string): Promise<string> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers
    });

    if (!res.ok) {
      throw new Error(`Gagal mengunduh file: ${res.statusText}`);
    }

    return await res.text();
  }

  /**
   * Menghapus file dari Google Drive
   * (PERINGATAN: Harus selalu didahului konfirmasi user sebelum dipanggil)
   */
  public static async deleteFile(fileId: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers
    });

    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Gagal menghapus file dari Google Drive');
    }
  }

  /**
   * Membaca informasi kuota penyimpanan dan akun user Google Drive
   */
  public static async getAboutInfo(): Promise<DriveQuota> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
      headers
    });

    if (!res.ok) {
      return {};
    }

    const data = await res.json();
    return {
      limit: data.storageQuota?.limit,
      usage: data.storageQuota?.usage,
      usageInDrive: data.storageQuota?.usageInDrive,
      usageInDriveTrash: data.storageQuota?.usageInDriveTrash,
      userDisplayName: data.user?.displayName,
      userEmail: data.user?.emailAddress,
      userPhoto: data.user?.photoLink
    };
  }

  /**
   * Menyiapkan folder struktur standar RW 03 di Google Drive pengguna
   */
  public static async ensureRwFolderStructure(): Promise<{
    rootFolder: DriveItem;
    subFolders: Record<string, DriveItem>;
  }> {
    // 1. Cari folder "Digital RW 03 Kebon Kangkung"
    const { files: existingRoots } = await this.listFiles(undefined, 'Digital RW 03 Kebon Kangkung');
    let rootFolder = existingRoots.find(f => f.isFolder && f.name === 'Digital RW 03 Kebon Kangkung');

    if (!rootFolder) {
      rootFolder = await this.createFolder('Digital RW 03 Kebon Kangkung');
    }

    // 2. Cari / buat subfolder
    const targetSubFolders = [
      'Cadangan Data (Backup DB)',
      'Arsip Surat Pengantar RT-RW',
      'Laporan Keuangan & Kas RW',
      'Bukti Pembayaran Iuran',
      'Dokumentasi & Inventaris Lingkungan'
    ];

    const { files: currentSubs } = await this.listFiles(rootFolder.id);
    const subFolders: Record<string, DriveItem> = {};

    for (const name of targetSubFolders) {
      let found = currentSubs.find(f => f.isFolder && f.name === name);
      if (!found) {
        found = await this.createFolder(name, rootFolder.id);
      }
      subFolders[name] = found;
    }

    return { rootFolder, subFolders };
  }
}
