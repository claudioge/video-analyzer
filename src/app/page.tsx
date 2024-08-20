"use client";
import { useCallback, useRef, useState } from "react";
import styles from "./page.module.css";
import { analyzeVideo } from "./helpers/ocrAnalyzer";

export default function Home() {
  const [video, setVideo] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideo(URL.createObjectURL(file));
    }
  };

  const onVideoAnalyze = useCallback(async () => {
    console.log("checking if video is ready");

    if (!video || !videoRef.current) return;

    const detectedWord = await analyzeVideo(videoRef.current);
    setResult(
      detectedWord
        ? `Detected word: ${detectedWord}`
        : "No critical words detected.",
    );
  }, [video]);

  return (
    <main className={styles.main}>
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
      {video ? <button onClick={onVideoAnalyze}>Analyze Video</button> : null}
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
