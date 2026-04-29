import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { db } from '../../../lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

function calcScore(responses, items) {
  if (!responses) return 0;
  return items.reduce((sum, item) =>
    sum + (responses[item.name] === item.correct ? item.point : 0), 0);
}

function formatTime(ts) {
  if (!ts?.toDate) return '-';
  return ts.toDate().toLocaleTimeString('ja-JP', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

export default function ResultsPage() {
  const router = useRouter();
  const { session_id, token } = router.query;

  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('total');

  useEffect(() => {
    if (!session_id) return;
    (async () => {
      try {
        const sessionSnap = await getDoc(doc(db, 'sessions', session_id));
        if (!sessionSnap.exists()) { setLoading(false); return; }
        const sessionData = { id: sessionSnap.id, ...sessionSnap.data() };
        if (token && sessionData.adminToken !== token) { setLoading(false); return; }
        setSession(sessionData);

        const answersSnap = await getDocs(collection(db, 'sessions', session_id, 'answers'));
        setAnswers(answersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [session_id, token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse-soft">🍷</div>
          <p className="text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card text-center max-w-sm">
          <div className="text-4xl mb-3">😕</div>
          <h2 className="font-display text-xl text-gray-700">セッションが見つかりません</h2>
        </div>
      </div>
    );
  }

  const items = session.items || [];
  const totalMax = items.reduce((s, i) => s + i.point, 0);

  // トータルランキング
  const totalRanking = [...answers]
    .map(a => ({ ...a, score: calcScore(a.responses, items) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const tA = a.lastUpdatedAt?.seconds ?? Infinity;
      const tB = b.lastUpdatedAt?.seconds ?? Infinity;
      return tA - tB;
    });

  // 項目ごとの正解者ランキング
  const itemRankings = items.map(item => {
    const correct = answers
      .filter(a => a.responses?.[item.name] === item.correct)
      .sort((a, b) => {
        const tA = a.lastUpdatedAt?.seconds ?? Infinity;
        const tB = b.lastUpdatedAt?.seconds ?? Infinity;
        return tA - tB;
      });
    return { item, correct };
  });

  const tabs = [
    { id: 'total', label: '🏆 総合' },
    ...items.map(item => ({ id: item.name, label: `🍷 ${item.name}` })),
  ];

  const medal = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;

  return (
    <>
      <Head><title>結果詳細 | {session.title}</title></Head>

      <main className="min-h-screen py-10 px-4">
        <div className="max-w-lg mx-auto page-enter">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              className="btn-ghost"
              onClick={() => router.push(`/admin/${session_id}?token=${token}`)}
            >
              ← 戻る
            </button>
            <div>
              <h1 className="text-2xl font-display font-bold" style={{ color: '#4C1D95' }}>
                結果詳細
              </h1>
              <p className="text-sm text-gray-400">{session.title}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-150 ${
                  activeTab === tab.id
                    ? 'bg-velvet-700 text-white shadow-velvet'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-velvet-400 hover:text-velvet-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── 総合タブ ── */}
          {activeTab === 'total' && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-lg" style={{ color: '#4C1D95' }}>
                  総合ランキング
                </h2>
                <span className="text-xs text-gray-400">満点: {totalMax}点</span>
              </div>

              {totalRanking.length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm">参加者がいません</p>
              ) : (
                <div className="space-y-2">
                  {totalRanking.map((a, idx) => {
                    const pct = totalMax > 0 ? Math.round((a.score / totalMax) * 100) : 0;
                    return (
                      <div key={a.id} className="p-3 rounded-xl bg-cream-100 border border-cream-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg w-8">{medal(idx)}</span>
                            <div>
                              <p className="font-semibold text-sm text-gray-700">{a.nickname}</p>
                              <p className="text-xs text-gray-400">{formatTime(a.lastUpdatedAt)}</p>
                            </div>
                          </div>
                          <span className="font-bold font-display text-lg text-velvet-700">
                            {a.score}
                            <span className="text-xs text-gray-400 font-body">/{totalMax}点</span>
                          </span>
                        </div>
                        {/* 項目ごとの正誤 */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {items.map(item => {
                            const ans = a.responses?.[item.name];
                            const ok = ans === item.correct;
                            return (
                              <span
                                key={item.name}
                                className={`text-xs px-2 py-0.5 rounded-full border ${
                                  ok
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : 'bg-red-50 text-red-500 border-red-200'
                                }`}
                              >
                                {ok ? '✓' : '✗'} {item.name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── 項目別タブ ── */}
          {itemRankings.map(({ item, correct }) => (
            activeTab === item.name && (
              <div key={item.name} className="card">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-display font-semibold text-lg" style={{ color: '#4C1D95' }}>
                    {item.name} ランキング
                  </h2>
                  <span
                    className="text-xs font-semibold px-2 py-1 rounded-full"
                    style={{ background: '#FEF3C7', color: '#92400E' }}
                  >
                    {item.point}点
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  正解: <span className="font-semibold text-velvet-700">{item.correct}</span>
                  　正解者: {correct.length} / {answers.length} 人
                </p>

                {correct.length === 0 ? (
                  <p className="text-center text-gray-400 py-6 text-sm">正解者はいませんでした 🍇</p>
                ) : (
                  <div className="space-y-2">
                    {correct.map((a, idx) => (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-green-50 border border-green-200">
                        <div className="flex items-center gap-2">
                          <span className="text-lg w-8">{medal(idx)}</span>
                          <div>
                            <p className="font-semibold text-sm text-green-800">{a.nickname}</p>
                            <p className="text-xs text-green-600">{formatTime(a.lastUpdatedAt)}</p>
                          </div>
                        </div>
                        <span className="text-green-700 font-bold text-sm">✓ 正解</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 不正解者 */}
                {(() => {
                  const incorrect = answers.filter(a => a.responses?.[item.name] !== item.correct);
                  if (incorrect.length === 0) return null;
                  return (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-gray-400 mb-2">不正解</p>
                      <div className="space-y-1">
                        {incorrect.map(a => (
                          <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                            <span className="text-sm text-gray-500">{a.nickname}</span>
                            <span className="text-xs text-gray-400">
                              {a.responses?.[item.name] || '未回答'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )
          ))}

        </div>
      </main>
    </>
  );
}
