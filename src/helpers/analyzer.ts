
export type Reports = {
  found: string;
  time: number;
}[];

// general analyzer class
export abstract class Analyzer {
  protected constructor() {}
  // analyze method
  abstract analyze(videoFile: HTMLVideoElement): Promise<Reports | null>;
}
