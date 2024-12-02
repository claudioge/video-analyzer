'use client';
import {Card, CardContent, CardHeader} from '@/components/ui/card';
import {useRef, useState} from 'react';
import {Button} from '@/components/ui/button';
import {YOLOAnalyzerForImages} from '@/analyzers/YOLOAnalyzerForImages';
import {drawDetections} from '@/helpers/drawDetection';
import {downloadImage} from '@/helpers/downloadImage';
import {Reports} from '@/analyzers/analyzer';

interface DisplayMediaOptions {
  video: {
    displaySurface: string;
  };
  audio: boolean;
}

const RealTimeAnalyzer = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [log, setLog] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  const displayMediaOptions: DisplayMediaOptions = {
    video: {
      displaySurface: 'window'
    },
    audio: false
  };

  const appendToLog = (msg: string): void => {
    setLog(prevLog => `${msg}\n${prevLog}`);
  };

  const appendErrorToLog = (msg: string): void => {
    setLog(prevLog => `Error: ${msg}\n${prevLog}`);
  };

  const chatRecognizerRef = useRef<YOLOAnalyzerForImages | null>(null);
  let shouldStop = false;

  const startCapture = async (): Promise<void> => {
    setLog('');
    shouldStop = false;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia(
        displayMediaOptions as DisplayMediaStreamOptions
      );

      setIsCapturing(true);
      dumpOptionsInfo(stream);
      // Initialize the chatRecognizer
      if (!chatRecognizerRef.current) {
        const chatRecognizer: YOLOAnalyzerForImages =
          new YOLOAnalyzerForImages();
        await chatRecognizer.initialize();
        chatRecognizerRef.current = chatRecognizer;
        console.log('Chat recognizer initialized', chatRecognizerRef.current);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onplaying = () => {
          processFrames();
        };
      }
    } catch (err) {
      appendErrorToLog(err instanceof Error ? err.message : String(err));
    }
  };

  const dumpOptionsInfo = (stream: MediaStream): void => {
    const videoTrack = stream.getVideoTracks()[0];
    appendToLog('Track settings:');
    appendToLog(JSON.stringify(videoTrack.getSettings(), null, 2));
    appendToLog('Track constraints:');
    appendToLog(JSON.stringify(videoTrack.getConstraints(), null, 2));
  };

  const stopCapture = (): void => {
    if (videoRef.current && videoRef.current.srcObject) {
      let tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    // Stop frame processing
    shouldStop = true;
    setIsCapturing(false);
    setLog('');
  };

  const processFrames = () => {
    console.log(
      'Processing frames',
      videoRef.current,
      chatRecognizerRef.current
    );
    if (!videoRef.current || !chatRecognizerRef.current) return;
    console.log('Processing frames2');
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const chatRecognizer = chatRecognizerRef.current;

    const analyzeFrame = async () => {
      if (!videoRef.current || video.paused || video.ended || shouldStop) {
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Analyze the image data
      const result = await chatRecognizer.analyze(imageData);
      // Optionally, update the log or do something with the result
      appendToLog(`Analyzed frame: ${JSON.stringify(result)}`);

      if (result && result.length > 0) {
        // only take the most confident of each class
        let uniqueDetections: Reports = [];
        const uniqueClasses = new Set<string>();
        result.forEach(detection => {
          if (!detection.confidence) return;
          if (!uniqueClasses.has(detection.found)) {
            uniqueClasses.add(detection.found);
            uniqueDetections.push(detection);
          } else {
            if (
              uniqueClasses.has(detection.found) &&
              detection.confidence >
                // @ts-ignore
                uniqueDetections.find(d => d.found === detection.found)
                  ?.confidence
            ) {
              uniqueDetections = uniqueDetections.filter(
                d => d.found !== detection.found
              );
              uniqueDetections.push(detection);
            }
          }
        });

        drawDetections(canvas, uniqueDetections);
        downloadImage(canvas.toDataURL(), 'frame.png');
      }
      // Call again on next frame
      // Wait for 1 second (1000 ms) before processing the next frame
      setTimeout(analyzeFrame, 1000);
    };

    analyzeFrame();
  };

  return (
    <Card>
      <CardHeader>
        <h1 className={'text-2xl font-bold'}>Stream Analyzer</h1>
      </CardHeader>
      <CardContent className={'center'}>
        <h1 className={'pt-4 pb-4'}>Real Time Analyzer</h1>
        <div className={'pb-2'}>
          <Button onClick={startCapture} disabled={isCapturing}>
            Start Capture
          </Button>
          &nbsp;
          <Button onClick={stopCapture} disabled={!isCapturing}>
            Stop Capture
          </Button>
        </div>
        <div className="relative w-3/4 h-3/4 overflow-hidden max-w-screen-md">
          <video height={'100%'} width={'100%'} ref={videoRef} autoPlay />
        </div>
        <br />
        <strong>Log:</strong>
        <br />
        <div className={'max-h-80 overflow-scroll'}>
          <pre className={'max-w-screen-md'}>{log}</pre>
        </div>
      </CardContent>
    </Card>
  );
};

export default RealTimeAnalyzer;
