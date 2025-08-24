import CoinBasedDashboard from './components/CoinBasedDashboard';
import ErrorBoundary from './components/ErrorBoundary';

export default function Home() {
  return (
    <main>
      <ErrorBoundary>
        {/* 底層代幣分析 - 以代幣為主導，顯示所有持有公司 */}
        <CoinBasedDashboard />
      </ErrorBoundary>
    </main>
  );
}