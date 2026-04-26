import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function QRPage() {
  const router = useRouter();
  const { session_id, token } = router.query;

  const [session, setSession] = useState(null);
  const [joinUrl, setJoinUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (session_id) {
      setJoinUrl(`${window.location.origin}/join/${session_id}`);
    }
  }, [session_id]);

  useEffect(() => {
    if (!session_id) return;
    const unsub = onSnapshot(doc(db, 'sessions', session_id), snap => {
      if (snap.exists()) setSession({ id: snap.id, ...snap.data() });
    });
    return unsub;
  }, [session_id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBack = () => {
    router.push(`/admin/${session_id}?token=${token}`);
  };

  return (
    <>
      <Head>
        <title>参加者QRコード | {session?.title || 'Wine Quiz'}</title>
      </Head>

      <main className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">

        {/* Decorative blobs */}
        <div
          className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #9333EA 0%, transparent 70%)', transform: 'translate(-40%, -40%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #D97706 0%, transparent 70%)', transform: 'translate(30%, 30%)' }}
        />

        {/* Back button */}
        <button
          className="absolute top-6 left-6 btn-ghost"
          onClick={handleBack}
        >
          ← 管理者パネルへ戻る
        </button>

        <div className="relative z-10 max-w-sm w-full text-center page-enter">

          {/* Title */}
          <div className="mb-8">
            <div className="text-5xl mb-3">🍷</div>
            <h1 className="text-3xl font-display font-bold mb-1" style={{ color: '#4C1D95' }}>
              {session?.title || '読み込み中...'}
            </h1>
            <p className="text-sm text-gray-500 font-body">
              QRコードをスキャンして参加してください
            </p>
          </div>

          {/* QR Code */}
          {joinUrl && (
            <div className="card flex flex-col items-center gap-6">
              <div
                className="p-5 bg-white rounded-2xl"
                style={{ border: '4px solid #7C3AED', display: 'inline-block' }}
              >
                <QRCodeSVG value={joinUrl} size={220} fgColor="#4C1D95" />
              </div>

              {/* URL display */}
              <div className="w-full p-3 bg-purple-50 rounded-xl">
                <p className="text-xs text-gray-400 mb-1 font-semibold">参加URL</p>
                <p className="text-xs text-velvet-700 break-all font-body">{joinUrl}</p>
              </div>

              {/* Copy button */}
              <button className="btn-ghost w-full" onClick={handleCopy}>
                {copied ? '✓ コピーしました' : '🔗 URLをコピー'}
              </button>
            </div>
          )}

          {/* Hint */}
          <p className="text-xs text-gray-400 mt-6">
            スマホのカメラでQRコードを読み取ると<br />参加画面が開きます
          </p>

        </div>
      </main>
    </>
  );
}
