// import * as tf from '@tensorflow/tfjs';
// import * as cocoSsd from '@tensorflow-models/coco-ssd';
// import {Analyzer, Reports} from '@/analyzers/analyzer';
// import * as mobilenet from '@tensorflow-models/mobilenet';
// import {MobileNet} from '@tensorflow-models/mobilenet';
//
// export class imageAnalyzerTF extends Analyzer {
//   private model: cocoSsd.ObjectDetection | null = null;
//   private featureExtractor: mobilenet.MobileNet | null = null;
//
//   constructor() {
//     super();
//   }
//
//   async initialize() {
//     console.log('Initializing TensorFlow.js models');
//     // Load the pre-trained COCO-SSD model for object detection
//     this.model = await cocoSsd.load();
//     // Load a pre-trained model like MobileNet for feature extraction
//     this.featureExtractor = await mobilenet.load();
//   }
//
//   async analyze(videoElement: HTMLVideoElement): Promise<Reports | null> {
//     if (!this.model || !this.featureExtractor) {
//       console.error('Models not loaded');
//       return null;
//     }
//
//     // Load logo images and extract their feature vectors
//     // Load and preprocess logos
//     const logos = await this.loadLogos([
//       'logos/whatsapp.png',
//       'logos/telegram.png',
//       'logos/claude.png',
//       'logos/chatGPT.png'
//     ]);
//     const logoFeatures = await Promise.all(
//       logos.map(logo => this.extractFeatures(logo))
//     );
//
//     const foundLogos = [];
//
//     // Create a canvas to draw video frames onto
//     const canvas = document.createElement('canvas');
//     const ctx = canvas.getContext('2d');
//
//     for (let time = 0; time < videoElement.duration; time += 1) {
//       videoElement.currentTime = time;
//       await new Promise(resolve => (videoElement.onseeked = resolve));
//
//       // Capture the current video frame to a tensor
//       canvas.width = videoElement.videoWidth;
//       canvas.height = videoElement.videoHeight;
//       ctx
//         ? ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
//         : null;
//       const frameTensor = tf.browser.fromPixels(canvas);
//
//       // Detect objects in the frame
//       const predictions = await this.model.detect(frameTensor);
//
//       for (const prediction of predictions) {
//         const [x, y, width, height] = prediction.bbox;
//         console.log(
//           'Detected object:',
//           prediction.class,
//           'at',
//           x,
//           y,
//           width,
//           height
//         );
//         const croppedTensor = tf.image.cropAndResize(
//           frameTensor.expandDims(0),
//           [
//             [
//               y / frameTensor.shape[0],
//               x / frameTensor.shape[1],
//               (y + height) / frameTensor.shape[0],
//               (x + width) / frameTensor.shape[1]
//             ]
//           ],
//           [0],
//           [224, 224]
//         );
//
//         const regionFeatures = await this.extractFeatures(croppedTensor);
//
//         for (const [index, logoFeature] of logoFeatures.entries()) {
//           const similarity = this.computeCosineSimilarity(
//             regionFeatures,
//             logoFeature
//           );
//           console.log(`Similarity with logo ${index + 1}:`, similarity);
//
//           if (similarity > 0.8) {
//             foundLogos.push({time, found: `Logo ${index + 1}`});
//           }
//         }
//
//         croppedTensor.dispose();
//         regionFeatures.dispose();
//       }
//
//       frameTensor.dispose();
//     }
//
//     return foundLogos;
//   }
//
//   private async loadImageAsTensor(src: string): Promise<tf.Tensor> {
//     return new Promise<tf.Tensor>((resolve, reject) => {
//       const img = new Image();
//       img.crossOrigin = 'anonymous';
//       img.onload = () => resolve(tf.browser.fromPixels(img));
//       img.onerror = reject;
//       img.src = src;
//     });
//   }
//
//   private async extractFeatures(tensor: tf.Tensor): Promise<tf.Tensor> {
//     if (!this.featureExtractor) {
//       throw new Error('Feature extractor not loaded');
//     }
//
//     // Use MobileNet feature extractor to get the activation from the intermediate layer
//     const logits = this.featureExtractor.infer(tensor, false) as tf.Tensor;
//     return logits;
//   }
//
//   private async loadLogos(srcArray: string[]): Promise<tf.Tensor[]> {
//     return Promise.all(srcArray.map(src => this.loadImageAsTensor(src)));
//   }
//
//   private computeCosineSimilarity(
//     tensorA: tf.Tensor,
//     tensorB: tf.Tensor
//   ): number {
//     const dotProduct = tf.sum(tf.mul(tensorA, tensorB)).dataSync()[0];
//     const normA = tf.norm(tensorA).dataSync()[0];
//     const normB = tf.norm(tensorB).dataSync()[0];
//     return dotProduct / (normA * normB);
//   }
// }
