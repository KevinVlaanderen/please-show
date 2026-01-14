import { toPng } from 'html-to-image';

/**
 * Export a DOM element to PNG and trigger download
 */
export async function exportToPng(
  element: HTMLElement,
  filename: string = 'graph'
): Promise<void> {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    backgroundColor: '#f8fafc', // slate-50
    pixelRatio: 2,
  });

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = dataUrl;
  link.click();
}
