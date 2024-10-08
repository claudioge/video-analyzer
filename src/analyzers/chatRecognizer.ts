import * as tf from '@tensorflow/tfjs';
import {Analyzer, Reports} from '@/analyzers/analyzer';
import {Rank} from '@tensorflow/tfjs';

export class ChatRecognizer extends Analyzer {
  model: tf.GraphModel | null = null;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    try {
      console.log('Initializing TensorFlow.js model');
      this.model = (await tf.loadGraphModel(
        '/last_web_model/model.json'
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

    const detectedObjects: Detection[] = []; // Collect detections for drawing

    // @ts-ignore
    for (const detection of detections) {
      const [x1, y1, x2, y2, confidence1, confidence2] = detection;

      if (confidence1 > 0.8) {
        console.log('Detection:', {
          x1,
          y1,
          x2,
          y2,
          confidence: confidence1,
          classId: 0
        });

        const className = this.getClassName(0);
        if (className !== 'unknown') {
          reports.push({
            found: className,
            time: frameIndex
          });
          detectedObjects.push({
            bbox: [x1, y1, x2, y2],
            confidence: confidence1,
            classId: 0
          });
          console.log(`Found '${className}' at time ${frameIndex}`);
        }
      }
      if (confidence2 > 0.8) {
        console.log('Detection:', {
          x1,
          y1,
          x2,
          y2,
          confidence: confidence2,
          classId: 1
        });

        const className = this.getClassName(1);
        if (className !== 'unknown') {
          reports.push({
            found: className,
            time: frameIndex
          });
          detectedObjects.push({
            bbox: [x1, y1, x2, y2],
            confidence: confidence2,
            classId: 1
          });
          console.log(`Found '${className}' at time ${frameIndex}`);
        }
      }
    }

    // After processing detections, draw them on the canvas
    if (detectedObjects.length > 0) {
      this.drawDetections(canvas, detectedObjects);

      // Save the canvas as an image and trigger download
      const dataURL = canvas.toDataURL('image/png');
      this.downloadImage(dataURL, `detection_frame_${frameIndex}.png`);
    }
  }

  private drawDetections(canvas: HTMLCanvasElement, detections: Detection[]) {
    const ctx = canvas.getContext('2d')!;
    // No need to clear the canvas since we already have the frame drawn

    detections.forEach(detection => {
      let [x1, y1, x2, y2] = detection.bbox;
      const className = this.getClassName(detection.classId);
      const color = className === 'chat_ai' ? 'red' : 'green';

      const scaleX = canvas.width / 640;
      const scaleY = canvas.height / 640;

      x1 *= scaleX;
      y1 *= scaleY;
      x2 *= scaleX;
      y2 *= scaleY;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      ctx.fillStyle = color;
      ctx.font = '16px Arial';
      ctx.fillText(
        `${className} (${(detection.confidence * 100).toFixed(1)}%)`,
        x1,
        y1 > 20 ? y1 - 5 : y1 + 15
      );
    });
  }

  // Function to trigger image download
  private downloadImage(dataURL: string, filename: string) {
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Interface for detected objects
interface Detection {
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  confidence: number;
  classId: number;
}
