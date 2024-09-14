import cv from "@techstark/opencv-js";

export const captureVideoFrame = (video: HTMLVideoElement): cv.Mat => {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  console.log("captured frame with width", canvas.width, "and height", canvas.height);
  return cv.imread(canvas);
}