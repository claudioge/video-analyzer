'use client';
import {Card, CardContent, CardHeader} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import Select from 'react-select';
import {Spinner} from '@/components/ui/spinner';
import {useCallback, useRef, useState} from 'react';
import {Analyzer, Reports} from '@/analyzers/Analyzer';
import {OCRAnalyzer} from '@/analyzers/OCRAnalyzer';
import {TemplateMatchingAnalyzer} from '@/analyzers/TemplateMatchingAnalyzer';
import {ORBAnalyzer} from '@/analyzers/ORBAnalyzer';
import {ORBROIAnalyzer} from '@/analyzers/ORBROIAnalyzer';
import {YOLOAnalyzer} from '@/analyzers/YOLOAnalyzer';
import {HistogramAnalyzer} from '@/analyzers/HistogramAnalyzer';

const VideoAnalyzer = () => {
  const [video, setVideo] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [result, setResult] = useState<Reports | null>(null);
  const [chosenAnalyzer, setChosenAnalyzer] = useState<Analyzer | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  // initialize all analyzers
  const ocrAnalyzerInstance = new OCRAnalyzer();
  const templateMatchingAnalyzerInstance = new TemplateMatchingAnalyzer();
  const ORBAnalyzerInstance = new ORBAnalyzer();
  const imageAnalyzerROIORBInstance = new ORBROIAnalyzer();
  const YOLOAnalyzerInstance = new YOLOAnalyzer();
  const histogramAnalyzerInstance = new HistogramAnalyzer();

  const analyzerOptions = [
    {value: ocrAnalyzerInstance, label: ocrAnalyzerInstance.name},
    {
      value: templateMatchingAnalyzerInstance,
      label: templateMatchingAnalyzerInstance.name
    },
    {value: ORBAnalyzerInstance, label: ORBAnalyzerInstance.name},
    {
      value: imageAnalyzerROIORBInstance,
      label: imageAnalyzerROIORBInstance.name
    },
    {value: YOLOAnalyzerInstance, label: YOLOAnalyzerInstance.name},
    {value: histogramAnalyzerInstance, label: histogramAnalyzerInstance.name}
  ];

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideo(URL.createObjectURL(file));
    }
  };

  const onVideoAnalyze = useCallback(async () => {
    setAnalyzing(true);

    if (!video || !videoRef.current || !chosenAnalyzer) return;

    console.log('analyzing video with ', chosenAnalyzer.name);

    try {
      if (typeof chosenAnalyzer === typeof new YOLOAnalyzer()) {
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
            <div className={'gap-3'}>
              <Button
                disabled={!chosenAnalyzer || analyzing}
                onClick={onVideoAnalyze}
              >
                Analyze Video
              </Button>
              <Button
                disabled={!video}
                onClick={() => {
                  setVideo(null);
                }}
              >
                Remove Video
              </Button>
            </div>
            {analyzing ? <Spinner /> : null}
          </>
        ) : null}
        {result && (
          <div className={'mt-3 max-h-80 overflow-scroll'}>
            <h2>Results:</h2>
            {result.map(r => (
              <div key={r.time + r.found + r.confidence}>
                <p>
                  <b>Frame</b>: {r.time}
                </p>
                <p>
                  <b>Found</b>: {r.found}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoAnalyzer;
