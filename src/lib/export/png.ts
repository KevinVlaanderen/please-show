import type Sigma from 'sigma';

/**
 * Read pixels from a WebGL canvas using readPixels (works without preserveDrawingBuffer).
 * Returns a new 2D canvas with the captured content.
 */
function captureWebGLCanvas(webglCanvas: HTMLCanvasElement): HTMLCanvasElement | null {
  const gl = webglCanvas.getContext('webgl2') || webglCanvas.getContext('webgl');
  if (!gl) return null;

  const width = webglCanvas.width;
  const height = webglCanvas.height;

  // Read pixels from WebGL
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  // Create a 2D canvas to hold the result
  const canvas2d = document.createElement('canvas');
  canvas2d.width = width;
  canvas2d.height = height;
  const ctx = canvas2d.getContext('2d');
  if (!ctx) return null;

  // Create ImageData and flip vertically (WebGL is bottom-up)
  const imageData = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    const srcRow = (height - y - 1) * width * 4;
    const dstRow = y * width * 4;
    for (let x = 0; x < width * 4; x++) {
      imageData.data[dstRow + x] = pixels[srcRow + x];
    }
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas2d;
}

/**
 * Export the Sigma graph to PNG and trigger download.
 * Composites all canvas layers (hulls, edges, nodes, labels, etc.) into one image.
 *
 * Uses gl.readPixels for WebGL canvases which works without preserveDrawingBuffer.
 */
export async function exportToPng(
  sigma: Sigma,
  filename: string = 'graph'
): Promise<void> {
  return new Promise((resolve) => {
    const capture = () => {
      const canvases = sigma.getCanvases();
      const container = sigma.getContainer();

      // Get dimensions from the container
      const width = container.offsetWidth;
      const height = container.offsetHeight;

      // Create output canvas
      const outputCanvas = document.createElement('canvas');
      const pixelRatio = 2;
      outputCanvas.width = width * pixelRatio;
      outputCanvas.height = height * pixelRatio;

      const ctx = outputCanvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get 2d context');
      }

      // Scale for high DPI
      ctx.scale(pixelRatio, pixelRatio);

      // Fill background
      ctx.fillStyle = '#f8fafc'; // slate-50
      ctx.fillRect(0, 0, width, height);

      // Find and draw the hull canvas first (it's the first canvas child in the container)
      const hullCanvas = container.querySelector('canvas:not([data-sigma])');
      if (hullCanvas instanceof HTMLCanvasElement) {
        ctx.drawImage(hullCanvas, 0, 0, width, height);
      }

      // WebGL layers that need readPixels
      const webglLayers = ['edges', 'nodes'];
      // 2D canvas layers that can use drawImage directly
      const canvas2dLayers = ['edgeLabels', 'labels', 'hovers', 'hoverNodes', 'mouse'];

      // Draw WebGL layers using readPixels
      for (const layer of webglLayers) {
        const canvas = canvases[layer as keyof typeof canvases];
        if (canvas instanceof HTMLCanvasElement) {
          const captured = captureWebGLCanvas(canvas);
          if (captured) {
            ctx.drawImage(captured, 0, 0, width, height);
          }
        }
      }

      // Draw 2D canvas layers directly
      for (const layer of canvas2dLayers) {
        const canvas = canvases[layer as keyof typeof canvases];
        if (canvas instanceof HTMLCanvasElement) {
          ctx.drawImage(canvas, 0, 0, width, height);
        }
      }

      // Export to PNG
      const dataUrl = outputCanvas.toDataURL('image/png');

      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();

      resolve();
    };

    // Listen for the next render, then capture immediately
    sigma.once('afterRender', capture);
    // Trigger a render
    sigma.refresh();
  });
}
