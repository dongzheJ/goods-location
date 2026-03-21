/**
 * AutoMapper Utility
 * Scans an image for colored regions (Red, Green, Blue, Purple)
 */

export const detectColoredZones = async (imageUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const width = canvas.width;
      const height = canvas.height;

      // Result storage
      const zones = {
        'A': { color: 'red', boxes: [] },
        'B': { color: 'green', boxes: [] },
        'C': { color: 'blue', boxes: [] },
        'D': { color: 'purple', boxes: [] }
      };

      // Color thresholds (simplified)
      const isRed = (r, g, b) => r > 150 && g < 100 && b < 100;
      const isGreen = (r, g, b) => r < 100 && g > 150 && b < 100;
      const isBlue = (r, g, b) => r < 50 && g < 50 && b > 100;
      const isPurple = (r, g, b) => r > 100 && g < 50 && b > 100;

      // Simple scanning with downsampling for performance
      const step = 4; 
      const visited = new Uint8Array(width * height);
      const results = {};

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          let type = null;
          // if (isRed(r, g, b)) type = 'A';
          // else if (isGreen(r, g, b)) type = 'B';
          if (isBlue(r, g, b)) type = 'C';
          else if (isPurple(r, g, b)) type = 'D';

          if (type && !visited[y * width + x]) {
            // Flood fill or simple box estimation
            const box = growBox(x, y, type, data, width, height, visited, isRed, isGreen, isBlue, isPurple);
            if (box.w > 10 && box.h > 10) {
              if (!results[type]) results[type] = [];
              results[type].push(box);
            }
          }
        }
      }

      // Convert to final format
      const shelves = {};
      Object.entries(results).forEach(([type, boxes]) => {
        boxes.forEach((box, i) => {
          const id = `${type}-${String(i + 1).padStart(2, '0')}`;
          shelves[id] = { x: box.x, y: height - box.y - box.h, w: box.w, h: box.h }; // Map to Leaflet CRS.Simple (inverted Y?)
          // Wait, Leaflet CRS.Simple has [0,0] at top-left or bottom-left?
          // Default Leaflet ImageOverlay uses [0,0] as bottom-left usually if not careful.
          // In my current MapView: bounds = [[0, 0], [height, width]].
          // Leaflet's [y, x] for CRS.Simple: [0, 0] is bottom-left, [height, width] is top-right.
          // Canvas's [x, y]: [0, 0] is top-left.
          // Correct mapping: shelf.y = height - canvasY - canvasH;
        });
      });

      resolve(shelves);
    };
    img.src = imageUrl;
  });
};

function growBox(startX, startY, type, data, width, height, visited, isRed, isGreen, isBlue, isPurple) {
  let minX = startX, maxX = startX, minY = startY, maxY = startY;
  const stack = [[startX, startY]];
  const check = (type === 'A') ? isRed : (type === 'B') ? isGreen : (type === 'C') ? isBlue : isPurple;

  while(stack.length > 0) {
    let [cx, cy] = stack.pop();
    if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
    if (visited[cy * width + cx]) continue;

    const idx = (cy * width + cx) * 4;
    if (check(data[idx], data[idx + 1], data[idx + 2])) {
      visited[cy * width + cx] = 1;
      minX = Math.min(minX, cx);
      maxX = Math.max(maxX, cx);
      minY = Math.min(minY, cy);
      maxY = Math.max(maxY, cy);

      // Push neighbors (downsampled)
      stack.push([cx + 4, cy]);
      stack.push([cx - 4, cy]);
      stack.push([cx, cy + 4]);
      stack.push([cx, cy - 4]);
    }
  }

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
