/**
 * Secure clipboard helper with optional automatic clearing timeout.
 */

let clearTimer: NodeJS.Timeout | null = null;

export async function copyToClipboardSecure(
  text: string,
  autoClearSeconds = 30
): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return false;
    }

    await navigator.clipboard.writeText(text);

    if (clearTimer) {
      clearTimeout(clearTimer);
    }

    if (autoClearSeconds > 0) {
      clearTimer = setTimeout(async () => {
        try {
          const currentText = await navigator.clipboard.readText();
          if (currentText === text) {
            await navigator.clipboard.writeText('');
          }
        } catch {
          // Ignore read permissions failure on timeout
        }
      }, autoClearSeconds * 1000);
    }

    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard securely:', err);
    return false;
  }
}
