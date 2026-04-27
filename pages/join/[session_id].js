import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { db, auth } from '../../lib/firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  doc, onSnapshot, setDoc, serverTimestamp, getDoc
} from 'firebase/firestore';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStoredUid(sessionId) {
  try { return localStorage.getItem(`wine-quiz-uid-${sessionId}`); }
  catch { return null; }
}

function setStoredUid(sessionId, uid) {
  try { localStorage.setItem(`wine-quiz-uid-${sessionId}`, uid); }
  catch {}
}

function calcScore(responses, items) {
  if (!responses) return 0;
  return items.reduce((sum, item) => {
    return sum + (responses[item.name] === item.correct ? item.point : 0);
  }, 0);
}

// ── Screen: Nickname entry ────────────────────────────────────────────────────

function NicknameScreen({ onSubmit, loading }) {
  const [name, setName] = useState('');
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-sm w-full page-enter">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🍷</div>
          <h1 className="text-3xl font-display font-bold" style={{ color: '#4C1D95' }}>
            クイズに参加
          </h1>
          <p className="text-gray-400 mt-2 text-sm">ニックネームを入力してください</p>
        </div>
        <div className="card space-y-4">
          <input
            type="text"
            className="input-field text-center text-lg"
            placeholder="例：じゅんじゅん"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onSubmit(name.trim())}
            maxLength={20}
          />
          <button
            className="btn-velvet w-full py-3"
            onClick={() => name.trim() && onSubmit(name.trim())}
            disabled={!name.trim() || loading}
          >
            {loading ? '参加中...' : '✦ 参加する'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Screen: Waiting ───────────────────────────────────────────────────────────

function WaitingScreen({ session, nickname }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-sm w-full text-center page-enter">
        <div className="text-6xl mb-6">⏳</div>
        <h2 className="text-2xl font-display font-bold mb-2" style={{ color: '#4C1D95' }}>
          開始をお待ちください
        </h2>
        <p className="text-gray-500 mb-8">
          <span className="font-semibold" style={{ color: '#7C3AED' }}>{nickname}</span> さん、準備完了です 🎉
        </p>
        <div className="card">
          <p className="text-sm text-gray-400 mb-3">本日のクイズ</p>
          <p className="text-lg font-display font-semibold" style={{ color: '#4C1D95' }}>
            {session.title}
          </p>
          <div className="wine-divider mt-4" />
          <div className="loading-dots flex justify-center gap-1 mt-2">
            <span /><span /><span />
          </div>
          <p className="text-xs text-gray-400 mt-2">主催者がスタートするまでお待ちください</p>
        </div>
      </div>
    </div>
  );
}

// ── Screen: Answering ─────────────────────────────────────────────────────────

function AnsweringScreen({ session, uid, nickname, responses, setResponses, authReady }) {
  const items = session.items || [];
  const [submitting, setSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteError, setVoteError] = useState('');

  // 既存の回答があれば投票済みとみなす
  useEffect(() => {
    if (responses && Object.keys(responses).length > 0) {
      setHasVoted(true);
    }
  }, []);

  const handleSelect = (itemName, option) => {
    setResponses(prev => ({ ...prev, [itemName]: option }));
  };

  const allAnswered = items.every(item => responses[item.name]);

  const handleVote = async () => {
    if (!allAnswered || !authReady) return;
    setSubmitting(true);
    setVoteError('');
    try {
      await setDoc(
        doc(db, 'sessions', session.id, 'answers', uid),
        {
          nickname,
          responses,
          lastUpdatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setHasVoted(true);
    } catch (e) {
      console.error(e);
      setVoteError('投票に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-md mx-auto page-enter">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🍷</div>
          <h1 className="text-2xl font-display font-bold" style={{ color: '#4C1D95' }}>
            {session.title}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            <span className="font-semibold text-velvet-600">{nickname}</span> さん、あなたの答えは？
          </p>
          {/* 投票済みバッジ */}
          {hasVoted && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
              ✓ 投票済み ── 変更して再投票できます
            </div>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-6 mb-8">
          {items.map((item, idx) => (
            <div key={idx} className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-lg" style={{ color: '#4C1D95' }}>
                  {item.name}
                </h2>
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{ background: '#FEF3C7', color: '#92400E' }}
                >
                  {item.point}点
                </span>
              </div>
              <div className="space-y-2">
                {item.options.map((opt, i) => (
                  <label
                    key={i}
                    className={`radio-option ${responses[item.name] === opt ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`item-${idx}`}
                      value={opt}
                      checked={responses[item.name] === opt}
                      onChange={() => handleSelect(item.name, opt)}
                      className="flex-shrink-0"
                    />
                    <span className="font-body font-medium text-gray-700">{opt}</span>
                    {responses[item.name] === opt && (
                      <span className="ml-auto text-velvet-600 font-bold">✓</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {voteError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
            ⚠️ {voteError}
          </div>
        )}

        {/* Vote button */}
        <button
          className="btn-velvet w-full py-4 text-base"
          onClick={handleVote}
          disabled={!allAnswered || submitting || !authReady}
        >
          {submitting
            ? '送信中...'
            : !allAnswered
            ? `あと ${items.filter(i => !responses[i.name]).length} 項目回答してください`
            : hasVoted
            ? '🔄 再投票する'
            : '🍾 投票する'
          }
        </button>

        <p className="text-center text-xs text-gray-400 mt-3">
          集計前であれば何度でも変更・再投票できます
        </p>
      </div>
    </div>
  );
}

// ── Screen: Revealed ──────────────────────────────────────────────────────────

function RevealedScreen({ session, responses, nickname }) {
  const items = session.items || [];
  const score = calcScore(responses, items);
  const totalMax = items.reduce((s, i) => s + i.point, 0);
  const pct = totalMax > 0 ? Math.round((score / totalMax) * 100) : 0;

  const getMessage = () => {
    if (pct === 100) return { emoji: '🏆', text: '完璧です！おめでとう！' };
    if (pct >= 70)  return { emoji: '🎉', text: 'お見事！センスがありますね！' };
    if (pct >= 40)  return { emoji: '🍇', text: 'なかなか！次回も楽しみ！' };
    return { emoji: '😄', text: '楽しい時間を過ごしましょう！' };
  };

  const { emoji, text } = getMessage();

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-md mx-auto page-enter">

        {/* Score hero */}
        <div className="card text-center mb-6">
          <div className="text-5xl mb-3">{emoji}</div>
          <h1 className="text-4xl font-display font-bold mb-1" style={{ color: '#4C1D95' }}>
            {score}
            <span className="text-xl text-gray-400 font-body ml-1">/ {totalMax}点</span>
          </h1>
          <p className="text-velvet-600 font-semibold mb-4">{text}</p>
          <div className="h-3 bg-purple-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 delay-300"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #7C3AED, #9333EA)' }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">正解率 {pct}%</p>
        </div>

        {/* Per-item breakdown */}
        <div className="card mb-6">
          <h2 className="font-display font-semibold text-lg mb-4" style={{ color: '#4C1D95' }}>
            あなたの回答
          </h2>
          <div className="space-y-3">
            {items.map((item, i) => {
              const ans = responses?.[item.name];
              const correct = ans === item.correct;
              return (
                <div
                  key={i}
                  className={`p-4 rounded-xl border-2 ${
                    correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">{item.name}</p>
                      <p className={`font-semibold ${correct ? 'text-green-700' : 'text-red-600'}`}>
                        {correct ? '✓' : '✗'} あなた: {ans || '未回答'}
                      </p>
                      {!correct && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          正解: <span className="font-semibold text-velvet-700">{item.correct}</span>
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-bold" style={{ color: correct ? '#065F46' : '#9CA3AF' }}>
                      {correct ? `+${item.point}点` : '+0点'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card text-center text-gray-400">
          <p className="text-2xl mb-2">🥂</p>
          <p className="text-sm font-body">お疲れ様でした！{nickname} さん</p>
          <p className="text-xs mt-1">また次回お会いしましょう</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function JoinPage() {
  const router = useRouter();
  const { session_id } = router.query;

  const [session, setSession]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [uid, setUid]           = useState(null);
  const [authReady, setAuthReady] = useState(false); // ← 認証復元完了フラグ
  const [nickname, setNickname] = useState('');
  const [joining, setJoining]   = useState(false);
  const [responses, setResponses] = useState({});

  // ── Firebase Auth の復元を待つ ──────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        // 既存の匿名ユーザーが復元された
        setUid(user.uid);
        if (session_id) setStoredUid(session_id, user.uid);
      }
      setAuthReady(true);
    });
    return unsub;
  }, [session_id]);

  // ── localStorageからUID復元（authより先に取得しておく） ────
  useEffect(() => {
    if (!session_id) return;
    const stored = getStoredUid(session_id);
    if (stored) setUid(stored);
  }, [session_id]);

  // ── セッションをリアルタイム監視 ───────────────────────────
  useEffect(() => {
    if (!session_id) return;
    const unsub = onSnapshot(doc(db, 'sessions', session_id), snap => {
      if (snap.exists()) setSession({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
    return unsub;
  }, [session_id]);

  // ── UID確定後に回答データを復元 ────────────────────────────
  useEffect(() => {
    if (!session_id || !uid || !authReady) return;
    (async () => {
      const snap = await getDoc(doc(db, 'sessions', session_id, 'answers', uid));
      if (snap.exists()) {
        const data = snap.data();
        if (data.nickname) setNickname(data.nickname);
        if (data.responses) setResponses(data.responses);
      }
    })();
  }, [session_id, uid, authReady]);

  // ── ニックネーム登録 ────────────────────────────────────────
  const handleNicknameSubmit = async (name) => {
    setJoining(true);
    try {
      let currentUid = uid;
      if (!currentUid || !auth.currentUser) {
        const cred = await signInAnonymously(auth);
        currentUid = cred.user.uid;
        setUid(currentUid);
        setStoredUid(session_id, currentUid);
      }
      await setDoc(
        doc(db, 'sessions', session_id, 'answers', currentUid),
        { nickname: name, lastUpdatedAt: serverTimestamp() },
        { merge: true }
      );
      setNickname(name);
    } catch (e) {
      console.error(e);
    } finally {
      setJoining(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────
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
          <p className="text-sm text-gray-400 mt-2">URLをご確認ください</p>
        </div>
      </div>
    );
  }

  if (!nickname) {
    return (
      <>
        <Head><title>{session.title} | Wine Quiz</title></Head>
        <NicknameScreen onSubmit={handleNicknameSubmit} loading={joining} />
      </>
    );
  }

  const status = session.status;

  return (
    <>
      <Head><title>{session.title} | Wine Quiz</title></Head>
      {status === 'entry' && (
        <WaitingScreen session={session} nickname={nickname} />
      )}
      {status === 'answering' && (
        <AnsweringScreen
          session={session}
          uid={uid}
          nickname={nickname}
          responses={responses}
          setResponses={setResponses}
          authReady={authReady}
        />
      )}
      {status === 'revealed' && (
        <RevealedScreen session={session} responses={responses} nickname={nickname} />
      )}
    </>
  );
}
