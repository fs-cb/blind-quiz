import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../../lib/firebase';
import {
  doc, collection, onSnapshot, updateDoc, deleteDoc, getDocs, serverTimestamp
} from 'firebase/firestore';

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcScore(responses, items) {
  if (!responses) return 0;
  return items.reduce((sum, item) => {
    return sum + (responses[item.name] === item.correct ? item.point : 0);
  }, 0);
}

const STATUS_LABEL = {
  entry:     { label: '参加受付中', cls: 'badge-entry',     dot: '🟡' },
  answering: { label: '回答受付中', cls: 'badge-answering', dot: '🟢' },
  revealed:  { label: '結果発表中', cls: 'badge-revealed',  dot: '🟣' },
};

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCSV(session, answers) {
  const items = session.items || [];
  const header = ['ニックネーム', ...items.map(i => i.name), '合計点', '最終更新'];
  const rows = answers.map(a => {
    const responses = a.responses || {};
    const score = calcScore(responses, items);
    const ts = a.lastUpdatedAt?.toDate
      ? a.lastUpdatedAt.toDate().toLocaleTimeString('ja-JP')
      : '-';
    return [a.nickname, ...items.map(i => responses[i.name] || '-'), score, ts];
  });

  const csv = [header, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${session.title || 'wine-quiz'}_結果.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const router = useRouter();
  const { session_id, token } = router.query;

  const [session, setSession]   = useState(null);
  const [answers, setAnswers]   = useState([]);
  const [authOk, setAuthOk]     = useState(false);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [joinUrl, setJoinUrl]   = useState('');
  const [copied, setCopied]     = useState(false);
  const confirmDelete = useRef(false);

  // Build join URL after mount (needs window)
  useEffect(() => {
    if (session_id) {
      setJoinUrl(`${window.location.origin}/join/${session_id}`);
    }
  }, [session_id]);

  // Listen to session doc
  useEffect(() => {
    if (!session_id) return;
    const unsub = onSnapshot(doc(db, 'sessions', session_id), snap => {
      if (!snap.exists()) { setLoading(false); return; }
      const data = { id: snap.id, ...snap.data() };
      setSession(data);
      if (token && data.adminToken === token) setAuthOk(true);
      setLoading(false);
    });
    return unsub;
  }, [session_id, token]);

  // Listen to answers subcollection
  useEffect(() => {
    if (!session_id) return;
    const unsub = onSnapshot(
      collection(db, 'sessions', session_id, 'answers'),
      snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAnswers(docs);
      }
    );
    return unsub;
  }, [session_id]);

  // ── Status control ──────────────────────────────────────────
  const setStatus = async (status) => {
    await updateDoc(doc(db, 'sessions', session_id), { status });
  };

  // ── Delete session ──────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm('このワイン会を削除しますか？参加者データもすべて消えます。')) return;
    setDeleting(true);
    try {
      const answersSnap = await getDocs(collection(db, 'sessions', session_id, 'answers'));
      await Promise.all(answersSnap.docs.map(d => deleteDoc(d.ref)));
      await deleteDoc(doc(db, 'sessions', session_id));
      // localStorageからも削除
      try {
        const stored = JSON.parse(localStorage.getItem('wine-quiz-sessions') || '[]');
        const updated = stored.filter(s => s.id !== session_id);
        localStorage.setItem('wine-quiz-sessions', JSON.stringify(updated));
      } catch {}
      router.push('/');
    } catch (e) {
      console.error(e);
      setDeleting(false);
    }
  };

  // ── Copy URL ────────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Ranked answers（得点降順 → 投票時間昇順） ──────────────
  const rankedAnswers = [...answers]
    .map(a => ({ ...a, score: calcScore(a.responses, session?.items || []) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // 同点の場合は投票時間が早い順
      const tA = a.lastUpdatedAt?.seconds ?? Infinity;
      const tB = b.lastUpdatedAt?.seconds ?? Infinity;
      return tA - tB;
    });

  // ── Loading / auth ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse-soft">🍷</div>
          <p className="text-gray-400 font-body">読み込み中...</p>
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

  if (!authOk) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card text-center max-w-sm">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="font-display text-xl text-gray-700">アクセス権がありません</h2>
          <p className="text-sm text-gray-400 mt-2">管理者URLから再度アクセスしてください</p>
        </div>
      </div>
    );
  }

  const status = session.status;
  const statusInfo = STATUS_LABEL[status] || STATUS_LABEL.entry;
  const items = session.items || [];
  const totalMax = items.reduce((s, i) => s + i.point, 0);
  const answeredCount = answers.filter(a => a.responses && Object.keys(a.responses).length > 0).length;

  return (
    <>
      <Head>
        <title>管理者パネル | {session.title}</title>
      </Head>

      <main className="min-h-screen py-10 px-4">
        <div className="max-w-2xl mx-auto space-y-6 page-enter">

          {/* ── Header ── */}
          <div className="card">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🍷</span>
                  <h1 className="text-2xl font-display font-bold" style={{ color: '#4C1D95' }}>
                    {session.title}
                  </h1>
                </div>
                <span className={statusInfo.cls}>
                  {statusInfo.dot} {statusInfo.label}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">参加者数</p>
                <p className="text-3xl font-display font-bold" style={{ color: '#6D28D9' }}>
                  {answers.length}
                  <span className="text-sm text-gray-400 font-body ml-1">人</span>
                </p>
              </div>
            </div>
          </div>

          {/* ── Quick actions ── */}
          <div className="flex gap-3 flex-wrap">
            <button className="btn-ghost" onClick={() => router.push('/')}>
              ← TOPへ戻る
            </button>
            <button
              className="btn-ghost"
              onClick={() => router.push(`/qr/${session_id}?token=${token}`)}
            >
              📱 QRコードを表示
            </button>
          </div>

          {/* ── Control Panel ── */}
          <div className="card">
            <h2 className="font-display text-lg font-semibold mb-4" style={{ color: '#4C1D95' }}>
              進行コントロール
            </h2>
            <div className="flex flex-wrap gap-3">
              {status === 'entry' && (
                <>
                  <button className="btn-velvet" onClick={() => setStatus('answering')}>
                    ▶ 回答受付を開始する
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => router.push(`/admin/edit?session_id=${session_id}&token=${token}`)}
                  >
                    ✏️ 設問を編集する
                  </button>
                </>
              )}
              {status === 'answering' && (
                <button className="btn-velvet" onClick={() => setStatus('revealed')}>
                  ✦ 集計して結果を発表する
                </button>
              )}
              {status === 'revealed' && (
                <div className="flex flex-wrap gap-3 w-full">
                  <button className="btn-gold" onClick={() => exportCSV(session, rankedAnswers)}>
                    📥 CSVでダウンロード
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      if (window.confirm('締切を解除して回答受付中に戻しますか？\n参加者が再度回答できるようになります。')) {
                        setStatus('answering');
                      }
                    }}
                  >
                    🔓 締切を解除して受付に戻す
                  </button>
                </div>
              )}
            </div>

            {status === 'answering' && (
              <div className="mt-4 p-3 bg-purple-50 rounded-xl">
                <p className="text-sm text-velvet-700">
                  回答済み: <strong>{answeredCount}</strong> / {answers.length} 人
                </p>
                <div className="mt-2 h-2 bg-purple-100 rounded-full overflow-hidden">
                  <div
                    className="score-bar"
                    style={{ width: answers.length ? `${(answeredCount / answers.length) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Items (answer key) ── */}
          <div className="card">
            <h2 className="font-display text-lg font-semibold mb-4" style={{ color: '#4C1D95' }}>
              設問と正解一覧
            </h2>
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                  <div>
                    <span className="text-xs font-semibold text-gray-500">{item.name}</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.options.map(opt => (
                        <span
                          key={opt}
                          className={`text-xs px-2 py-0.5 rounded-full border ${
                            opt === item.correct
                              ? 'bg-velvet-700 text-white border-velvet-700'
                              : 'bg-white text-gray-500 border-gray-200'
                          }`}
                        >
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded-full"
                      style={{ background: '#FEF3C7', color: '#92400E' }}
                    >
                      {item.point}点
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-right text-xs text-gray-400 mt-3">満点: {totalMax}点</p>
          </div>

          {/* ── Participant list / Ranking ── */}
          <div className="card">
            <h2 className="font-display text-lg font-semibold mb-4" style={{ color: '#4C1D95' }}>
              {status === 'revealed' ? 'ランキング' : '参加者一覧'}
            </h2>

            {answers.length === 0 ? (
              <p className="text-center text-gray-400 py-6 text-sm">
                まだ参加者がいません 🍇
              </p>
            ) : (
              <div className="space-y-2">
                {rankedAnswers.map((a, idx) => {
                  const rank = idx + 1;
                  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
                  const answered = a.responses && Object.keys(a.responses).length > 0;
                  const pct = totalMax > 0 ? (a.score / totalMax) * 100 : 0;

                  const updatedTime = a.lastUpdatedAt?.toDate
                    ? a.lastUpdatedAt.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : null;

                  return (
                    <div key={a.id} className="p-3 bg-cream-100 rounded-xl border border-cream-200">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-base w-8 flex-shrink-0">{medal}</span>
                          <div className="min-w-0">
                            <span className="font-semibold text-sm text-gray-700 block truncate">{a.nickname}</span>
                            {answered && updatedTime && (
                              <span className="text-xs text-gray-400">{updatedTime}</span>
                            )}
                            {!answered && (
                              <span className="text-xs text-gray-400">未回答</span>
                            )}
                          </div>
                        </div>
                        {/* 回答済みなら常にスコアを表示 */}
                        {answered && (
                          <div className="text-right flex-shrink-0 ml-2">
                            <span className="font-bold text-velvet-700 font-display text-lg">
                              {a.score}
                            </span>
                            <span className="text-xs text-gray-400 font-body">/{totalMax}点</span>
                          </div>
                        )}
                      </div>

                      {/* スコアバーは常に表示（回答済みのみ） */}
                      {answered && (
                        <div className="h-1.5 bg-purple-100 rounded-full mt-2 overflow-hidden">
                          <div className="score-bar" style={{ width: `${pct}%` }} />
                        </div>
                      )}

                      {status === 'revealed' && (
                        <>
                          {/* Per-item breakdown */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {items.map(item => {
                              const ans = a.responses?.[item.name];
                              const correct = ans === item.correct;
                              return (
                                <span
                                  key={item.name}
                                  className={`text-xs px-2 py-0.5 rounded-full border ${
                                    !ans
                                      ? 'bg-gray-50 text-gray-400 border-gray-200'
                                      : correct
                                      ? 'bg-green-50 text-green-700 border-green-200'
                                      : 'bg-red-50 text-red-600 border-red-200'
                                  }`}
                                >
                                  {item.name}: {ans || '未回答'} {correct ? '✓' : ans ? '✗' : ''}
                                </span>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Danger zone ── */}
          <div className="card border border-red-100">
            <h2 className="font-display text-base font-semibold text-red-600 mb-3">
              ⚠️ 危険な操作
            </h2>
            <button
              className="btn-danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? '削除中...' : '🗑 このワイン会を削除する'}
            </button>
            <p className="text-xs text-gray-400 mt-2">参加者データも含めて完全に削除されます</p>
          </div>

        </div>
      </main>
    </>
  );
}
