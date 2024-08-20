import { createWorker } from "tesseract.js";

const criticalWords = ["whatsapp", "telegram", "chatgpt", "claude"];

export const analyzeVideo = async (
  videoElement: HTMLVideoElement,
): Promise<string | null> => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not create canvas context");
  }

  const worker = await createWorker();
  await worker.load();
  await worker.loadLanguage("eng");
  await worker.initialize("eng");

  // Wait for the video to be fully loaded before starting
  if (videoElement.readyState < 3) {
    await new Promise<void>((resolve) => {
      videoElement.addEventListener("loadeddata", () => resolve(), {
        once: true,
      });
    });
  }

  const scaleFactor = 0.5; // Scale down to 50%
  const frameSkip = 30; // Process 1 frame per second in a 30fps video

  canvas.width = videoElement.videoWidth * scaleFactor;
  canvas.height = videoElement.videoHeight * scaleFactor;

  return new Promise(async (resolve, reject) => {
    let currentTime = 0;
    let foundWord: string | undefined;

    const processFrame = async () => {
      try {
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        const {
          data: { text },
        } = await worker.recognize(canvas);

        foundWord = criticalWords.find((word) =>
          text.toLowerCase().includes(word),
        );

        if (foundWord) {
          console.log(
            `Critical word "${foundWord}" detected in video. at ${currentTime} seconds.`,
          );
          await worker.terminate();
          resolve(foundWord); // Return the detected critical word
          return;
        }

        currentTime += frameSkip * (1 / 30); // Skip frames
        if (currentTime >= videoElement.duration) {
          await worker.terminate();
          resolve(null); // No critical words found
        } else {
          videoElement.currentTime = currentTime;
        }
      } catch (error) {
        console.error("Error processing frame:", error);
        await worker.terminate();
        reject(`Error processing frame: ${error.message}`);
      }
    };

    videoElement.onseeked = async () => {
      await processFrame();
    };

    videoElement.currentTime = currentTime; // Start processing
  });
};
