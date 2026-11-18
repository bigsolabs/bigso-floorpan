import { execFileSync } from 'node:child_process';

const APPLESCRIPT = 'POSIX path of (choose folder with prompt "Choose a Floorplan workspace")';

export function createFolderPicker(executor = execFileSync) {
  return function pickFolder(platform = process.platform) {
    if (platform !== 'darwin') throw new Error('Native folder selection is currently available on macOS. Enter the folder path instead.');
    try {
      const selected = executor('osascript', ['-e', APPLESCRIPT], { encoding: 'utf8', timeout: 120_000, maxBuffer: 16_384 }).trim();
      if (!selected) return { cancelled: true };
      return { cancelled: false, path: selected.replace(/\/$/, '') || '/' };
    } catch (error) {
      if (/user canceled|user cancelled|\-128/i.test(`${error.message || ''} ${error.stderr || ''}`)) return { cancelled: true };
      throw new Error(`Could not open the folder picker: ${String(error.stderr || error.message || error).trim()}`);
    }
  };
}

export const pickFolder = createFolderPicker();
