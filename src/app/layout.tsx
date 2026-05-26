import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'AI Relay — Serverless AI API Relay Gateway',
  description: '无服务器 AI API 中转网关，一键部署到 Vercel，2 分钟拥有多 Provider 路由、Key 轮换、Fallback、Admin 后台与用量追踪。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body style={{
        margin: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: '#0a0a0f',
        color: '#e0e0e0',
      }}>
        <ErrorBoundary>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
