'use client';
import {useCallback, useRef, useState} from 'react';
import styles from './page.module.css';
import Select from 'react-select';

import {Button} from '@/components/ui/button';
import {ocrAnalyzer} from '@/analyzers/ocrAnalyzer';
import {imageAnalyzerCV} from '@/analyzers/imageAnalyzerCV';
import {Analyzer, Reports} from '@/analyzers/analyzer';
import {Card, CardContent, CardHeader} from '@/components/ui/card';
import {imageAnalyzerORB} from '@/analyzers/imageAnalyzerORB';
import {imageAnalyzerHistogram} from '@/analyzers/imageAnalyzerHistogram';
import {imageAnalyzerROIORB} from '@/analyzers/imageAnalyzerROIORB';
import {ChatRecognizer} from '@/analyzers/chatRecognizer';
import {Spinner} from '@/components/ui/spinner';

export default function Home() {
  const [video, setVideo] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [result, setResult] = useState<Reports | null>(null);
  const [chosenAnalyzer, setChosenAnalyzer] = useState<Analyzer | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const analyzerOptions = [
    {value: new ocrAnalyzer(), label: 'OCR Analyzer'},
    {value: new imageAnalyzerCV(), label: 'Image Analyzer CV'},
    {value: new imageAnalyzerORB(), label: 'Image Analyzer ORB'},
    {value: new imageAnalyzerHistogram(), label: 'Image Analyzer Histogram'},
    {value: new imageAnalyzerROIORB(), label: 'Image Analyzer ROIORB'},
    {value: new ChatRecognizer(), label: 'Chat Recognizer'}
  ];

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideo(URL.createObjectURL(file));
    }
  };

  const onVideoAnalyze = useCallback(async () => {
    console.log('checking if video is ready');
    setAnalyzing(true);

    if (!video || !videoRef.current || !chosenAnalyzer) return;

    console.log('analyzing video with ', chosenAnalyzer);

    try {
      if (typeof chosenAnalyzer === typeof new ChatRecognizer()) {
        await chosenAnalyzer.initialize();
      }

      const res = await chosenAnalyzer.analyze(videoRef.current);
      setResult(res);
    } catch (e) {
      console.log(e);
    } finally {
      setAnalyzing(false);
    }
  }, [chosenAnalyzer, video]);

  return (
    <main className={styles.main}>
      <script async src="https://docs.opencv.org/4.5.2/opencv.js" />
      <Card className={'center'}>
        <CardHeader>
          <h1 className={'text-2xl font-bold'}>Video Analyzer</h1>
        </CardHeader>
        <CardContent className={'center'}>
          {!video ? (
            <>
              <h1 className={'pt-4 pb-4'}>Select a Video File To Analyze</h1>
              <input
                type="file"
                accept="video/*"
                style={{display: 'none'}}
                id="videoInput"
                onChange={handleVideoChange}
              />
              <Button
                className={'center'}
                onClick={() => document.getElementById('videoInput')?.click()}
              >
                Choose Video
              </Button>
            </>
          ) : null}
          {video ? (
            <>
              <p>
                Selected: <b>{video}</b>
              </p>
              <Select
                className={'mb-4 mt-4'}
                onChange={a => (a ? setChosenAnalyzer(a.value) : null)}
                theme={theme => ({
                  ...theme,
                  textColor: 'black',
                  colors: {
                    ...theme.colors,
                    primary25: 'lightgrey',
                    primary: 'white',
                    neutral0: 'white'
                  }
                })}
                options={analyzerOptions}
              />
              <div style={{marginTop: '20px', marginBottom: '20px'}}>
                <video ref={videoRef} width="600" controls>
                  <source src={video} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <Button
                disabled={!chosenAnalyzer || analyzing}
                onClick={onVideoAnalyze}
              >
                Analyze Video
              </Button>
              {analyzing ? <Spinner /> : null}
            </>
          ) : null}
          {result && <h2 className={'mt-4'}>{result.map(r => r.found)}</h2>}
        </CardContent>
      </Card>
    </main>
  );
}
