import cv from '@techstark/opencv-js';
import {Analyzer, Reports} from '@/analyzers/analyzer';
import {loadImage} from '@/helpers/loadImage';
import {captureVideoFrame} from '@/helpers/captureVideoFrame';

export class HistogramAnalyzer extends Analyzer {
  name = 'Histogram Analyzer';

  constructor() {
    super();
  }

  async analyze(videoElement: HTMLVideoElement): Promise<Reports | null> {
    // Compute histogram and store the logo size as well
    const logos = [
      {
        name: 'whatsapp',
        ...(await this.computeHistogramAndSize('logos/whatsapp.png'))
      },
      {
        name: 'telegram',
        ...(await this.computeHistogramAndSize('logos/telegram.png'))
      },
      {
        name: 'chatGPT',
        ...(await this.computeHistogramAndSize('logos/chatGPT.png'))
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

      // Convert frame to BGR or ensure correct format
      // (Ensure the captureVideoFrame returns a Mat in appropriate color format)
      // If your frame is RGBA, consider converting:
      // cv.cvtColor(frame, frame, cv.COLOR_RGBA2BGR);

      for (const logo of logos) {
        const detected = this.detectLogoByHistogram(
          frame,
          logo.histogram,
          logo.name,
          logo.width,
          logo.height,
          i / fps
        );
        if (detected) {
          foundIcons.push(detected);
        }
      }

      frame.delete();
    }

    // Clean up histograms
    logos.forEach(logo => logo.histogram.delete());

    return foundIcons;
  }

  async computeHistogramAndSize(imagePath: string): Promise<{
    histogram: cv.Mat;
    width: number;
    height: number;
  }> {
    const img = await loadImage(imagePath);
    const width = img.cols;
    const height = img.rows;

    const hist = this.computeHistogramForMat(img);

    return {histogram: hist, width, height};
  }

  computeHistogramForMat(img: cv.Mat): cv.Mat {
    const hist = new cv.Mat();
    const channels = [0, 1, 2];
    const histSize = [8, 8, 8];
    const ranges = [0, 256, 0, 256, 0, 256];

    const imgVector = new cv.MatVector();
    imgVector.push_back(img);

    cv.calcHist(imgVector, channels, new cv.Mat(), hist, histSize, ranges);
    cv.normalize(hist, hist, 0, 1, cv.NORM_MINMAX);

    imgVector.delete();
    return hist;
  }

  detectLogoByHistogram(
    frame: cv.Mat,
    logoHist: cv.Mat,
    name: string,
    logoWidth: number,
    logoHeight: number,
    time: number
  ): {found: string; time: number} | null {
    let bestSimilarity = -1;
    let bestRect = null;

    // Slide over the frame using the logo size
    for (
      let y = 0;
      y <= frame.rows - logoHeight;
      y += Math.floor(logoHeight / 2)
    ) {
      for (
        let x = 0;
        x <= frame.cols - logoWidth;
        x += Math.floor(logoWidth / 2)
      ) {
        const roi = frame.roi(new cv.Rect(x, y, logoWidth, logoHeight));
        const roiHist = this.computeHistogramForMat(roi);
        const similarity = cv.compareHist(logoHist, roiHist, cv.HISTCMP_CORREL);

        roiHist.delete();
        roi.delete();

        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestRect = {x, y, w: logoWidth, h: logoHeight};
        }
      }
    }

    if (bestSimilarity > 0.7 && bestRect) {
      // Adjust threshold as needed
      console.log(
        `Detected ${name} with similarity ${bestSimilarity}, time: ${time}`
      );
      // Draw rectangle and/or save frame
      this.saveFrameWithRect(frame, name, bestRect, time);
      return {found: name, time};
    }

    return null;
  }

  saveFrameWithRect(
    frame: cv.Mat,
    logoName: string,
    rect: {x: number; y: number; w: number; h: number},
    time: number
  ) {
    // Draw a rectangle on the frame
    const outputFrame = frame.clone();
    const color = new cv.Scalar(0, 255, 0, 255);
    const pt1 = new cv.Point(rect.x, rect.y);
    const pt2 = new cv.Point(rect.x + rect.w, rect.y + rect.h);
    cv.rectangle(outputFrame, pt1, pt2, color, 2);

    // Convert the mat to a canvas
    const canvas = document.createElement('canvas');
    cv.imshow(canvas, outputFrame);
    const dataUrl = canvas.toDataURL('image/png');

    // Download link
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `detected_${logoName}_time${time}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up
    outputFrame.delete();
  }
}
