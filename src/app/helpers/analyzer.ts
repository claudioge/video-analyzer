// general analyzer class
export abstract class Analyzer {
  protected constructor() {}
  // analyze method
  abstract analyze(videoElement: HTMLVideoElement): Promise<string | null>;
}
