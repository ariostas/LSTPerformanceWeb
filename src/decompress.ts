import { gunzipSync } from 'fflate';
import untar from 'js-untar';

export interface DecompressedFile {
  name: string;
  url: string;
}

export async function decompressTarGz(buffer: ArrayBuffer): Promise<DecompressedFile[]> {
  const decompressed = gunzipSync(new Uint8Array(buffer));
  const files = await untar(decompressed.buffer as ArrayBuffer);
  return files
    .filter(file => file.name.endsWith('.pdf'))
    .map(file => ({
      name: file.name,
      url: URL.createObjectURL((file as unknown as { blob: Blob }).blob),
    }));
}

export function revokeFileUrls(files: DecompressedFile[]) {
  files.forEach(file => URL.revokeObjectURL(file.url));
}
