import LagAnalysisDashboard from './components/LagAnalysisDashboard';
import ErrorBoundary from './components/ErrorBoundary';

export default function Home() {
  return (
    <main>
      <ErrorBoundary>
        {/* 滯後效應分析 - 專注於誰先動的問題 */}
        <LagAnalysisDashboard />
      </ErrorBoundary>
    </main>
  );
}