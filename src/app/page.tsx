"use client";
import { useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const [video, setVideo] = useState<string | null>(null);

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideo(URL.createObjectURL(file));
    }
  };

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

      {video && (
        <div style={{ marginTop: "20px" }}>
          <video width="600" controls>
            <source src={video} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </main>
  );
}
