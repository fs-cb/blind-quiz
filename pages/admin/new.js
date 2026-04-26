import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const defaultItem = () => ({
  id: uuidv4(),
  name: '',
  options: ['', '', ''],
  correct: '',
  point: 1,
});

export default function AdminNew() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [items, setItems] = useState([defaultItem()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Item helpers ─────────────────────────────────────────────
  const updateItem = (idx, field, value) => {
    setItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const updateOption = (itemIdx, optIdx, value) => {
    setItems(prev => {
      const next = [...prev];
      const opts = [...next[itemIdx].options];
      opts[optIdx] = value;
      next[itemIdx] = { ...next[itemIdx], options: opts };
      return next;
    });
  };

  const addOption = (itemIdx) => {
    setItems(prev => {
      const next = [...prev];
      next[itemIdx] = { ...next[itemIdx], options: [...next[itemIdx].options, ''] };
      return next;
    });
  };

  const removeOption = (itemIdx, optIdx) => {
    setItems(prev => {
      const next = [...prev];
      const opts = next[itemIdx].options.filter((_, i) => i !== optIdx);
      next[itemIdx] = { ...next[itemIdx], options: opts };
      return next;
    });
  };

  const addItem = () => setItems(prev => [...prev, defaultItem()]);

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  // ── Validation ───────────────────────────────────────────────
  const validate = () => {
    if (!title.trim()) return 'タイトルを入力してください';
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.name.trim()) return `評価項目 ${i + 1} の名前を入力してください`;
      const filledOpts = item.options.filter(o => o.trim());
      if (filledOpts.length < 2) return `評価項目 ${i + 1} の選択肢を2つ以上入力してください`;
      if (!item.correct.trim()) return `評価項目 ${i + 1} の正解を選択してください`;
      if (!filledOpts.includes(item.correct)) return `評価項目 ${i + 1} の正解は選択肢の中から選んでください`;
      if (!item.point || item.point < 1) return `評価項目 ${i + 1} の配点は1以上にしてください`;
    }
    return null;
  };

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);

    try {
      const adminToken = uuidv4();
      const sessionData = {
        title: title.trim(),
        status: 'entry',
        adminToken,
        createdAt: serverTimestamp(),
        items: items.map(({ id, name, options, correct, point }) => ({
          name: name.trim(),
          options: options.filter(o => o.trim()),
          correct: correct.trim(),
          point: Number(point),
        })),
      };

      const ref = await addDoc(collection(db, 'sessions'), sessionData);

      // localStorageにセッション情報を保存（一覧表示用）
      try {
        const stored = JSON.parse(localStorage.getItem('wine-quiz-sessions') || '[]');
        stored.unshift({
          id: ref.id,
          token: adminToken,
          title: title.trim(),
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem('wine-quiz-sessions', JSON.stringify(stored.slice(0, 20)));
      } catch {}

      router.push(`/admin/${ref.id}?token=${adminToken}`);
    } catch (e) {
      console.error(e);
      setError('セッションの作成に失敗しました。Firebaseの設定を確認してください。');
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>新しいクイズを作成 | Wine Quiz</title>
      </Head>

      <main className="relative min-h-screen py-12 px-4">
        <div className="max-w-2xl mx-auto page-enter">

          {/* Header */}
          <div className="text-center mb-10">
            <div className="text-4xl mb-3">🍷</div>
            <h1 className="text-4xl font-display font-bold" style={{ color: '#4C1D95' }}>
              クイズを作成
            </h1>
            <p className="mt-2 text-gray-500 font-body">評価項目と選択肢を自由に設定できます</p>
          </div>

          {/* Title */}
          <div className="card mb-6">
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              イベント名
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="例：ブラインドワイン会"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Items */}
          <div className="space-y-6 mb-6">
            {items.map((item, itemIdx) => (
              <div key={item.id} className="card border-l-4" style={{ borderLeftColor: '#7C3AED' }}>

                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-semibold text-lg" style={{ color: '#4C1D95' }}>
                    評価項目 {itemIdx + 1}
                  </h2>
                  {items.length > 1 && (
                    <button
                      className="btn-danger"
                      onClick={() => removeItem(itemIdx)}
                    >
                      削除
                    </button>
                  )}
                </div>

                {/* Item name */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">項目名</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="例：産地、品種、VT"
                    value={item.name}
                    onChange={e => updateItem(itemIdx, 'name', e.target.value)}
                  />
                </div>

                {/* Options */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-500 mb-2">
                    選択肢
                  </label>
                  <div className="space-y-2">
                    {item.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex gap-2">
                        <input
                          type="text"
                          className="input-field flex-1"
                          placeholder={`選択肢 ${optIdx + 1}`}
                          value={opt}
                          onChange={e => updateOption(itemIdx, optIdx, e.target.value)}
                        />
                        {item.options.length > 2 && (
                          <button
                            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            onClick={() => removeOption(itemIdx, optIdx)}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {item.options.length < 5 && (
                    <button
                      className="mt-2 text-sm text-velvet-600 hover:text-velvet-800 font-semibold transition-colors"
                      onClick={() => addOption(itemIdx)}
                    >
                      ＋ 選択肢を追加
                    </button>
                  )}
                </div>

                {/* Correct answer */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-500 mb-2">
                    正解
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {item.options.filter(o => o.trim()).map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => updateItem(itemIdx, 'correct', opt)}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-all duration-150 ${
                          item.correct === opt
                            ? 'bg-velvet-700 border-velvet-700 text-white shadow-velvet'
                            : 'border-gray-200 text-gray-500 hover:border-velvet-400 hover:text-velvet-600'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                    {item.options.filter(o => o.trim()).length === 0 && (
                      <span className="text-xs text-gray-400">選択肢を入力すると正解を選べます</span>
                    )}
                  </div>
                </div>

                {/* Point */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">
                    配点
                  </label>
                  <div className="flex items-center gap-3">
                    {[1, 2, 3, 5].map(p => (
                      <button
                        key={p}
                        onClick={() => updateItem(itemIdx, 'point', p)}
                        className={`w-12 h-10 rounded-lg text-sm font-bold border-2 transition-all duration-150 ${
                          item.point === p
                            ? 'bg-gold-600 border-gold-600 text-white shadow-md'
                            : 'border-gray-200 text-gray-500 hover:border-gold-400 hover:text-gold-600'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <span className="text-xs text-gray-400">点</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add item */}
          <button
            className="w-full py-4 rounded-xl border-2 border-dashed border-purple-200 text-velvet-600 font-semibold hover:border-velvet-400 hover:bg-purple-50 transition-all duration-150 mb-8"
            onClick={addItem}
          >
            ＋ 評価項目を追加
          </button>

          {/* Error */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-body">
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            className="btn-velvet w-full text-base py-4"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-dots">
                  <span /><span /><span />
                </span>
                作成中...
              </>
            ) : (
              <>✦ クイズを作成する</>
            )}
          </button>

          <p className="text-center text-xs text-gray-400 mt-4">
            作成後、管理者用URLが発行されます。このURLを保存してください。
          </p>
        </div>
      </main>
    </>
  );
}
