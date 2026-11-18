import { spawn } from 'node:child_process';

export function openFile(filePath, platform = process.platform, launch = spawn) {
  const [command, args] = platform === 'darwin'
    ? ['open', [filePath]]
    : platform === 'win32'
      ? ['explorer.exe', [filePath]]
      : ['xdg-open', [filePath]];
  return new Promise((resolve, reject) => {
    const child = launch(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
    child.once('error', reject);
    child.once('spawn', () => { child.unref(); resolve(); });
  });
}
