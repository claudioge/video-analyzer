import * as tf from '@tensorflow/tfjs';
import {Analyzer, Reports} from '@/analyzers/Analyzer';
import {Rank} from '@tensorflow/tfjs';
import {downloadImage} from '@/helpers/downloadImage';
import {drawDetections} from '@/helpers/drawDetection';

const CONFIDENCE_THRESHOLD = 0.8;

export class YOLOAnalyzer extends Analyzer {
  model: tf.GraphModel | null = null;
  name = 'YOLO Analyzer';

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    try {
      console.log('Initializing TensorFlow.js model');
      this.model = (await tf.loadGraphModel(
        '/last_web_model_1/model.json'
      )) as tf.GraphModel;

      console.log('Model outputs:', this.model.outputNodes);
      console.log('Model loaded successfully');
    } catch (error) {
      console.error('Error loading model:', error);
    }
  }

  async analyze(videoFile: HTMLVideoElement): Promise<Reports | null> {
    if (!this.model) {
      throw new Error('Model not loaded. Call initialize() first.');
    }

    const reports: Reports = [];
    const fps = 1;
    const totalFrames = Math.floor(videoFile.duration * fps);

    for (let i = 0; i < totalFrames; i++) {
      videoFile.currentTime = i / fps;

      await new Promise(resolve =>
        videoFile.addEventListener('seeked', resolve, {once: true})
      );

      const {tensor: frameTensor, canvas} =
        this.captureFrameAsTensor(videoFile);

      try {
        // Preprocess the captured frame
        const inputTensor = this.preprocessFrame(frameTensor);

        // Run inference on the frame
        const predictions = this.model.predict(inputTensor) as tf.Tensor;

        // Post-process the model's output and update reports
        await this.updateReports(predictions, reports, i, canvas);

        // Output the report for each frame if something was found
        if (reports.length > 0 && reports[reports.length - 1].time === i) {
          console.log(
            `Found '${reports[reports.length - 1].found}' at time ${reports[reports.length - 1].time}`
          );
        }

        // Clean up memory
        frameTensor.dispose();
        inputTensor.dispose();
        predictions.dispose();
      } catch (error) {
        console.error('Error during analysis:', error);
        return null;
      }
    }

    return reports;
  }

  getClassName(classId: number): string {
    const classNames = ['chat', 'chat_ai'];
    return classNames[classId] || 'unknown';
  }

  private captureFrameAsTensor(video: HTMLVideoElement): {
    tensor: tf.Tensor3D;
    canvas: HTMLCanvasElement;
  } {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageTensor = tf.browser.fromPixels(canvas);

    return {tensor: imageTensor, canvas};
  }

  // Preprocess the frame tensor to match model input requirements
  private preprocessFrame(frameTensor: tf.Tensor3D): tf.Tensor<Rank> {
    const resizedTensor = tf.image.resizeBilinear(frameTensor, [640, 640]);

    const normalizedTensor = resizedTensor.div(255.0);

    const expandedTensor = normalizedTensor.expandDims(0);

    resizedTensor.dispose();

    return expandedTensor;
  }

  private async updateReports(
    predictions: tf.Tensor,
    reports: Reports,
    frameIndex: number,
    canvas: HTMLCanvasElement
  ): Promise<void> {
    const [batchSize, numAttributes, numPredictions] = predictions.shape;
    const predictionsReshaped = predictions
      .reshape([numAttributes, numPredictions])
      .transpose([1, 0]); // Shape: [numPredictions, numAttributes]

    const detections = await predictionsReshaped.array();

    const detectedObjects: Reports = []; // Collect detections for drawing

    // @ts-ignore
    for (const detection of detections) {
      const [x1, y1, x2, y2, confidence1, confidence2, confidence3] = detection;

      if (confidence1 > CONFIDENCE_THRESHOLD) {
        const className = this.getClassName(0);
        if (className !== 'unknown') {
          const report = {
            found: className,
            time: frameIndex,
            bbox: [x1, y1, x2, y2],
            confidence: confidence1,
            classId: 0
          };
          reports.push(report);
          detectedObjects.push(report);
        }
      }
      if (confidence2 > CONFIDENCE_THRESHOLD) {
        const className = this.getClassName(1);
        if (className !== 'unknown') {
          const report = {
            found: className,
            time: frameIndex,
            bbox: [x1, y1, x2, y2],
            confidence: confidence2,
            classId: 1
          };
          reports.push(report);
          detectedObjects.push(report);
        }
      }

      //      if (confidence3 > CONFIDENCE_THRESHOLD) {
      //        const className = this.getClassName(2);
      //        if (className !== 'unknown') {
      //          const report = {
      //            found: className,
      //            time: frameIndex,
      //            bbox: [x1, y1, x2, y2],
      //            confidence: confidence3,
      //            classId: 2
      //          };
      //          reports.push(report);
      //          detectedObjects.push(report);
      //        }
      //      }
    }

    // only take the most confident of each class
    const uniqueDetections = detectedObjects.reduce((acc, detection) => {
      const existingDetection = acc.find(d => d.classId === detection.classId);
      if (!detection.confidence) return acc;
      if (!existingDetection) {
        acc.push(detection);
      } else if (
        existingDetection.confidence &&
        detection.confidence > existingDetection.confidence
      ) {
        acc[acc.indexOf(existingDetection)] = detection;
      }
      return acc;
    }, [] as Reports);

    // After processing detections, draw them on the canvas
    if (uniqueDetections.length > 0) {
      drawDetections(canvas, uniqueDetections);
      // Save the canvas as an image and trigger download
      const dataURL = canvas.toDataURL('image/png');
      downloadImage(dataURL, `detection_${frameIndex}.png`);
    }
  }
}
