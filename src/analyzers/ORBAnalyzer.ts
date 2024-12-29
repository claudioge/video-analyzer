import cv from '@techstark/opencv-js';
import {Analyzer, Reports} from '@/analyzers/Analyzer';
import {saveFrame} from '@/helpers/saveFrame';
import {captureVideoFrame} from '@/helpers/captureVideoFrame';
import {loadImage} from '@/helpers/loadImage';

const MIN_MATCH_COUNT = 15;

export class ORBAnalyzer extends Analyzer {
  name = 'ORB Analyzer';

  constructor() {
    super();
  }
  async analyze(videoElement: HTMLVideoElement): Promise<Reports | null> {
    const whatsappIcon = await loadImage('logos/whatsapp.png');
    const telegramIcon = await loadImage('logos/telegram.png');
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

    const fps = 1; // Process one frame per second
    const totalFrames = videoElement.duration * fps;

    for (let i = 0; i < totalFrames; i++) {
      videoElement.currentTime = i / fps;
      await new Promise(resolve =>
        videoElement.addEventListener('seeked', resolve, {once: true})
      );

      const frame = captureVideoFrame(videoElement);

      try {
        for (const [name, template] of Object.entries(templates)) {
          const detectedIcon = this.detectApp(frame, template, name, i)
            ? name
            : null;

          if (detectedIcon) {
            foundIcons.push({found: detectedIcon, time: i / fps});
          }
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
    const scales = [0.5, 0.75, 1, 1.5]; // Different scales to check
    let foundIcon = false;

    for (let scale of scales) {
      // Resize the template for each scale
      const resizedTemplate = new cv.Mat();
      cv.resize(template, resizedTemplate, new cv.Size(0, 0), scale, scale);

      // Initialize ORB detector with custom parameters
      const orb = new cv.ORB(10000, 1.01, 16, 15);

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

      if (
        templateDescriptors.empty() ||
        frameDescriptors.empty() ||
        templateDescriptors.rows < 2 ||
        frameDescriptors.rows < 2
      ) {
        resizedTemplate.delete();
        templateKeypoints.delete();
        templateDescriptors.delete();
        frameKeypoints.delete();
        frameDescriptors.delete();
        orb.delete();
        continue;
      }

      // BruteForce-Hamming matcher to match the ORB descriptors
      const matcher = new cv.BFMatcher(cv.NORM_HAMMING, false);
      // Perform KNN matching with k=2
      const knnMatches = new cv.DMatchVectorVector();
      matcher.knnMatch(templateDescriptors, frameDescriptors, knnMatches, 2);

      // Apply Lowe's ratio test
      const goodMatches = new cv.DMatchVector();
      for (let i = 0; i < knnMatches.size(); i++) {
        const matches = knnMatches.get(i);
        if (matches.size() >= 2) {
          const m = matches.get(0);
          const n = matches.get(1);
          const MAX_DISTANCE = 20;
          if (m.distance < 0.65 * n.distance && m.distance < MAX_DISTANCE) {
            goodMatches.push_back(m);
          }
        }
      }

      // Perform reverse matching
      const reverseMatcher = new cv.BFMatcher(cv.NORM_HAMMING, false);
      const reverseMatches = new cv.DMatchVectorVector();
      reverseMatcher.knnMatch(
        frameDescriptors,
        templateDescriptors,
        reverseMatches,
        2
      );

      // Apply symmetry test
      const finalGoodMatches = new cv.DMatchVector();
      for (let i = 0; i < goodMatches.size(); i++) {
        const forwardMatch = goodMatches.get(i);
        const reverseMatchCandidates = reverseMatches.get(
          forwardMatch.trainIdx
        );
        if (reverseMatchCandidates.size() >= 1) {
          const reverseMatch = reverseMatchCandidates.get(0);
          if (reverseMatch.trainIdx === forwardMatch.queryIdx) {
            finalGoodMatches.push_back(forwardMatch);
          }
        }
      }

      console.log('found ', finalGoodMatches.size(), 'good matches');

      if (finalGoodMatches.size() >= MIN_MATCH_COUNT) {
        // Adjust the threshold for minimum matches
        console.log(
          `Found icon: ${name} at scale ${scale} in frame ${frameIndex} with ${finalGoodMatches.size()} good matches`
        );
        foundIcon = true;
        // Extract location of good matches
        const srcPoints = [];
        const dstPoints = [];
        for (let i = 0; i < finalGoodMatches.size(); i++) {
          const match = finalGoodMatches.get(i);
          const templateKP = templateKeypoints.get(match.queryIdx).pt;
          const frameKP = frameKeypoints.get(match.trainIdx).pt;
          srcPoints.push(templateKP.x);
          srcPoints.push(templateKP.y);
          dstPoints.push(frameKP.x);
          dstPoints.push(frameKP.y);
        }
        // Convert to Mat
        const srcMat = cv.matFromArray(
          srcPoints.length,
          1,
          cv.CV_32FC2,
          srcPoints.flat()
        );
        const dstMat = cv.matFromArray(
          dstPoints.length,
          1,
          cv.CV_32FC2,
          dstPoints.flat()
        );

        // Find homography
        const mask = new cv.Mat();
        const H = cv.findHomography(
          srcMat,
          dstMat,
          cv.RANSAC,
          3,
          mask,
          2000,
          0.995
        );

        const numInliers = cv.countNonZero(mask);
        const inlierRatio = numInliers / finalGoodMatches.size();

        const MIN_INLIER_COUNT = 20;
        const MIN_INLIER_RATIO = 0.5;

        if (
          !H.empty() &&
          numInliers > MIN_INLIER_COUNT &&
          inlierRatio > MIN_INLIER_RATIO
        ) {
          const det = Math.abs(cv.determinant(H));
          if (det < 1e-3 || det > 1e3) {
            // Homography is not valid
            continue;
          }
          // Get the corners from the template image
          const templateHeight = resizedTemplate.rows;
          const templateWidth = resizedTemplate.cols;
          const templateCorners = cv.matFromArray(4, 1, cv.CV_32FC2, [
            0,
            0,
            templateWidth,
            0,
            templateWidth,
            templateHeight,
            0,
            templateHeight
          ]);

          // Transform template corners to the frame using the homography matrix
          const transformedCorners = new cv.Mat();
          cv.perspectiveTransform(templateCorners, transformedCorners, H);

          // Draw the bounding box on the frame
          const points = [];
          for (let i = 0; i < transformedCorners.data32F.length; i += 2) {
            const x = transformedCorners.data32F[i];
            const y = transformedCorners.data32F[i + 1];
            points.push(new cv.Point(x, y));
          }

          for (let i = 0; i < 4; i++) {
            const startPoint = points[i];
            const endPoint = points[(i + 1) % 4];
            cv.line(
              frame,
              startPoint,
              endPoint,
              new cv.Scalar(0, 255, 0, 255),
              4
            );
          }

          // Save the frame with the bounding box for debugging
          saveFrame(
            frame,
            `orb_detected_${name}_frame${frameIndex}_scale${scale}.png`
          );

          // Clean up
          templateCorners.delete();
          transformedCorners.delete();
          // Draw keypoint matches for visualization
          const imgMatches = new cv.Mat();
          cv.drawMatches(
            resizedTemplate,
            templateKeypoints,
            frame,
            frameKeypoints,
            finalGoodMatches,
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
        srcMat.delete();
        dstMat.delete();
        mask.delete();
        H.delete();
      }

      // Clean up
      resizedTemplate.delete();
      templateKeypoints.delete();
      frameKeypoints.delete();
      templateDescriptors.delete();
      frameDescriptors.delete();
      finalGoodMatches.delete();
      matcher.delete();
      orb.delete();
    }

    return foundIcon;
  };
}
