import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';

const STATUS_LABEL = {
  entry:     { label: '参加受付中', emoji: '🟡' },
  answering: { label: '回答受付中', emoji: '🟢' },
  revealed:  { label: '結果発表済', emoji: '🟣' },
};

export default function Home() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const stored = (() => {
      try {
        return JSON.parse(localStorage.getItem('wine-quiz-sessions') || '[]');
      } catch { return []; }
    })();

    if (stored.length === 0) { setSessions([]); return; }

    Promise.all(
      stored.map(async (s) => {
        try {
          const snap = await getDoc(doc(db, 'sessions', s.id));
          if (!snap.exists()) return null;
          return { ...s, status: snap.data().status };
        } catch { return s; }
      })
    ).then(results => setSessions(results.filter(Boolean)));
  }, []);

  // Firestoreからセッションを完全削除
  const deleteSession = async (id) => {
    if (!window.confirm('このクイズを削除しますか？\n参加者データもすべて消えます。')) return;
    try {
      const answersSnap = await getDocs(collection(db, 'sessions', id, 'answers'));
      await Promise.all(answersSnap.docs.map(d => deleteDoc(d.ref)));
      await deleteDoc(doc(db, 'sessions', id));
    } catch (e) {
      console.error(e);
    }
    // localStorageからも削除
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      try { localStorage.setItem('wine-quiz-sessions', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const removeFromList = (id) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      try { localStorage.setItem('wine-quiz-sessions', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString('ja-JP', {
        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return ''; }
  };

  return (
    <>
      <Head>
        <title>Our Answer</title>
      </Head>

      <main className="relative min-h-screen py-12 px-4 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #9333EA 0%, transparent 70%)', transform: 'translate(-40%, -40%)' }} />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #D97706 0%, transparent 70%)', transform: 'translate(30%, 30%)' }} />

        <div className="relative z-10 max-w-md mx-auto page-enter">

          {/* Hero */}
          <div className="text-center mb-10">
            <div className="text-7xl mb-5">🍷</div>
            <h1 className="text-5xl font-display font-bold mb-2" style={{ color: '#4C1D95', letterSpacing: '-0.02em' }}>
              Our Answer
            </h1>
            <p className="text-base font-display italic mb-1" style={{ color: '#7C3AED' }}>
              クイズ・プラットフォーム
            </p>
            <div className="wine-divider">
              <span className="text-xs font-body text-gray-400 tracking-widest">探究を、もっと自由に。</span>
            </div>
          </div>

          {/* New session */}
          <button className="btn-velvet w-full text-base py-4 mb-8" onClick={() => router.push('/admin/new')}>
            <span className="text-lg">✦</span>
            新しいクイズを始める
          </button>

          {/* Session list */}
          {sessions.length > 0 && (
            <div>
              <h2 className="font-display text-xl font-semibold mb-4" style={{ color: '#4C1D95' }}>
                マイセッション
              </h2>
              <div className="space-y-3">
                {sessions.map((s) => {
                  const statusInfo = STATUS_LABEL[s.status] || STATUS_LABEL.entry;
                  return (
                    <div
                      key={s.id}
                      className="card hover:shadow-card-hover transition-all duration-200 cursor-pointer group"
                      onClick={() => router.push(`/admin/${s.id}?token=${s.token}`)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-semibold text-lg truncate group-hover:text-velvet-700 transition-colors" style={{ color: '#1C1209' }}>
                            {s.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(s.createdAt)}</p>
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-purple-50 text-velvet-700 flex-shrink-0">
                          {statusInfo.emoji} {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                        <span className="text-xs text-velvet-600 font-semibold group-hover:underline">
                          管理者画面を開く →
                        </span>
                        <div className="flex gap-3" onClick={e => e.stopPropagation()}>
                          <button
                            className="text-xs text-gray-300 hover:text-red-500 transition-colors font-semibold"
                            onClick={() => deleteSession(s.id)}
                          >
                            🗑 削除
                          </button>
                          <button
                            className="text-xs text-gray-300 hover:text-gray-500 transition-colors"
                            onClick={() => removeFromList(s.id)}
                          >
                            一覧から外す
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-xs text-gray-400 mt-4">
                ※ このブラウザで作成したセッションのみ表示されます
              </p>
            </div>
          )}

          {sessions.length === 0 && (
            <div className="grid grid-cols-3 gap-4 text-center mt-4">
              {[{ icon: '⚡', label: '準備ゼロ' }, { icon: '📱', label: 'スマホ対応' }, { icon: '📊', label: 'リアルタイム集計' }].map(({ icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <span className="text-2xl">{icon}</span>
                  <span className="text-xs font-body text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
    </>
  );
}
