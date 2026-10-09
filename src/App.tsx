import React, { useState, useEffect, useRef } from 'react';
import {
  words,
  sentences,
  qaLessons,
  unit11GrammarPatterns,
  rearrangeLessons,
  quizQuestions,
  blanks,
  fillVocabulary,
  schoolPhonetics,
  prepareThaiSpeechText,
} from './data/unit11Data.ts';

type Page = 'home' | 'learn' | 'practice' | 'flash' | 'settings';
type LearnTab = 'Words' | 'Sentences' | 'Q & A' | 'Grammar';
type PracticeMode = 'quiz' | 'blank' | 'rearrange';

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [learnTab, setLearnTab] = useState<LearnTab>('Words');
  const [learnIndex, setLearnIndex] = useState(0);
  const [qaIndex, setQaIndex] = useState(0);
  const [flashIndex, setFlashIndex] = useState(0);
  const [flashBack, setFlashBack] = useState(false);

  // Practice state
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('quiz');

  // Quiz state
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizResponses, setQuizResponses] = useState<{ index: number; choice: number; correct: boolean }[]>([]);

  // Listen & Fill state
  const [fillIndex, setFillIndex] = useState(0);
  const [fillChoice, setFillChoice] = useState<number | null>(null);
  const [fillChecked, setFillChecked] = useState(false);

  // Rearrange state
  const [reorderIndex, setReorderIndex] = useState(0);
  const [reorderPicked, setReorderPicked] = useState<number[]>([]);
  const [reorderChecked, setReorderChecked] = useState(false);

  // Audio / Speech State
  const [speed, setSpeed] = useState<number>(() => {
    const saved = localStorage.getItem('thaiSpeed');
    return saved ? parseFloat(saved) : 0.85;
  });
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Audio Recording State
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [audioURLs, setAudioURLs] = useState<Record<string, string>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Done activities progress
  const [done, setDone] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('thaiDoneUnit11V4');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Track progress
  const totalActivities = words.length + sentences.length + qaLessons.length + rearrangeLessons.length + quizQuestions.length + blanks.length;
  const progressPercent = Math.min(100, Math.round((done.length / Math.max(1, totalActivities)) * 100));

  const markDone = (key: string) => {
    setDone(prev => {
      if (prev.includes(key)) return prev;
      const updated = [...prev, key];
      localStorage.setItem('thaiDoneUnit11V4', JSON.stringify(updated));
      return updated;
    });
  };

  // Populate SpeechSynthesis voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Save speed
  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    localStorage.setItem('thaiSpeed', String(newSpeed));
  };

  // Speak function
  const speak = (thaiText: string, customSpeed?: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('ဤဖုန်းတွင် စာသားမှ အသံဖတ်သည့်စနစ် မရရှိပါ။');
      return;
    }
    window.speechSynthesis.cancel();
    const normalized = prepareThaiSpeechText(thaiText);
    const u = new SpeechSynthesisUtterance(normalized);
    u.lang = 'th-TH';
    u.rate = customSpeed || speed;

    const availableVoices = window.speechSynthesis.getVoices();
    const thVoice =
      availableVoices.find(v => v.lang.toLowerCase() === 'th-th') ||
      availableVoices.find(v => v.lang.toLowerCase().startsWith('th'));

    if (thVoice) {
      u.voice = thVoice;
    } else {
      setStatusMessage('Thai voice not found. Your phone may use a fallback voice. For accurate Thai tones, use recorded audio in the production app.');
    }
    window.speechSynthesis.speak(u);
  };

  // Recording toggle
  const toggleRecord = async (id: string) => {
    if (recordingId === id && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined') {
      alert('Recording requires HTTPS (or localhost) and a compatible browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      audioChunksRef.current = [];

      rec.ondataavailable = e => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: rec.mimeType });
        const url = URL.createObjectURL(blob);
        setAudioURLs(prev => {
          if (prev[id]) URL.revokeObjectURL(prev[id]);
          return { ...prev, [id]: url };
        });
        setRecordingId(null);
      };

      rec.start();
      setRecordingId(id);
    } catch (err: any) {
      alert('Microphone permission unavailable: ' + (err.message || 'Error'));
      setRecordingId(null);
    }
  };

  const navigateTo = (p: Page) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper renderers
  const renderTabBar = () => (
    <div className="controls">
      {(['Words', 'Sentences', 'Q & A', 'Grammar'] as LearnTab[]).map(tab => (
        <button
          key={tab}
          className={`btn ${learnTab === tab ? '' : 'secondary'}`}
          onClick={() => {
            setLearnTab(tab);
            setLearnIndex(0);
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );

  const renderActionButtons = (thai: string, id: string = 'main') => {
    const isRecording = recordingId === id;
    const recordedUrl = audioURLs[id];
    return (
      <>
        <div className="controls">
          <button className="btn" onClick={() => speak(thai)}>
            🔊 နားထောင်ပါ
          </button>
          <button className="btn secondary" onClick={() => speak(thai, 0.7)}>
            🐢 ဖြည်းဖြည်း
          </button>
          <button
            className={`btn ${isRecording ? 'recording' : 'ghost'}`}
            onClick={() => toggleRecord(id)}
          >
            {isRecording ? '⏹️ Stop recording' : '🎙️ အသံသွင်းပါ'}
          </button>
        </div>
        {recordedUrl && (
          <div style={{ marginTop: '12px' }}>
            <p className="muted">သင့်အသံကို ပြန်နားထောင်ပါ</p>
            <audio controls src={recordedUrl} />
          </div>
        )}
      </>
    );
  };

  // Rearrange helper orders
  const rearrangeBankOrder = (lIdx: number) => {
    const count = rearrangeLessons[lIdx].parts.length;
    return Array.from({ length: count }, (_, i) => count - 1 - i);
  };

  return (
    <div className="app">
      {/* Header Banner */}
      <header className="hero">
        <div className="top">
          <div className="brandwrap">
            <img className="school-logo" src="/school-logo.png" alt="ThaiSar school logo" />
            <div>
              <div className="brand-title">THAISAR</div>
              <div className="logo-label">Thai · Myanmar Speaking School</div>
            </div>
          </div>
          <div className="pill">🇹🇭 + 🇲🇲</div>
        </div>
        <h1>အခန်း (၁၁) · မိုးလေဝသ</h1>
        <p>Unit 11 · Listening & Speaking · Beginner</p>
        <div className="progress">
          <span style={{ width: `${progressPercent}%` }}></span>
        </div>
        <div className="small" style={{ marginTop: '7px', color: '#e2f9f0' }}>
          သင်ယူမှု တိုးတက်မှု · {progressPercent}% ({done.length} activities)
        </div>
      </header>

      {/* Main Content Area */}
      <main className="content">
        {/* PAGE: HOME */}
        {page === 'home' && (
          <>
            <div className="section-head">
              <h2>စတင်လေ့လာပါ 🌼</h2>
              <span className="muted">အခန်း ၁၁</span>
            </div>
            <div className="notice">
              အသံကို နားထောင်ပါ → လိုက်ပြောပါ → စာကြောင်းကို လေ့ကျင့်ပါ။ ထိုင်းအက္ခရာ အရင်ကျက်ရန် မလိုပါ။
            </div>
            <div className="rows" style={{ marginTop: '14px' }}>
              <button
                className="tile"
                onClick={() => {
                  setLearnTab('Words');
                  navigateTo('learn');
                }}
              >
                <span className="emoji">📖</span>
                <strong>စကားလုံးများ</strong>
                <small>Vocabulary · {words.length} items</small>
              </button>
              <button
                className="tile"
                onClick={() => {
                  setLearnTab('Sentences');
                  navigateTo('learn');
                }}
              >
                <span className="emoji">🎧</span>
                <strong>ဝါကျများ</strong>
                <small>Listen & repeat · {sentences.length}</small>
              </button>
              <button
                className="tile"
                onClick={() => {
                  setLearnTab('Grammar');
                  navigateTo('learn');
                }}
              >
                <span className="emoji">🧩</span>
                <strong>သဒ္ဒါ</strong>
                <small>Tap to see examples</small>
              </button>
              <button
                className="tile"
                onClick={() => {
                  setLearnTab('Q & A');
                  navigateTo('learn');
                }}
              >
                <span className="emoji">💬</span>
                <strong>အမေး / အဖြေ</strong>
                <small>10 constructed practice Q&amp;A pairs</small>
              </button>
              <button
                className="tile"
                onClick={() => {
                  setPracticeMode('quiz');
                  navigateTo('practice');
                }}
              >
                <span className="emoji">📝</span>
                <strong>Unit 11 Quiz</strong>
                <small>12 comprehension questions</small>
              </button>
            </div>

            <h3 style={{ marginTop: '24px' }}>ဒီနေ့ လေ့လာမယ့် ဝါကျ</h3>
            <div className="card">
              <span className="tag">Listen & repeat</span>
              <div className="thai" lang="th">{sentences[0].thai}</div>
              <div className="phonetic">{sentences[0].phonetic}</div>
              <div className="mm" lang="my">{sentences[0].mm}</div>
              <div className="controls">
                <button className="btn" onClick={() => speak(sentences[0].thai)}>
                  🔊 နားထောင်ပါ
                </button>
                <button className="btn secondary" onClick={() => speak(sentences[0].thai, 0.7)}>
                  🐢 ဖြည်းဖြည်း
                </button>
              </div>
            </div>

            <button className="btn wide" onClick={() => navigateTo('learn')}>
              သင်ခန်းစာ စတင်ရန် →
            </button>
          </>
        )}

        {/* PAGE: LEARN */}
        {page === 'learn' && (
          <>
            {learnTab === 'Q & A' && (
              <>
                <div className="section-head">
                  <h2>မေးခွန်းနှင့် အဖြေ · Q &amp; A</h2>
                  <span className="counter">{qaIndex + 1} / {qaLessons.length}</span>
                </div>
                {renderTabBar()}
                <p className="section-intro">
                  ဤအခန်းတွင် မူရင်း အမေး/အဖြေ သီးခြား မပါရှိသဖြင့် စာအုပ်ပါ ဝါကျများကို အခြေခံပြီး လေ့ကျင့်ရန် ပြင်ဆင်ထားသော အမေး/အဖြေ ၁၀ တွဲဖြစ်သည်။ တစ်ကြောင်းချင်း နားထောင်ပြီး လိုက်ပြောပါ။ ဖြေရန် မလိုပါ။
                </p>
                <div className="card">
                  {/* Question Item */}
                  <div className="qa-item">
                    <span className="tag">Q · မေးခွန်း</span>
                    <div className="thai" lang="th">{qaLessons[qaIndex][0]}</div>
                    <div className="phonetic">{schoolPhonetics[qaLessons[qaIndex][0]] || ''}</div>
                    <div className="mm" lang="my">{qaLessons[qaIndex][2]}</div>
                    {renderActionButtons(qaLessons[qaIndex][0], 'qaQuestion')}
                  </div>

                  <div className="qa-divider">↓ Answer · အဖြေ</div>

                  {/* Answer Item */}
                  <div className="qa-item">
                    <span className="tag">A · အဖြေ</span>
                    <div className="thai" lang="th">{qaLessons[qaIndex][1]}</div>
                    <div className="phonetic">{schoolPhonetics[qaLessons[qaIndex][1]] || ''}</div>
                    <div className="mm" lang="my">{qaLessons[qaIndex][3]}</div>
                    {renderActionButtons(qaLessons[qaIndex][1], 'qaAnswer')}
                  </div>
                </div>

                <div className="controls">
                  <button
                    className="btn secondary"
                    onClick={() => {
                      markDone(`learn-qa-${qaIndex}`);
                      setQaIndex((qaIndex - 1 + qaLessons.length) % qaLessons.length);
                    }}
                  >
                    ← အရင်တစ်ခု
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      markDone(`learn-qa-${qaIndex}`);
                      setQaIndex((qaIndex + 1) % qaLessons.length);
                    }}
                  >
                    နောက်တစ်ခု →
                  </button>
                </div>
                {statusMessage && <p className="footnote">{statusMessage}</p>}
              </>
            )}

            {learnTab === 'Grammar' && (
              <>
                <div className="section-head">
                  <h2>သဒ္ဒါ · Grammar</h2>
                  <span className="counter">{unit11GrammarPatterns.length} patterns</span>
                </div>
                {renderTabBar()}
                <p className="section-intro">
                  အခန်း (၁၁) စာအုပ်မှ ဝါကျများတွင် ပါဝင်သော သဒ္ဒါပုံစံများကို စုစည်းထားပါသည်။ ခေါင်းစဉ်ကို နှိပ်ပြီး ထိုင်းစာ၊ အသံထွက်နှင့် မြန်မာအဓိပ္ပာယ်ကို လေ့လာပါ။
                </p>
                {unit11GrammarPatterns.map((g, j) => {
                  const examples = g.examples
                    .map(t => sentences.find(s => s.thai === t) || words.find(w => w.thai === t))
                    .filter(Boolean);
                  return (
                    <details className="grammar-accordion" key={j} open={j === 0}>
                      <summary>{j + 1}. {g.title}</summary>
                      <div className="grammar-body">
                        <h3 style={{ marginTop: '15px' }}>{g.formula}</h3>
                        <p className="muted">{g.explain}</p>
                        {examples.map((item, exIdx) => item && (
                          <div key={exIdx} style={{ padding: '15px 0', borderTop: '1px solid #efe7f1' }}>
                            <div className="thai" style={{ fontSize: '23px' }} lang="th">{item.thai}</div>
                            <div className="phonetic">{item.phonetic}</div>
                            <div className="mm" lang="my">{item.mm}</div>
                            <div className="controls">
                              <button className="btn" onClick={() => speak(item.thai)}>
                                🔊 နားထောင်ပါ
                              </button>
                              <button className="btn secondary" onClick={() => speak(item.thai, 0.7)}>
                                🐢 ဖြည်းဖြည်း
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </>
            )}

            {(learnTab === 'Words' || learnTab === 'Sentences') && (() => {
              const items = learnTab === 'Words' ? words : sentences;
              const currentItem = items[learnIndex] || items[0];
              return (
                <>
                  <div className="section-head">
                    <h2>နားထောင်ပြီး လိုက်ပြောပါ</h2>
                    <span className="counter">{learnIndex + 1} / {items.length}</span>
                  </div>
                  {renderTabBar()}
                  <div className="card">
                    <span className="tag">{currentItem.category}</span>
                    <div className="thai" lang="th">{currentItem.thai}</div>
                    <div className="phonetic">{currentItem.phonetic}</div>
                    <div className="mm" lang="my">{currentItem.mm}</div>
                    {renderActionButtons(currentItem.thai, `learn-${learnTab}-${learnIndex}`)}
                  </div>
                  <div className="controls">
                    <button
                      className="btn secondary"
                      onClick={() => {
                        markDone(`learn-${learnTab}-${learnIndex}`);
                        setLearnIndex((learnIndex - 1 + items.length) % items.length);
                      }}
                    >
                      ← ရှေ့သို့
                    </button>
                    <button
                      className="btn"
                      onClick={() => {
                        markDone(`learn-${learnTab}-${learnIndex}`);
                        setLearnIndex((learnIndex + 1) % items.length);
                      }}
                    >
                      နောက်တစ်ခု →
                    </button>
                  </div>
                  {statusMessage && <p className="footnote">{statusMessage}</p>}
                </>
              );
            })()}
          </>
        )}

        {/* PAGE: PRACTICE */}
        {page === 'practice' && (
          <>
            <div className="section-head">
              <h2>Practice · လေ့ကျင့်ခန်း</h2>
            </div>
            <div className="rows practice-tiles">
              <button
                className="tile"
                style={practiceMode === 'quiz' ? { borderColor: '#58136d', background: '#fff8da' } : {}}
                onClick={() => setPracticeMode('quiz')}
              >
                <span>📝</span>
                <strong>Unit 11 Quiz</strong>
                <small>သင်ယူထားသည်ကို စမ်းစစ်ပါ</small>
              </button>
              <button
                className="tile"
                style={practiceMode === 'blank' ? { borderColor: '#58136d', background: '#fdf3ff' } : {}}
                onClick={() => setPracticeMode('blank')}
              >
                <span>🎧</span>
                <strong>Listen &amp; Fill</strong>
                <small>နားထောင်ပြီး ဖြည့်ပါ</small>
              </button>
              <button
                className="tile"
                style={practiceMode === 'rearrange' ? { borderColor: '#58136d', background: '#fdf3ff' } : {}}
                onClick={() => setPracticeMode('rearrange')}
              >
                <span>🧩</span>
                <strong>Rearrange Sentence</strong>
                <small>စကားလုံးများကို အစီအစဉ်မှန် စီပါ</small>
              </button>
            </div>

            {/* Sub-mode: QUIZ */}
            {practiceMode === 'quiz' && (() => {
              if (quizIndex >= quizQuestions.length) {
                const total = quizQuestions.length;
                const pct = Math.round((quizScore / total) * 100);
                return (
                  <div className="card quiz-finish">
                    <div className="bigscore">{pct}%</div>
                    <h2>Unit 11 Quiz ပြီးပါပြီ!</h2>
                    <p className="mm">{quizScore} / {total} မှန်ပါတယ်။</p>
                    <p className="muted">မှားခဲ့သော မေးခွန်းများကို ပြန်ကြည့်ပြီး နောက်တစ်ကြိမ် စမ်းကြည့်နိုင်ပါတယ်။</p>
                    {quizResponses
                      .filter(r => !r.correct)
                      .map(r => (
                        <div key={r.index} className="quiz-review">
                          <strong>{quizQuestions[r.index].q}</strong>
                          <p className="muted">{quizQuestions[r.index].why}</p>
                        </div>
                      ))}
                    <button
                      className="btn wide"
                      onClick={() => {
                        setQuizIndex(0);
                        setQuizScore(0);
                        setQuizResponses([]);
                      }}
                    >
                      🔄 Quiz ပြန်ဖြေရန်
                    </button>
                  </div>
                );
              }

              const q = quizQuestions[quizIndex];
              const picked = quizResponses.find(r => r.index === quizIndex);

              return (
                <div className="card">
                  <span className="tag">Unit 11 Quiz · {quizIndex + 1} / {quizQuestions.length}</span>
                  <div className="quiz-progress">
                    <span style={{ width: `${(100 * quizIndex) / quizQuestions.length}%` }}></span>
                  </div>
                  <h3 className="quiz-question">{q.q}</h3>
                  {q.audio && (
                    <div className="controls">
                      <button className="btn" onClick={() => speak(q.audio!)}>
                        🔊 အသံနားထောင်ပါ
                      </button>
                      <button className="btn secondary" onClick={() => speak(q.audio!, 0.7)}>
                        🐢 ဖြည်းဖြည်း
                      </button>
                    </div>
                  )}
                  <div className="stack" style={{ marginTop: '17px' }}>
                    {q.choices.map((choice, j) => {
                      let btnClass = 'quiz-option';
                      if (picked) {
                        if (j === q.correct) btnClass += ' correct';
                        else if (j === picked.choice) btnClass += ' incorrect';
                      }
                      return (
                        <button
                          key={j}
                          className={btnClass}
                          disabled={!!picked}
                          onClick={() => {
                            if (picked) return;
                            const isCorrect = j === q.correct;
                            setQuizResponses(prev => [...prev, { index: quizIndex, choice: j, correct: isCorrect }]);
                            if (isCorrect) setQuizScore(s => s + 1);
                          }}
                        >
                          {String.fromCharCode(65 + j)}. {choice}
                        </button>
                      );
                    })}
                  </div>
                  {picked ? (
                    <>
                      <div className="quiz-feedback">
                        {picked.correct ? '✅ မှန်ပါတယ်!' : '❌ လေ့လာပြီး ထပ်စမ်းကြည့်ပါ။'}
                        <p>{q.why}</p>
                      </div>
                      <button
                        className="btn wide"
                        onClick={() => {
                          const nextIdx = quizIndex + 1;
                          setQuizIndex(nextIdx);
                          if (nextIdx >= quizQuestions.length) {
                            markDone('unit11-quiz-completed');
                          }
                        }}
                      >
                        {quizIndex === quizQuestions.length - 1 ? 'ရလဒ် ကြည့်ရန် →' : 'နောက်မေးခွန်း →'}
                      </button>
                    </>
                  ) : (
                    <p className="muted" style={{ marginTop: '12px' }}>အဖြေတစ်ခုကို ရွေးပါ။</p>
                  )}
                </div>
              );
            })()}

            {/* Sub-mode: LISTEN & FILL */}
            {practiceMode === 'blank' && (() => {
              const q = blanks[fillIndex % blanks.length];
              const ready = fillChoice !== null;
              const correctIdx = q.choices.indexOf(q.answer);

              return (
                <div className="card fill-card">
                  <span className="tag">🎧 Listen &amp; Fill · {(fillIndex % blanks.length) + 1} / {blanks.length}</span>
                  <p className="section-intro">
                    အသံကို နားထောင်ပြီး အဖြေမှန်ကို ရွေးပါ။ <strong>ထိုင်းစာဖတ်တတ်ရန် မလိုပါ။</strong> ကတ်တစ်ခုစီတွင် ထိုင်းစာ၊ စာအုပ်သုံး phonetic၊ မြန်မာအသံထွက်နှင့် မြန်မာအဓိပ္ပာယ် ပါရှိသည်။
                  </p>
                  <div className="fill-prompt">
                    <span className="fill-prompt-label">မြန်မာအဓိပ္ပာယ်</span>
                    <div className="mm" lang="my">{q.meaning}</div>
                    <div className="fill-blank-line" lang="th">{q.blank}</div>
                  </div>
                  <div className="controls">
                    <button className="btn" onClick={() => speak(q.full)}>
                      🔊 နားထောင်ပါ
                    </button>
                    <button className="btn secondary" onClick={() => speak(q.full, 0.7)}>
                      🐢 ဖြည်းဖြည်း
                    </button>
                  </div>
                  <h3 className="fill-heading">အဖြေတစ်ခုကို ရွေးပါ။</h3>
                  <div className="fill-options" role="group" aria-label="Listen and Fill multiple choices">
                    {q.choices.map((word, j) => {
                      const entry = fillVocabulary[word] || ['-', '-', '-'];
                      let stateClass = '';
                      if (fillChecked) {
                        if (j === correctIdx) stateClass = ' is-correct';
                        else if (j === fillChoice) stateClass = ' is-wrong';
                      } else if (fillChoice === j) {
                        stateClass = ' is-selected';
                      }

                      return (
                        <button
                          key={j}
                          type="button"
                          className={`fill-choice${stateClass}`}
                          disabled={fillChecked}
                          aria-pressed={fillChoice === j}
                          onClick={() => {
                            if (!fillChecked) setFillChoice(j);
                          }}
                        >
                          <span className="fill-number">{String.fromCharCode(65 + j)}</span>
                          <span className="fill-lines">
                            <span className="fill-thai" lang="th">{word}</span>
                            <span className="fill-phonetic">{entry[0]}</span>
                            <span className="fill-pronunciation" lang="my">{entry[1]}</span>
                            <span className="fill-meaning" lang="my">{entry[2]}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {!fillChecked ? (
                    <button
                      className="btn wide"
                      disabled={!ready}
                      onClick={() => {
                        if (fillChoice === null) return;
                        setFillChecked(true);
                        if (q.choices[fillChoice] === q.answer) {
                          markDone(`blank-${fillIndex}`);
                        }
                      }}
                    >
                      အဖြေစစ်ဆေးပါ
                    </button>
                  ) : (
                    <div className={`fill-feedback ${fillChoice === correctIdx ? 'good' : 'retry'}`} role="status">
                      <strong>{fillChoice === correctIdx ? '✅ မှန်ပါတယ်!' : '📖 အဖြေမှန်ကို လေ့လာပါ။'}</strong>
                      <p>
                        {fillChoice === correctIdx
                          ? 'အသံကို မှန်ကန်စွာ ရွေးချယ်နိုင်ပါတယ်။'
                          : 'မှားသောအဖြေကို ပြထားပြီး အဖြေမှန်ကို အစိမ်းရောင်ဖြင့် ပြထားပါတယ်။'}
                      </p>
                      <div className="fill-fully">
                        <div className="thai" lang="th">{q.full}</div>
                        <div className="phonetic">{schoolPhonetics[q.full] || ''}</div>
                        <div className="mm" lang="my">{q.meaning}</div>
                      </div>
                      <div className="controls" style={{ marginTop: '14px' }}>
                        <button
                          className="btn secondary"
                          onClick={() => {
                            setFillChoice(null);
                            setFillChecked(false);
                          }}
                        >
                          ↺ ပြန်လေ့ကျင့်ရန်
                        </button>
                        <button
                          className="btn"
                          onClick={() => {
                            setFillIndex(prev => (prev + 1) % blanks.length);
                            setFillChoice(null);
                            setFillChecked(false);
                          }}
                        >
                          {fillIndex === blanks.length - 1 ? 'အစက ပြန်လေ့ကျင့်ရန်' : 'နောက်မေးခွန်း →'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Sub-mode: REARRANGE SENTENCE */}
            {practiceMode === 'rearrange' && (() => {
              const lesson = rearrangeLessons[reorderIndex];
              const available = rearrangeBankOrder(reorderIndex).filter(id => !reorderPicked.includes(id));
              const complete = reorderPicked.length === lesson.parts.length;
              const isCorrect = reorderChecked && complete && reorderPicked.every((id, j) => id === j);

              const fullThai = lesson.parts.map(p => p[0]).join('');
              const fullPhonetic = '/' + lesson.parts.map(p => p[1].replaceAll('/', '')).join('-') + '/';

              return (
                <div className="card">
                  <span className="tag">Rearrange Sentence · {reorderIndex + 1} / {rearrangeLessons.length}</span>
                  <p className="section-intro">
                    မြန်မာအဓိပ္ပာယ်ကို ဖတ်ပြီး ထိုင်းစကားလုံးများကို အစီအစဉ်မှန် စီပါ။ ကတ်တစ်ခုစီတွင် ထိုင်းစာ၊ စာအုပ်သုံး phonetic နှင့် မြန်မာအသံထွက် ပါရှိသည်။
                  </p>
                  <div className="reorder-prompt">
                    <strong>မြန်မာအဓိပ္ပာယ်</strong>
                    <div className="mm">{lesson.meaning}</div>
                  </div>
                  <div className="controls">
                    <button className="btn secondary" onClick={() => speak(fullThai)}>
                      🔊 နားထောင်ပါ
                    </button>
                    <button className="btn ghost" onClick={() => speak(fullThai, 0.7)}>
                      🐢 အနှေးအသံ
                    </button>
                  </div>

                  {/* Selected / Built Area */}
                  <div className="reorder-area">
                    <h4>၁။ စီထားသော စကားလုံးများ (နှိပ်၍ ပြန်ဖြုတ်နိုင်ပါသည်)</h4>
                    <div className="reorder-tiles">
                      {reorderPicked.length === 0 ? (
                        <div className="reorder-empty">အောက်က ကတ်များကို အစဉ်လိုက် နှိပ်ပါ။</div>
                      ) : (
                        reorderPicked.map(id => {
                          const part = lesson.parts[id];
                          return (
                            <button
                              key={id}
                              type="button"
                              className="reorder-token selected"
                              onClick={() => {
                                setReorderPicked(prev => prev.filter(x => x !== id));
                                setReorderChecked(false);
                              }}
                            >
                              <span className="reorder-thai" lang="th">{part[0]}</span>
                              <span className="reorder-phon">{part[1]}</span>
                              <span className="reorder-my" lang="my">{part[2]}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Word Bank Area */}
                  <div className="reorder-bank">
                    <h4>၂။ စကားလုံးကတ်များ</h4>
                    <div className="reorder-tiles">
                      {available.length === 0 ? (
                        <span className="muted">စကားလုံးအားလုံး စီပြီးပါပြီ။</span>
                      ) : (
                        available.map(id => {
                          const part = lesson.parts[id];
                          return (
                            <button
                              key={id}
                              type="button"
                              className="reorder-token"
                              onClick={() => {
                                if (reorderPicked.length < lesson.parts.length) {
                                  setReorderPicked(prev => [...prev, id]);
                                  setReorderChecked(false);
                                }
                              }}
                            >
                              <span className="reorder-thai" lang="th">{part[0]}</span>
                              <span className="reorder-phon">{part[1]}</span>
                              <span className="reorder-my" lang="my">{part[2]}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Feedback */}
                  {reorderChecked && (
                    isCorrect ? (
                      <>
                        <div className="reorder-status good" role="status">
                          <strong>✅ မှန်ပါတယ်!</strong> စာကြောင်းကို မှန်ကန်စွာ စီထားပါတယ်။
                        </div>
                        <div className="reorder-complete">
                          <div className="thai" lang="th">{fullThai}</div>
                          <div className="phonetic">{fullPhonetic}</div>
                          <div className="mm">{lesson.meaning}</div>
                        </div>
                      </>
                    ) : (
                      <div className="reorder-status try" role="status">
                        အစီအစဉ် မမှန်သေးပါ။ စကားလုံးကို နှိပ်ပြီး ပြန်ရွှေ့နိုင်ပါတယ်။
                      </div>
                    )
                  )}

                  {/* Controls */}
                  <div className="reorder-controls">
                    <button
                      className="btn secondary"
                      onClick={() => {
                        setReorderPicked([]);
                        setReorderChecked(false);
                      }}
                    >
                      ↺ ပြန်စီရန်
                    </button>
                    {isCorrect ? (
                      <button
                        className="btn"
                        onClick={() => {
                          setReorderIndex((reorderIndex + 1) % rearrangeLessons.length);
                          setReorderPicked([]);
                          setReorderChecked(false);
                        }}
                      >
                        {reorderIndex === rearrangeLessons.length - 1 ? 'နောက်တစ်ကြိမ် လေ့ကျင့်ရန်' : 'နောက်ဝါကျ →'}
                      </button>
                    ) : (
                      <button
                        className="btn"
                        disabled={!complete}
                        onClick={() => {
                          setReorderChecked(true);
                          if (reorderPicked.every((id, j) => id === j)) {
                            markDone(`rearrange-${reorderIndex}`);
                          }
                        }}
                      >
                        ✓ အဖြေစစ်ရန်
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* PAGE: FLASHCARDS */}
        {page === 'flash' && (() => {
          const w = words[flashIndex];
          return (
            <>
              <div className="section-head">
                <h2>Flashcards · မှတ်သားလေ့ကျင့်</h2>
                <span className="counter">{flashIndex + 1} / {words.length}</span>
              </div>
              <div
                className="card"
                style={{
                  textAlign: 'center',
                  minHeight: '310px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                onClick={() => {
                  setFlashBack(prev => !prev);
                  markDone(`card-${flashIndex}`);
                }}
              >
                <span className="tag">{flashBack ? 'Meaning' : 'Thai word'}</span>
                {flashBack ? (
                  <div className="mm" style={{ fontSize: '26px' }}>{w.mm}</div>
                ) : (
                  <>
                    <div className="thai" lang="th">{w.thai}</div>
                    <div className="phonetic">{w.phonetic}</div>
                  </>
                )}
                <p className="muted" style={{ marginTop: '16px' }}>ကတ်ကိုနှိပ်ပြီး လှန်ကြည့်ပါ</p>
              </div>

              <div className="controls">
                <button className="btn secondary" onClick={() => speak(w.thai)}>
                  🔊 နားထောင်ပါ
                </button>
                <button
                  className="btn ghost"
                  onClick={() => {
                    setFlashIndex((flashIndex - 1 + words.length) % words.length);
                    setFlashBack(false);
                  }}
                >
                  ← ရှေ့သို့
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setFlashIndex((flashIndex + 1) % words.length);
                    setFlashBack(false);
                  }}
                >
                  နောက်တစ်ခု →
                </button>
              </div>
            </>
          );
        })()}

        {/* PAGE: SETTINGS */}
        {page === 'settings' && (
          <>
            <h2>⚙️ အသံနှင့် app settings</h2>
            <div className="card">
              <h3>Thai voice · အသံ</h3>
              <p className="muted">Thai voice selection depends on the browser and operating system.</p>
              <div className="notice">
                {voices.filter(v => v.lang.toLowerCase().startsWith('th')).map(v => `${v.name} (${v.lang})`).join(', ') ||
                  'No Thai voice is currently detected on this device.'}
              </div>
              <div style={{ marginTop: '16px' }}>
                <label htmlFor="rate" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Audio speed · <span>{speed}</span>×
                </label>
                <input
                  id="rate"
                  type="range"
                  min="0.5"
                  max="1.1"
                  step="0.05"
                  value={speed}
                  style={{ width: '100%', accentColor: '#58136d' }}
                  onChange={e => handleSpeedChange(parseFloat(e.target.value))}
                />
              </div>
              <div className="controls" style={{ marginTop: '14px' }}>
                <button className="btn" onClick={() => speak('สวัสดีครับ')}>
                  🔊 Thai အသံ စမ်းနားထောင်ရန်
                </button>
              </div>
            </div>

            <div className="card">
              <h3>Install on phone</h3>
              <p className="muted">
                Open the hosted site in Chrome on Android or Safari on iPhone, then use Add to Home Screen / Install App.
              </p>
              <p className="small">
                A PWA needs HTTPS or localhost. The current preview can be opened directly, and installation allows full offline learning.
              </p>
            </div>

            <div className="card">
              <h3>Student progress</h3>
              <p className="muted">Saved on this device, not synchronized with a school account.</p>
              <button
                className="btn secondary"
                onClick={() => {
                  if (confirm('Reset your progress?')) {
                    setDone([]);
                    localStorage.removeItem('thaiDoneUnit11V4');
                  }
                }}
              >
                Reset progress
              </button>
            </div>
          </>
        )}
      </main>

      {/* Persistent Bottom Mobile Navigation Bar */}
      <nav className="nav" id="nav">
        <button
          className={page === 'home' ? 'active' : ''}
          onClick={() => navigateTo('home')}
        >
          <span className="ico">⌂</span>ပင်မ
        </button>
        <button
          className={page === 'learn' ? 'active' : ''}
          onClick={() => navigateTo('learn')}
        >
          <span className="ico">◉</span>လေ့လာ
        </button>
        <button
          className={page === 'practice' ? 'active' : ''}
          onClick={() => navigateTo('practice')}
        >
          <span className="ico">✦</span>လေ့ကျင့်
        </button>
        <button
          className={page === 'flash' ? 'active' : ''}
          onClick={() => navigateTo('flash')}
        >
          <span className="ico">▣</span>ကတ်များ
        </button>
        <button
          className={page === 'settings' ? 'active' : ''}
          onClick={() => navigateTo('settings')}
        >
          <span className="ico">⚙</span>ချိန်ညှိ
        </button>
      </nav>
    </div>
  );
}
