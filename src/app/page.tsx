import styles from './page.module.css';
import VideoAnalyzer from '@/components/VideoAnalyzer';
import RealTimeAnalyzer from '@/components/RealTimeAnalyzer';

export default function Home() {
  return (
    <main className={styles.main}>
      <script async src="https://docs.opencv.org/4.5.2/opencv.js" />
      <div className="flex justify-center gap-3 flex-wrap">
        <VideoAnalyzer />
        <RealTimeAnalyzer />
      </div>
    </main>
  );
}
