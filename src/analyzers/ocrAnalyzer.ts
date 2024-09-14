import {createWorker} from 'tesseract.js';
import {Analyzer, Reports} from '@/analyzers/analyzer';

const criticalWords = ['whatsapp', 'telegram', 'chatgpt', 'claude'];

// implements an analyzer that uses OCR to detect critical words in a video
// This class is a subclass of the Analyzer class

export class ocrAnalyzer extends Analyzer {
  constructor() {
    super();
  }

  async analyze(videoElement: HTMLVideoElement): Promise<Reports | null> {
    let foundWords: Reports = [];
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    console.log('Analyzing video with OCR');

    if (!context) {
      throw new Error('Could not create canvas context');
    }

    const worker = await createWorker();
    await worker.load();

    // Wait for the video to be fully loaded before starting
    if (videoElement.readyState < 3) {
      await new Promise<void>(resolve => {
        videoElement.addEventListener('loadeddata', () => resolve(), {
          once: true
        });
      });
    }

    console.log('Video loaded');

    const scaleFactor = 1; // Scale down to 50%
    const frameSkip = 30; // Process 1 frame per second in a 30fps video

    canvas.width = videoElement.videoWidth * scaleFactor;
    canvas.height = videoElement.videoHeight * scaleFactor;

    console.log('Canvas dimensions:', canvas.width, canvas.height);

    let currentTime = 0;
    let foundWord: string | undefined;
    console.log('Starting video processing');

    const processFrame = async () => {
      try {
        console.log('Processing frame at', currentTime, 'seconds');
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        const {
          data: {text}
        } = await worker.recognize(canvas);

        console.log(`Detected text: ${text}`);
        foundWord = criticalWords.find(word =>
          text.toLowerCase().includes(word)
        );

        if (foundWord) {
          console.log(
            `Critical word "${foundWord}" detected in video. at ${currentTime} seconds.`
          );
          foundWords.push({found: foundWord, time: currentTime});
        }

        currentTime += frameSkip * (1 / 30); // Skip frames
        if (currentTime >= videoElement.duration) {
          await worker.terminate();
          return foundWords;
        } else {
          videoElement.currentTime = currentTime;
        }
      } catch (error) {
        console.error('Error processing frame:', error);
        await worker.terminate();
      }
    };

    videoElement.onseeked = async () => {
      await processFrame();
    };

    videoElement.currentTime = currentTime; // Start processing
    return foundWords;
  }
}
