import {Analyzer, Reports} from '@/analyzers/analyzer';
import {loadImage} from '@/helpers/loadImage';
import {captureVideoFrame} from '@/helpers/captureVideoFrame';
import cv from '@techstark/opencv-js';
import {saveFrame} from '@/helpers/saveFrame';

export class imageAnalyzerROIORB extends Analyzer {
  constructor() {
    super();
  }
  async analyze(videoElement: HTMLVideoElement): Promise<Reports | null> {
    const foundIcons: Reports = [];
    const fps = 1;
    const totalFrames = videoElement.duration * fps;

    for (let i = 0; i < totalFrames; i++) {
      videoElement.currentTime = i / fps;
      await new Promise(resolve =>
        videoElement.addEventListener('seeked', resolve, {once: true})
      );

      let frame: cv.Mat | null = null;
      try {
        frame = captureVideoFrame(videoElement);
        console.log(
          `Processing frame ${i}: width ${frame.cols}, height ${frame.rows}`
        );

        // Process each logo
        const logos = [
          {image: await loadImage('logos/whatsapp.png'), name: 'whatsapp'},
          {image: await loadImage('logos/telegram.png'), name: 'telegram'},
          {image: await loadImage('logos/chatGPT.png'), name: 'chatGPT'},
          {image: await loadImage('logos/chatGPT2.png'), name: 'chatGPT2'},
          {
            image: await loadImage('logos/chatGPTInput.png'),
            name: 'chatGPTInput'
          }
        ];

        for (const logo of logos) {
          if (this.detectApp(frame, logo.image, logo.name, i)) {
            foundIcons.push({found: logo.name, time: i / fps});
          }
          logo.image.delete(); // Clean up logo image
        }
      } catch (e) {
        console.error(`Error processing frame ${i}:`, e);
      } finally {
        if (frame) frame.delete(); // Ensure frame is always deleted
      }
    }

    return foundIcons;
  }

  detectApp = (
    frame: cv.Mat,
    template: cv.Mat,
    name: string,
    frameIndex: number
  ): boolean => {
    const scales = [0.02, 0.04, 0.06, 0.1, 0.2];
    let foundIcon = false;

    const grayFrame = new cv.Mat();
    try {
      cv.cvtColor(frame, grayFrame, cv.COLOR_RGBA2GRAY);

      for (let scale of scales) {
        const resizedTemplate = new cv.Mat();
        const result = new cv.Mat();
        const locations = new cv.Mat();
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();

        try {
          cv.resize(template, resizedTemplate, new cv.Size(0, 0), scale, scale);
          cv.matchTemplate(
            grayFrame,
            resizedTemplate,
            result,
            cv.TM_CCOEFF_NORMED
          );

          const threshold = 0.7;
          cv.threshold(result, locations, threshold, 1, cv.THRESH_BINARY);
          cv.findContours(
            locations,
            contours,
            hierarchy,
            cv.RETR_EXTERNAL,
            cv.CHAIN_APPROX_SIMPLE
          );

          for (let i = 0; i < contours.size(); i++) {
            const rect = cv.boundingRect(contours.get(i));
            const roi = grayFrame.roi(rect);

            // Apply ORB only to the ROI
            const orb = new cv.ORB(500, 1.2, 8);
            const roiKeypoints = new cv.KeyPointVector();
            const roiDescriptors = new cv.Mat();
            orb.detectAndCompute(
              roi,
              new cv.Mat(),
              roiKeypoints,
              roiDescriptors
            );

            const templateKeypoints = new cv.KeyPointVector();
            const templateDescriptors = new cv.Mat();
            orb.detectAndCompute(
              resizedTemplate,
              new cv.Mat(),
              templateKeypoints,
              templateDescriptors
            );

            const matcher = new cv.BFMatcher(cv.NORM_HAMMING, true);
            const matches = new cv.DMatchVector();
            matcher.match(templateDescriptors, roiDescriptors, matches);

            // Apply ratio test
            const goodMatches = [];
            for (let j = 0; j < matches.size(); j++) {
              const match = matches.get(j);
              if (
                match.distance <
                0.7 * matches.get(matches.size() - 1).distance
              ) {
                goodMatches.push(match);
              }
            }

            if (goodMatches.length >= 10) {
              console.log(
                `Found icon: ${name} at scale ${scale} in frame ${frameIndex} with ${goodMatches.length} good matches`
              );
              foundIcon = true;

              // Draw keypoint matches for visualization
              const imgMatches = new cv.Mat();
              const maskMatches = new cv.Mat();
              cv.drawMatches(
                resizedTemplate,
                templateKeypoints,
                roi,
                roiKeypoints,
                matches,
                imgMatches,
                new cv.Scalar(255, 0, 0),
                new cv.Scalar(0, 0, 255),
                maskMatches,
                cv.DRAW_RICH_KEYPOINTS
              );

              saveFrame(
                imgMatches,
                `improved_orb_detected_${name}_frame${frameIndex}_scale${scale}.png`
              );
              imgMatches.delete();
              maskMatches.delete();
            }

            roi.delete();
          }
        } catch (e) {
          console.error(`Error in scale ${scale} for ${name}:`, e);
        } finally {
          resizedTemplate.delete();
          result.delete();
          locations.delete();
          contours.delete();
          hierarchy.delete();
        }

        if (foundIcon) break; // Exit loop if icon is found
      }
    } catch (e) {
      console.error(`Error in detectApp for ${name}:`, e);
    } finally {
      grayFrame.delete();
    }

    return foundIcon;
  };
}
