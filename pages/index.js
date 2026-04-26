import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Home() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>ブラインドワイン会クイズ</title>
        <meta name="description" content="準備ゼロで始められる、五感のためのブラインドクイズ・プラットフォーム" />
      </Head>

      <main className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">

        {/* Decorative blobs */}
        <div
          className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-20 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, #9333EA 0%, transparent 70%)',
            transform: 'translate(-40%, -40%)',
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-15 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, #D97706 0%, transparent 70%)',
            transform: 'translate(30%, 30%)',
          }}
        />

        {/* Main card */}
        <div className="relative z-10 text-center max-w-md w-full page-enter">

          {/* Wine glass icon */}
          <div className="text-7xl mb-6 animate-pulse-soft" style={{ animationDuration: '3s' }}>
            🍷
          </div>

          {/* Title */}
          <h1
            className="text-5xl font-display font-bold mb-3"
            style={{ color: '#4C1D95', letterSpacing: '-0.02em' }}
          >
            Wine Quiz
          </h1>

          <p
            className="text-lg font-display italic mb-2"
            style={{ color: '#7C3AED' }}
          >
            ブラインドクイズ・プラットフォーム
          </p>

          {/* Tagline */}
          <div className="wine-divider">
            <span className="text-sm font-body text-gray-400 tracking-widest">
              探究を、もっと自由に。
            </span>
          </div>

          {/* CTA */}
          <div className="mt-8 space-y-4">
            <button
              className="btn-velvet w-full text-base py-4"
              onClick={() => router.push('/admin/new')}
            >
              <span className="text-lg">✦</span>
              新しいワイン会を始める
            </button>

            <p className="text-sm text-gray-400 font-body">
              参加者の方は、会場のQRコードをスキャンしてください
            </p>
          </div>

          {/* Feature points */}
          <div className="mt-12 grid grid-cols-3 gap-4 text-center">
            {[
              { icon: '⚡', label: '準備ゼロ' },
              { icon: '📱', label: 'スマホ対応' },
              { icon: '📊', label: 'リアルタイム集計' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className="text-2xl">{icon}</span>
                <span className="text-xs font-body text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
