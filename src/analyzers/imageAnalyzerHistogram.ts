import cv from '@techstark/opencv-js';
import {Analyzer, Reports} from '@/analyzers/analyzer';
import {loadImage} from '@/helpers/loadImage';
import {captureVideoFrame} from '@/helpers/captureVideoFrame';

export class imageAnalyzerHistogram extends Analyzer {
  constructor() {
    super();
  }

  async analyze(videoElement: HTMLVideoElement): Promise<Reports | null> {
    const logos = [
      {
        name: 'whatsapp',
        histogram: await this.computeHistogram('logos/whatsapp.png')
      },
      {
        name: 'telegram',
        histogram: await this.computeHistogram('logos/telegram.png')
      },
      {
        name: 'chatGPT',
        histogram: await this.computeHistogram('logos/chatGPT.png')
      }
    ];

    const foundIcons: Reports = [];
    const fps = 1; // Process one frame per second
    const totalFrames = videoElement.duration * fps;

    for (let i = 0; i < totalFrames; i++) {
      videoElement.currentTime = i / fps;
      await new Promise(resolve =>
        videoElement.addEventListener('seeked', resolve, {once: true})
      );

      const frame = captureVideoFrame(videoElement);

      for (const logo of logos) {
        const detected = this.detectLogoByHistogram(
          frame,
          logo.histogram,
          logo.name,
          i / fps
        );
        if (detected) {
          foundIcons.push(detected);
          this.saveFrameWithCircle(frame, logo.name, i);
        }
      }

      frame.delete();
    }

    // Clean up histograms
    logos.forEach(logo => logo.histogram.delete());

    return foundIcons;
  }

  async computeHistogram(imagePath: string): Promise<cv.Mat> {
    const img = await loadImage(imagePath);
    const hist = new cv.Mat();
    const channels = [0, 1, 2];
    const histSize = [8, 8, 8];
    const ranges = [0, 256, 0, 256, 0, 256];

    const imgVector = new cv.MatVector();
    imgVector.push_back(img);

    cv.calcHist(imgVector, channels, new cv.Mat(), hist, histSize, ranges);
    cv.normalize(hist, hist, 0, 1, cv.NORM_MINMAX);

    img.delete();
    imgVector.delete();
    return hist;
  }

  detectLogoByHistogram(
    frame: cv.Mat,
    logoHist: cv.Mat,
    name: string,
    time: number
  ): {found: string; time: number} | null {
    const frameHist = new cv.Mat();
    const channels = [0, 1, 2];
    const histSize = [8, 8, 8];
    const ranges = [0, 256, 0, 256, 0, 256];

    const frameVector = new cv.MatVector();
    frameVector.push_back(frame);

    cv.calcHist(
      frameVector,
      channels,
      new cv.Mat(),
      frameHist,
      histSize,
      ranges
    );
    cv.normalize(frameHist, frameHist, 0, 1, cv.NORM_MINMAX);

    const similarity = cv.compareHist(logoHist, frameHist, cv.HISTCMP_CORREL);

    frameHist.delete();
    frameVector.delete();

    if (similarity > 0.7) {
      // Adjust threshold as needed
      console.log(
        `Detected ${name} with similarity ${similarity}, time: ${time}`
      );
      return {found: name, time};
    }
    return null;
  }

  saveFrameWithCircle(frame: cv.Mat, logoName: string, frameIndex: number) {
    // Create a copy of the frame to draw on
    const outputFrame = frame.clone();

    // Draw a circle in the center of the frame
    const center = new cv.Point(frame.cols / 2, frame.rows / 2);
    const radius = Math.min(frame.cols, frame.rows) / 4; // Adjust as needed
    const color = new cv.Scalar(0, 255, 0); // Green color
    const thickness = 2;

    cv.circle(outputFrame, center, radius, color, thickness);

    // Convert the mat to a canvas to get an image URL
    const canvas = document.createElement('canvas');
    cv.imshow(canvas, outputFrame);
    const dataUrl = canvas.toDataURL('image/png');

    // Create a download link
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `detected_${logoName}_frame${frameIndex}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up
    outputFrame.delete();
  }
}
