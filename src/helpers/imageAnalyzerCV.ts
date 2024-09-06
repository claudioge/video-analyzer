import cv from "@techstark/opencv-js";
import { Analyzer, Reports } from "@/helpers/analyzer";

export class imageAnalyzerCV extends Analyzer {
  constructor() {
    super();
  }

  async analyze(videoElement: HTMLVideoElement): Promise<Reports | null> {
    const whatsappIcon = await this.loadImage("logos/whatsapp.png");
    const telegramIcon = await this.loadImage("logos/telegram.png");
    // const claudeIcon = await this.loadImage("logos/claude.png");
    const chatGPTIcon = await this.loadImage("logos/chatGPT.png");
    const foundIcons: Reports = [];

    const fps = 1;
    const totalFrames = videoElement.duration * fps;

    for (let i = 0; i < totalFrames; i++) {
      videoElement.currentTime = i / fps;
      await new Promise((resolve) =>
        videoElement.addEventListener("seeked", resolve, { once: true })
      );

      const frame = this.captureVideoFrame(videoElement);

      const detectedIcon = this.detectApp(frame, whatsappIcon, "whatsapp", i) ? "whatsapp" :
        this.detectApp(frame, telegramIcon, "telegram", i) ? "telegram" :
          // this.detectApp(frame, claudeIcon, "claude", i) ? "claude" :
            this.detectApp(frame, chatGPTIcon, "chatGPT", i) ? "chatGPT" : null;

      if (detectedIcon) {
        foundIcons.push({ found: detectedIcon, time: i / fps });
      }

      frame.delete();
    }

    whatsappIcon.delete();
    telegramIcon.delete();
    // claudeIcon.delete();
    chatGPTIcon.delete();

    return foundIcons;
  }

  detectApp = (frame: cv.Mat, template: cv.Mat, name: string, frameIndex: number): boolean => {
    const result = new cv.Mat();
    const mask = new cv.Mat();
    const scales = [0.02, 0.04, 0.06, 0.1];  // Different scales to check
    const methods = [cv.TM_CCOEFF_NORMED, cv.TM_CCORR_NORMED];
    let foundIcon = false;

    for (let scale of scales) {
      // Resize frame and template for each scale
      const resizedTemplate = new cv.Mat();
      cv.resize(template, resizedTemplate, new cv.Size(0, 0), scale, scale);

      methods.forEach((method) => {
        cv.matchTemplate(frame, resizedTemplate, result, method, mask);
        let res = cv.minMaxLoc(result, mask);

        // Normalize result for visualization (scaling it to be between 0 and 255 for better visibility)
        cv.normalize(result, result, 0, 255, cv.NORM_MINMAX, -1);
        this.saveFrame(result, `matchTemplate_result_${name}_frame${frameIndex}_scale${scale}_method${method}.png`);



        if (res.maxVal > 0.7) {  // Lower threshold for visualization purposes
          const { x, y } = res.maxLoc;
          const rectColor = new cv.Scalar(0, 255, 0, 255); // Green color in BGR format for low-confidence matches
          const point1 = new cv.Point(x, y);
          const point2 = new cv.Point(x + resizedTemplate.cols, y + resizedTemplate.rows);
          cv.rectangle(frame, point1, point2, rectColor, 2);

          this.saveFrame(frame, `potential_detected_${name}_frame${frameIndex}_scale${scale}.png`);
        }
      });

      resizedTemplate.delete();
    }

    result.delete();
    mask.delete();

    return foundIcon;
  };


  captureVideoFrame(video: HTMLVideoElement): cv.Mat {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create canvas context");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    console.log("captured frame with width", canvas.width, "and height", canvas.height);
    return cv.imread(canvas);
  }

  async loadImage(src: string): Promise<cv.Mat> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(cv.imread(img));
      img.onerror = reject;
      img.src = src;
    });
  }

  saveFrame(frame: cv.Mat, filename: string) {
    // Convert the mat to a canvas to get an image URL
    const canvas = document.createElement("canvas");
    cv.imshow(canvas, frame);
    const dataUrl = canvas.toDataURL("image/png");

    // Use the File System Access API to save the image to the user's desktop
    fetch(dataUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
      });
  }
}
