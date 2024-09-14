import cv from '@techstark/opencv-js';
import {Analyzer, Reports} from '@/analyzers/analyzer';
import {saveFrame} from '@/helpers/saveFrame';
import {captureVideoFrame} from '@/helpers/captureVideoFrame';
import {loadImage} from '@/helpers/loadImage';

export class imageAnalyzerORB extends Analyzer {
  constructor() {
    super();
  }
  async analyze(videoElement: HTMLVideoElement): Promise<Reports | null> {
    // Load the logos and preprocess (e.g., convert to grayscale if necessary)
    const whatsappIcon = await loadImage('logos/whatsapp.png');
    const telegramIcon = await loadImage('logos/telegram.png');
    const chatGPTIcon = await loadImage('logos/chatGPT.png');
    const chatGPTIcon2 = await loadImage('logos/chatGPT2.png');
    const chatGPTInput = await loadImage('logos/chatGPTInput.png');

    const foundIcons: Reports = [];

    const fps = 1; // Process one frame per second (adjust as needed)
    const totalFrames = videoElement.duration * fps;

    for (let i = 0; i < totalFrames; i++) {
      videoElement.currentTime = i / fps;
      await new Promise(resolve =>
        videoElement.addEventListener('seeked', resolve, {once: true})
      );

      const frame = captureVideoFrame(videoElement);

      try {
        const detectedIcon = this.detectApp(frame, whatsappIcon, 'whatsapp', i)
          ? 'whatsapp'
          : this.detectApp(frame, telegramIcon, 'telegram', i)
            ? 'telegram'
            : this.detectApp(frame, chatGPTIcon, 'chatGPT', i)
              ? 'chatGPT'
              : this.detectApp(frame, chatGPTIcon2, 'chatGPT2', i)
                ? 'chatGPT2'
                : this.detectApp(frame, chatGPTInput, 'chatGPTInput', i)
                  ? 'chatGPTInput'
                  : null;

        if (detectedIcon) {
          foundIcons.push({found: detectedIcon, time: i / fps});
        }
      } catch (e) {
        console.log(`Error processing frame: ${i}`, e);
      }

      frame.delete();
    }

    // Clean up loaded logos
    whatsappIcon.delete();
    telegramIcon.delete();
    chatGPTIcon.delete();

    return foundIcons;
  }

  detectApp = (
    frame: cv.Mat,
    template: cv.Mat,
    name: string,
    frameIndex: number
  ): boolean => {
    const scales = [0.02, 0.04, 0.06, 0.1, 0.2]; // Different scales to check
    let foundIcon = false;

    for (let scale of scales) {
      // Resize the template for each scale
      const resizedTemplate = new cv.Mat();
      cv.resize(template, resizedTemplate, new cv.Size(0, 0), scale, scale);

      // Initialize ORB detector with custom parameters
      const orb = new cv.ORB(2000, 1.2, 8);

      // Detect keypoints and descriptors in the resized template
      const templateKeypoints = new cv.KeyPointVector();
      const templateDescriptors = new cv.Mat();
      orb.detectAndCompute(
        resizedTemplate,
        new cv.Mat(),
        templateKeypoints,
        templateDescriptors
      );

      // Detect keypoints and descriptors in the video frame
      const frameKeypoints = new cv.KeyPointVector();
      const frameDescriptors = new cv.Mat();
      orb.detectAndCompute(
        frame,
        new cv.Mat(),
        frameKeypoints,
        frameDescriptors
      );

      // Use a BruteForce-Hamming matcher to match the ORB descriptors
      const matcher = new cv.BFMatcher(cv.NORM_HAMMING, true);
      const matches = new cv.DMatchVector();

      // Perform the matching
      matcher.match(templateDescriptors, frameDescriptors, matches);

      // Filter out good matches based on distance
      let goodMatches = [];
      const maxDistance = 45;
      for (let i = 0; i < matches.size(); i++) {
        const match = matches.get(i);
        if (match.distance < maxDistance) {
          goodMatches.push(match);
        }
      }

      if (goodMatches.length >= 15) {
        // Adjust the threshold for minimum matches
        console.log(
          `Found icon: ${name} at scale ${scale} in frame ${frameIndex} with ${goodMatches.length} good matches`
        );
        foundIcon = true;

        // Draw keypoint matches for visualization
        const imgMatches = new cv.Mat();
        cv.drawMatches(
          resizedTemplate,
          templateKeypoints,
          frame,
          frameKeypoints,
          matches,
          imgMatches
        );

        // Save the frame with the matched keypoints for debugging
        saveFrame(
          imgMatches,
          `orb_detected_${name}_frame${frameIndex}_scale${scale}.png`
        );
        imgMatches.delete();
      }

      // Clean up
      resizedTemplate.delete();
      templateKeypoints.delete();
      frameKeypoints.delete();
      templateDescriptors.delete();
      frameDescriptors.delete();
      matches.delete();
      matcher.delete();
      orb.delete();
    }

    return foundIcon;
  };
}
