import cv from "@techstark/opencv-js";

export const saveFrame = (frame: cv.Mat, filename: string) =>  {
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