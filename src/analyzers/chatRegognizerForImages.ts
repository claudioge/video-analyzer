import * as tf from '@tensorflow/tfjs';
import {Reports} from '@/analyzers/analyzer';
import {Rank} from '@tensorflow/tfjs';

export class ChatRecognizer {
  model: tf.GraphModel | null = null;

  constructor() {}

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

  async analyze(imageData: ImageData): Promise<Reports | null> {
    if (!this.model) {
      throw new Error('Model not loaded. Call initialize() first.');
    }

    const reports: Reports = [];

    try {
      // Convert ImageData to a tensor
      const frameTensor = tf.browser.fromPixels(imageData);

      // Preprocess the frame tensor
      const inputTensor = this.preprocessFrame(frameTensor);

      // Run inference
      const predictions = this.model.predict(inputTensor) as tf.Tensor;

      // Post-process the predictions and update reports
      await this.updateReports(predictions, reports);

      // Clean up tensors
      frameTensor.dispose();
      inputTensor.dispose();
      predictions.dispose();
    } catch (error) {
      console.error('Error during analysis:', error);
      return null;
    }

    return reports;
  }

  getClassName(classId: number): string {
    const classNames = ['chat', 'chat_ai', 'email'];
    return classNames[classId] || 'unknown';
  }

  // Preprocess the frame tensor to match model input requirements
  private preprocessFrame(frameTensor: tf.Tensor3D): tf.Tensor<Rank> {
    const resizedTensor = tf.image.resizeBilinear(frameTensor, [640, 640]);
    const normalizedTensor = resizedTensor.div(255.0);
    const expandedTensor = normalizedTensor.expandDims(0); // Add batch dimension

    resizedTensor.dispose();

    return expandedTensor;
  }

  private async updateReports(
    predictions: tf.Tensor,
    reports: Reports
  ): Promise<void> {
    const predictionData = await predictions.data();
    const numAttributes = predictions.shape[1];
    const numPredictions = predictions.shape[2];

    // Reshape the predictions to [numPredictions, numAttributes]
    const reshapedPredictions = tf
      .tensor(predictionData, [numAttributes, numPredictions])
      .transpose([1, 0])
      .arraySync() as number[][];

    for (const detection of reshapedPredictions) {
      const [x1, y1, x2, y2, confidence1, confidence2] = detection;

      if (confidence1 > 0.8) {
        const className = this.getClassName(0);
        if (className !== 'unknown') {
          reports.push({
            found: className,
            time: Date.now() // Or use a frame counter if needed
          });
          console.log(`Found '${className}' with confidence ${confidence1}`);
        }
      }

      if (confidence2 > 0.8) {
        const className = this.getClassName(1);
        if (className !== 'unknown') {
          reports.push({
            found: className,
            time: Date.now()
          });
          console.log(`Found '${className}' with confidence ${confidence2}`);
        }
      }
    }
  }
}
