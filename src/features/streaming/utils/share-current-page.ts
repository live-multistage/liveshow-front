// Native share sheet where available, clipboard copy otherwise. `onCopied`
// only fires on the clipboard path — the share sheet is its own feedback.
export async function shareCurrentPage(title: string, onCopied: () => void): Promise<void> {
  const url = window.location.href;
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
    } catch {
      // User cancelled the native share sheet.
    }
    return;
  }
  await navigator.clipboard.writeText(url);
  onCopied();
}
