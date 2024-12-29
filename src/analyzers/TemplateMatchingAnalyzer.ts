import cv from '@techstark/opencv-js';
import {Analyzer, Reports} from '@/analyzers/Analyzer';
import {saveFrame} from '@/helpers/saveFrame';
import {loadImage} from '@/helpers/loadImage';
import {captureVideoFrame} from '@/helpers/captureVideoFrame';

export class TemplateMatchingAnalyzer extends Analyzer {
  name = 'Template Matching Analyzer';

  constructor() {
    super();
  }

  async analyze(videoElement: HTMLVideoElement): Promise<Reports | null> {
    const whatsappIcon = await loadImage('logos/whatsapp.png');
    const telegramIcon = await loadImage('logos/telegram.png');
    const claudeIcon = await loadImage('logos/claude.png');
    const chatGPTIcon = await loadImage('logos/chatGPT.png');
    const chatGPTIcon2 = await loadImage('logos/chatGPT2.png');
    const templates = {
      whatsapp: whatsappIcon,
      telegram: telegramIcon,
      // claude: claudeIcon,
      chatGPT: chatGPTIcon,
      chatGPT2: chatGPTIcon2
    };
    const foundIcons: Reports = [];

    const fps = 1;
    const totalFrames = videoElement.duration * fps;

    for (let i = 0; i < totalFrames; i++) {
      videoElement.currentTime = i / fps;
      await new Promise(resolve =>
        videoElement.addEventListener('seeked', resolve, {once: true})
      );

      const frame = captureVideoFrame(videoElement);

      for (const [name, template] of Object.entries(templates)) {
        const detectedIcon = this.detectApp(frame, template, name, i)
          ? name
          : null;

        if (detectedIcon) {
          foundIcons.push({found: detectedIcon, time: i / fps});
        }
      }
      frame.delete();
    }

    whatsappIcon.delete();
    telegramIcon.delete();
    claudeIcon.delete();
    chatGPTIcon.delete();

    return foundIcons;
  }

  detectApp = (
    frame: cv.Mat,
    template: cv.Mat,
    name: string,
    frameIndex: number
  ): boolean => {
    const result = new cv.Mat();
    const mask = new cv.Mat();
    const scales = [0.02, 0.04, 0.06, 0.1]; // Different scales to check
    const methods = [cv.TM_CCOEFF_NORMED, cv.TM_CCORR_NORMED];
    let foundIcon = false;

    for (let scale of scales) {
      // Resize frame and template for each scale
      const resizedTemplate = new cv.Mat();
      cv.resize(
        template,
        resizedTemplate,
        new cv.Size(0, 0),
        scale,
        scale,
        cv.INTER_AREA
      );

      for (const method of methods) {
        cv.matchTemplate(frame, resizedTemplate, result, method, mask);
        let res = cv.minMaxLoc(result, mask);

        if (res.maxVal > 0.85) {
          foundIcon = true;
          // Normalize result for visualization (scaling it to be between 0 and 255 for better visibility)
          cv.normalize(result, result, 0, 255, cv.NORM_MINMAX, -1);
          const {x, y} = res.maxLoc;
          const rectColor = new cv.Scalar(0, 255, 0, 255);
          const point1 = new cv.Point(x, y);
          const point2 = new cv.Point(
            x + resizedTemplate.cols,
            y + resizedTemplate.rows
          );
          cv.rectangle(frame, point1, point2, rectColor, 2);

          saveFrame(
            frame,
            `potential_detected_${name}_frame${frameIndex}_scale${scale}.png`
          );
        }
      }

      resizedTemplate.delete();
    }

    result.delete();
    mask.delete();

    return foundIcon;
  };
}
