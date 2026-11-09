/**
 * Scanline flood fill algorithm on HTML5 canvas ImageData.
 */
export function hexToRgb(hex: string): [number, number, number] {
  let c = hex.replace("#", "");
  if (c.length === 3) {
    c = c
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  const num = parseInt(c, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function floodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColorHex: string,
  tolerance: number = 32
): boolean {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    return false;
  }

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const startIndex = (startY * width + startX) * 4;
  const startR = data[startIndex];
  const startG = data[startIndex + 1];
  const startB = data[startIndex + 2];
  const startA = data[startIndex + 3];

  const [fillR, fillG, fillB] = hexToRgb(fillColorHex);
  const fillA = 255;

  // Don't fill if starting color matches target color closely
  if (
    Math.abs(startR - fillR) < 5 &&
    Math.abs(startG - fillG) < 5 &&
    Math.abs(startB - fillB) < 5 &&
    Math.abs(startA - fillA) < 5
  ) {
    return false;
  }

  const colorMatch = (idx: number): boolean => {
    const dr = Math.abs(data[idx] - startR);
    const dg = Math.abs(data[idx + 1] - startG);
    const db = Math.abs(data[idx + 2] - startB);
    const da = Math.abs(data[idx + 3] - startA);
    return dr <= tolerance && dg <= tolerance && db <= tolerance && da <= tolerance;
  };

  const pixelStack: [number, number][] = [[startX, startY]];
  const visited = new Uint8Array(width * height);

  while (pixelStack.length > 0) {
    const [curX, curY] = pixelStack.pop()!;
    let y = curY;

    // Scan upwards
    while (y >= 0 && colorMatch((y * width + curX) * 4) && !visited[y * width + curX]) {
      y--;
    }
    y++;

    let reachLeft = false;
    let reachRight = false;

    // Scan downwards
    while (y < height && colorMatch((y * width + curX) * 4) && !visited[y * width + curX]) {
      const idx = (y * width + curX) * 4;
      data[idx] = fillR;
      data[idx + 1] = fillG;
      data[idx + 2] = fillB;
      data[idx + 3] = fillA;
      visited[y * width + curX] = 1;

      if (curX > 0) {
        if (colorMatch((y * width + (curX - 1)) * 4) && !visited[y * width + (curX - 1)]) {
          if (!reachLeft) {
            pixelStack.push([curX - 1, y]);
            reachLeft = true;
          }
        } else if (reachLeft) {
          reachLeft = false;
        }
      }

      if (curX < width - 1) {
        if (colorMatch((y * width + (curX + 1)) * 4) && !visited[y * width + (curX + 1)]) {
          if (!reachRight) {
            pixelStack.push([curX + 1, y]);
            reachRight = true;
          }
        } else if (reachRight) {
          reachRight = false;
        }
      }

      y++;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return true;
}
