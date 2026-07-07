export interface CommentAttachment {
  fileName: string;    // original user-visible name
  fileSize: number;    // bytes
  mimeType: string;
  storagePath: string; // relative path under STORAGE_ROOT/comments/
}
