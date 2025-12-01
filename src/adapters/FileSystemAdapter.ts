export interface FileSystemAdapter {
  join(...paths: string[]): string;
  mkdir(path: string): Promise<void>;
  writeStream(path: string, stream: any): Promise<void>;
  readFile(path: string): Promise<Uint8Array>;
  deleteFile(path: string): Promise<void>;
  getFileSize(path: string): Promise<number>;
  calculateHash(
    path: string,
    algorithm: "sha1" | "sha256" | "md5",
  ): Promise<string>;
  exists(path: string): Promise<boolean>;
  sep: string;
}
