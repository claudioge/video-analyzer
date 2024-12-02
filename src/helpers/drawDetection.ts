import {Reports} from '@/analyzers/analyzer';

export const drawDetections = (
  canvas: HTMLCanvasElement,
  detections: Reports
) => {
  const ctx = canvas.getContext('2d')!;
  // No need to clear the canvas since we already have the frame drawn

  detections.forEach(detection => {
    if (!detection.bbox || !detection.confidence) return;
    let [centerX, centerY, width, height] = detection.bbox;

    // switch to choose color
    let color = 'red';
    if (detection.found === 'chat') {
      color = 'green';
    } else if (detection.found === 'chat_ai') {
      color = 'red';
    } else if (detection.found === 'email') {
      color = 'blue';
    }

    const scaleX = canvas.width / 640;
    const scaleY = canvas.height / 640;
    const x1 = (centerX - width / 2) * scaleX;
    const y1 = (centerY - height / 2) * scaleY;
    const x2 = (centerX + width / 2) * scaleX;
    const y2 = (centerY + height / 2) * scaleY;

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

    ctx.fillStyle = color;
    ctx.font = '20px Arial';
    ctx.fillText(
      `${detection.found} (${(detection.confidence * 100).toFixed(1)}%)`,
      x1,
      y1 > 20 ? y1 - 5 : y1 + 15
    );
  });
};
