"use client";
import { useCallback, useRef, useState } from "react";
import styles from "./page.module.css";
import { ocrAnalyzer } from "@/app/helpers/ocrAnalyzer";
import Select from "react-select";
import { Analyzer } from "@/app/helpers/analyzer";
import { imageAnalyzer } from "@/app/helpers/imageAnalyzer";

export default function Home() {
  const [video, setVideo] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [result, setResult] = useState<string | null>(null);
  const [chosenAnalyzer, setChosenAnalyzer] = useState<Analyzer | null>(null);

  const analyzerOptions = [
    { value: new ocrAnalyzer(), label: "OCR Analyzer" },
    { value: new imageAnalyzer(), label: "Image Analyzer" },
  ];

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideo(URL.createObjectURL(file));
    }
  };

  const onVideoAnalyze = useCallback(async () => {
    console.log("checking if video is ready");

    if (!video || !videoRef.current || !chosenAnalyzer) return;

    console.log("analyzing video with ", chosenAnalyzer);

    const res = await chosenAnalyzer.analyze(videoRef.current);
    setResult(res);
  }, [chosenAnalyzer, video]);

  return (
    <main className={styles.main}>
      <script async src="https://docs.opencv.org/4.5.2/opencv.js" />
      <h1>Select a Video File To Analyze</h1>
      <input
        type="file"
        accept="video/*"
        style={{ display: "none" }}
        id="videoInput"
        onChange={handleVideoChange}
      />
      <button onClick={() => document.getElementById("videoInput")?.click()}>
        Choose Video
      </button>
      {video ? (
        <Select
          onChange={(a) => (a ? setChosenAnalyzer(a.value) : null)}
          theme={(theme) => ({
            ...theme,
            textColor: "black",
            colors: {
              ...theme.colors,
              primary25: "black",
              primary: "black",
              neutral0: "grey",
            },
          })}
          options={analyzerOptions}
        />
      ) : null}
      {video ? (
        <button disabled={!chosenAnalyzer} onClick={onVideoAnalyze}>
          Analyze Video
        </button>
      ) : null}
      {video && (
        <div style={{ marginTop: "20px" }}>
          <video ref={videoRef} width="600" controls>
            <source src={video} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      )}
      {result && (
        <div style={{ marginTop: "20px" }}>
          <h2>{result}</h2>
        </div>
      )}
    </main>
  );
}
