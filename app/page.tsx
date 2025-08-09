import LagAnalysisDashboard from './components/LagAnalysisDashboard';

export default function Home() {
  return (
    <main>
      {/* 滯後效應分析 - 專注於誰先動的問題 */}
      <LagAnalysisDashboard />
    </main>
  );
}