import cv from "@techstark/opencv-js";

export const loadImage = async (src: string): Promise<cv.Mat> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const mat = cv.imread(img);
      resolve(mat);
    };
    img.onerror = reject;
    img.src = src;
  });
}