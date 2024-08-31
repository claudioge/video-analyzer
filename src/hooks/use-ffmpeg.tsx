"use client";
import { fetchFile } from "@ffmpeg/util";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { useRef } from "react";

export const useFfmpeg = () => {
  const ffmpegRef = useRef(new FFmpeg());

  const getCodec = async (file: File) => {
    const ffmpeg = ffmpegRef.current;
    await ffmpeg.load();
    await ffmpeg.writeFile("input.mp4", await fetchFile(file));

    let codecName = "";
    ffmpeg.on("log", ({ message }) => {
      codecName = message.trim();
    });

    await ffmpeg.exec([
      "-i",
      "input.mp4",
      "-show_streams",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=codec_name",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      "-v",
      "quiet",
    ]);

    console.log("executed");

    console.log("output", codecName);

    return codecName;
  };

  return { getCodec };
};
