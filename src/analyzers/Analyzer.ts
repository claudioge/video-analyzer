export type Reports = {
  found: string;
  time: number;
  bbox?: number[];
  confidence?: number;
  classId?: number;
}[];

// general analyzer class
export abstract class Analyzer {
  // name of the analyzer
  abstract name: string;

  protected constructor() {}

  // analyze method
  abstract analyze(videoFile: HTMLVideoElement): Promise<Reports | null>;

  // initialize method
  async initialize(): Promise<void> {
    console.log('Initializing analyzer');
  }
}
