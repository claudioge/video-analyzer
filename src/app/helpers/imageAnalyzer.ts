import { Analyzer } from "@/app/helpers/analyzer";
import cv from "@techstark/opencv-js";

export class imageAnalyzer extends Analyzer {
  constructor() {
    super();
  }

  async analyze(videoElement: HTMLVideoElement): Promise<string | null> {
    const whatsappIcon = await this.loadImage("logos/whatsapp.png");
    const telegramIcon = await this.loadImage("logos/telegram.png");
    const claudeIcon = await this.loadImage("logos/claude.png");
    const chatGPTIcon = await this.loadImage("logos/chatGPT.png");

    const fps = 1;
    const totalFrames = videoElement.duration * fps;

    for (let i = 0; i < totalFrames; i++) {
      videoElement.currentTime = i / fps;
      await new Promise((resolve) =>
        videoElement.addEventListener("seeked", resolve, { once: true }),
      );

      const frame = this.captureVideoFrame(videoElement);

      if (
        this.detectApp(frame, whatsappIcon) ||
        this.detectApp(frame, telegramIcon) ||
        this.detectApp(frame, claudeIcon) ||
        this.detectApp(frame, chatGPTIcon)
      ) {
        frame.delete();
        whatsappIcon.delete();
        telegramIcon.delete();
        claudeIcon.delete();
        chatGPTIcon.delete();
        return "WhatsApp or Telegram detected in frame";
      }

      frame.delete();
    }
    whatsappIcon.delete();
    telegramIcon.delete();
    claudeIcon.delete();
    chatGPTIcon.delete();

    return "No apps detected";
  }

  detectApp = (frame: cv.Mat, template: cv.Mat): boolean => {
    const result = new cv.Mat();
    const mask = new cv.Mat();
    const scaledTemplate = new cv.Mat();
    cv.resize(
      template,
      scaledTemplate,
      new cv.Size(0, 0),
      0.2,
      0.2,
      cv.INTER_AREA,
    );
    cv.matchTemplate(frame, template, result, cv.TM_CCOEFF_NORMED, mask);
    const minMax = cv.minMaxLoc(result, mask);

    result.delete();
    mask.delete();
    console.log("minMax", minMax.maxVal);

    return minMax.maxVal > 0.8; // Adjust threshold as needed
  };

  captureVideoFrame(video: HTMLVideoElement): cv.Mat {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create canvas context");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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
}
