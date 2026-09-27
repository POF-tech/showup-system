import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { PLATFORM_COLOURS, buildSchedule, calendarPrompts, dateLabel, daysInMonth, groupQuestions, monthForSaved, monthLabel, normalizeCalendar, parseMonth, pillarsPrompt, postToText, questionsPrompt, slug, toCsv } from '../calendarUtils';

const platforms = ['Instagram', 'LinkedIn', 'TikTok', 'YouTube', 'Facebook', 'Pinterest'];
const nextMonth = () => { const date = new Date(); date.setMonth(date.getMonth() + 1, 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; };
const freshForm = () => ({ month: nextMonth(), niche: '', audience: '', product: '', offer: '', pains: '', dates: '', platforms: ['Instagram'], frequency: '3' });
const fallbackPillars = [{ name: 'Search visibility', description: 'Help your audience become easier to find.' }, { name: 'Practical wins', description: 'Give clear, useful steps people can act on.' }];
const progressMessages = {
  questions: ['Searching Google People Also Ask...', 'Reading Reddit threads...', 'Checking Quora and public forums...', 'Scanning TikTok, Instagram and YouTube...'],
  pillars: ['Grouping your audience questions...', 'Shaping your content pillars...'],
  calendar: ['Mapping posting days across the month...', 'Matching questions to each post...', 'Writing hooks and captions...', 'Adding formats, visuals and hashtags...', 'Finishing your calendar...']
};

function downloadCsv(rows, month) {
  const url = URL.createObjectURL(new Blob([toCsv(rows, month)], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url; link.download = `showupp-content-calendar-${month || 'plan'}.csv`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Progress({ stage }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const timer = setInterval(() => setTick((value) => value + 1), 1000); return () => clearInterval(timer); }, []);
  const messages = progressMessages[stage];
  const minutes = Math.floor(tick / 60); const seconds = String(tick % 60).padStart(2, '0');
  return <div className="progress-panel" role="status" aria-live="polite"><span className="spinner" aria-hidden="true" /><div><strong>{messages[Math.min(Math.floor(tick / 6), messages.length - 1)]}</strong><small>Still working - {minutes}:{seconds} elapsed. Please keep this page open.</small></div></div>;
}

export default function Planner() {
  const { token } = useAuth(); const [step, setStep] = useState(1); const [form, setForm] = useState(freshForm); const [questions, setQuestions] = useState([]); const [selectedQuestions, setSelectedQuestions] = useState([]); const [pillars, setPillars] = useState([]); const [posts, setPosts] = useState([]); const [calendarMonth, setCalendarMonth] = useState(''); const [notice, setNotice] = useState(''); const [saved, setSaved] = useState([]); const [showSaved, setShowSaved] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(''); const wasCalendar = useRef(false);
  useEffect(() => { if (step === 5) wasCalendar.current = true; if (step === 1 && wasCalendar.current) { setForm(freshForm()); setQuestions([]); setSelectedQuestions([]); setPillars([]); setPosts([]); setNotice(''); setError(''); setBusy(''); wasCalendar.current = false; window.scrollTo({ top: 0, behavior: 'smooth' }); } }, [step]);
  const loadSaved = async () => { try { const result = await api.calendars(token); setSaved(result.calendars || []); } catch (err) { setError(err.message); } };
  useEffect(() => { loadSaved(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  const update = (key, value) => setForm({ ...form, [key]: value });
  const aboutComplete = ['niche', 'audience', 'product'].every((key) => form[key].trim());
  const chosenQuestions = questions.filter((_, index) => selectedQuestions.includes(index));
  const run = async (stage, work) => { setBusy(stage); setError(''); try { await work(); } catch (err) { setError(err.message); } finally { setBusy(''); } };
  const findQuestions = () => run('questions', async () => { const result = await api.generate(token, { stage: 'questions', prompt: questionsPrompt(form), max_tokens: 2500 }); const found = Array.isArray(result.questions) ? result.questions.filter((item) => item?.question) : []; setQuestions(found); setSelectedQuestions(found.map((_, index) => index)); setStep(3); });
  const buildPillars = () => run('pillars', async () => { const result = await api.generate(token, { stage: 'pillars', prompt: pillarsPrompt(form, chosenQuestions), max_tokens: 1200 }); setPillars(Array.isArray(result.pillars) && result.pillars.length ? result.pillars : fallbackPillars); setStep(4); });
  const buildCalendar = () => run('calendar', async () => { const slots = buildSchedule(form, chosenQuestions, pillars); const result = await api.generate(token, { stage: 'calendar', prompts: calendarPrompts(form, slots, pillars), max_tokens: 4000 }); const rows = normalizeCalendar(result.posts, slots); setPosts(rows); setCalendarMonth(form.month); setNotice(rows.some((post) => post.placeholder) ? 'A few days could not be fully written this time, so they show a starter idea. You can still save, copy and download the full calendar.' : ''); setStep(5); });
  const save = async () => { await api.saveCalendar(token, { name: `${monthLabel(calendarMonth)} content calendar`, month: calendarMonth, data: posts }); await loadSaved(); };
  const openSaved = (calendar) => { setPosts(calendar.data || []); setCalendarMonth(monthForSaved(calendar)); setNotice(''); setShowSaved(false); setStep(5); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const toggleQuestion = (index) => setSelectedQuestions(selectedQuestions.includes(index) ? selectedQuestions.filter((item) => item !== index) : [...selectedQuestions, index]);
  const field = (key, label, type = 'text') => <label>{label}<input type={type} value={form[key]} onChange={(e) => update(key, e.target.value)} required={['niche', 'audience', 'product'].includes(key)} /></label>;
  return <main className="planner">
    <div className="planner-head"><div><p className="eyebrow">YOUR CONTENT PLAN</p><h1>Show up. <em>Every single day.</em></h1><p className="muted">Build a search-led content calendar for the whole month around what your audience is looking for.</p></div><button className={`outline saved-toggle ${showSaved ? 'open' : ''}`} onClick={() => { setShowSaved(!showSaved); if (!showSaved) loadSaved(); }} aria-expanded={showSaved}>My saved calendars{saved.length > 0 && <span className="count">{saved.length}</span>}</button></div>
    {showSaved && <aside className="saved"><div className="saved-head"><h3>My saved calendars</h3><button className="detail-close" onClick={() => setShowSaved(false)} aria-label="Close saved calendars">×</button></div>{saved.length ? saved.map((calendar) => <button key={calendar.id} onClick={() => openSaved(calendar)}>{calendar.name}<small>{calendar.data?.length || 0} posts · saved {new Date(calendar.created_at).toLocaleDateString()}</small></button>) : <p className="saved-empty">You have not saved a calendar yet. Build one below and click "Save to account".</p>}</aside>}
    <div className="steps">{['About you', 'Platforms', 'Questions', 'Pillars', 'Calendar'].map((name, index) => <button key={name} className={step === index + 1 ? 'active' : step > index + 1 ? 'done' : ''} onClick={() => step > index + 1 && !busy && setStep(index + 1)}>{index + 1}<span>{name}</span></button>)}</div>
    {error && <div className="error global-error">{error}</div>}
    {step === 1 && <section className="form-card"><h2>Tell me about you</h2><p className="muted">The more specific you are, the more targeted your calendar will be.</p>{field('month', 'Which month are you planning for?', 'month')}{field('niche', 'Your niche')}{field('audience', 'Your ideal client')}{field('product', 'What you offer - your product or service')}<label>What you help them with<textarea value={form.offer} onChange={(e) => update('offer', e.target.value)} /></label><label>Their biggest pain points<textarea value={form.pains} onChange={(e) => update('pains', e.target.value)} /></label><label>Important dates this month<input value={form.dates} onChange={(e) => update('dates', e.target.value)} placeholder="e.g. 12 - course launch, 20 - live webinar" /></label>{!aboutComplete && <p className="button-note left">Fill in your niche, ideal client and offer to continue.</p>}<button className="primary" onClick={() => setStep(2)} disabled={!aboutComplete}>Next: choose your platforms</button></section>}
    {step === 2 && <section className="form-card"><h2>Which platforms are you on?</h2><p className="muted">Select all that apply. Your calendar will be tailored to the right content formats.</p><div className="platform-grid">{platforms.map((platform) => <button key={platform} className={form.platforms.includes(platform) ? 'selected' : ''} onClick={() => update('platforms', form.platforms.includes(platform) ? form.platforms.filter((item) => item !== platform) : [...form.platforms, platform])}>{platform}</button>)}</div><label>How many times a week can you post?<select value={form.frequency} onChange={(e) => update('frequency', e.target.value)}><option value="3">3 times a week - recommended to start</option><option value="4">4 times a week</option><option value="5">5 times a week</option></select></label>{busy === 'questions' && <Progress stage="questions" />}<div className="actions"><button className="outline" onClick={() => setStep(1)} disabled={Boolean(busy)}>Back</button><button className="primary" onClick={findQuestions} disabled={Boolean(busy) || !form.platforms.length}>{busy === 'questions' ? 'Finding questions...' : 'Find audience questions'}</button></div><p className="button-note">We search Google, Reddit, forums and social media. This usually takes under a minute.</p></section>}
    {step === 3 && <section className="form-card"><h2>What your audience is searching for</h2><p className="muted">Questions your audience is asking on Google, Reddit, public forums and social media. Untick any that don't fit - the ones you keep shape your pillars and calendar.</p><div className="question-toolbar"><span>{selectedQuestions.length} of {questions.length} selected</span><button className="text-button" onClick={() => setSelectedQuestions(selectedQuestions.length === questions.length ? [] : questions.map((_, index) => index))}>{selectedQuestions.length === questions.length ? 'Clear all' : 'Select all'}</button></div><div className="question-list">{questions.length ? groupQuestions(questions).map((group) => <div className="question-group" key={group.source}><h4>{group.source}<small>{group.items.length}</small></h4>{group.items.map((item) => <label className="question" key={item.index}><input type="checkbox" checked={selectedQuestions.includes(item.index)} onChange={() => toggleQuestion(item.index)} /> <span>{item.question}</span></label>)}</div>) : <p className="empty-state">No questions came back. Go back and try again, or add more detail about your audience.</p>}</div>{busy === 'pillars' && <Progress stage="pillars" />}<div className="actions"><button className="outline" onClick={() => setStep(2)} disabled={Boolean(busy)}>Back</button><button className="primary" onClick={buildPillars} disabled={Boolean(busy) || !chosenQuestions.length}>{busy === 'pillars' ? 'Building pillars...' : 'Build my content pillars'}</button></div></section>}
    {step === 4 && <section className="form-card"><h2>Your content pillars</h2><p className="muted">These themes anchor your entire calendar, so your content always feels strategic.</p><div className="pillar-list">{pillars.map((pillar) => <article key={pillar.name}><strong>{pillar.name}</strong><p>{pillar.description}</p></article>)}</div>{busy === 'calendar' && <Progress stage="calendar" />}<div className="actions"><button className="outline" onClick={() => setStep(3)} disabled={Boolean(busy)}>Back</button><button className="primary" onClick={buildCalendar} disabled={Boolean(busy)}>{busy === 'calendar' ? 'Building calendar...' : `Build my ${monthLabel(form.month)} calendar`}</button></div><p className="button-note">This will take a few minutes while we plan and write every post for the month - please keep this page open.</p></section>}
    {step === 5 && <Calendar posts={posts} month={calendarMonth} notice={notice} save={save} restart={() => { setStep(1); setPosts([]); }} />}
  </main>;
}

function PostDetail({ post, month, onClose }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => { const onKey = (event) => event.key === 'Escape' && onClose(); document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey); }, [onClose]);
  const copy = async () => { try { await navigator.clipboard.writeText(postToText(post, month)); setCopied(true); } catch { setCopied(false); } };
  const row = (label, value) => value ? <div className="detail-row"><b>{label}</b><p>{value}</p></div> : null;
  return <div className="modal-backdrop" onClick={onClose}><div className="detail-panel" role="dialog" aria-modal="true" aria-label={post.topic} onClick={(event) => event.stopPropagation()}>
    <div className="detail-header"><span className="eyebrow" style={{ color: PLATFORM_COLOURS[post.platform] }}>{post.platform} · {post.type}</span><button className="detail-close" onClick={onClose} aria-label="Close">×</button></div>
    <p className="detail-date">{dateLabel(month, Number(post.day))}{post.bestTime ? ` · Best time ${post.bestTime}` : ''}{post.keyDate ? ` · ${post.keyDate}` : ''}</p>
    <strong>{post.topic}</strong>
    {post.placeholder && <p className="detail-note">This is a starter idea - use the audience question below as your angle.</p>}
    {row('Hook', post.hook)}
    {post.outline?.length > 0 && <div className="detail-row"><b>Key points</b><ul>{post.outline.map((point) => <li key={point}>{point}</li>)}</ul></div>}
    {row('Caption', post.caption)}
    {row('Call to action', post.cta)}
    {row('Visual', post.visual)}
    {row('How to make it', post.formatGuide)}
    {post.hashtags?.length > 0 && <div className="detail-row"><b>Hashtags</b><p className="hashtags">{post.hashtags.join(' ')}</p></div>}
    {row('Audience question', post.search)}
    {row('Content pillar', post.pillar)}
    {row('Why it works', post.why)}
    <div className="actions"><button className="outline" onClick={onClose}>Close</button><button className="primary" onClick={copy}>{copied ? 'Copied' : 'Copy post'}</button></div>
  </div></div>;
}

function Calendar({ posts, month, notice, save, restart }) {
  const rows = posts;
  const [view, setView] = useState('calendar');
  const [selected, setSelected] = useState(null);
  const [saveState, setSaveState] = useState('');
  const [copied, setCopied] = useState(false);
  const { year, monthIndex } = parseMonth(month);
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const cells = Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }, () => null).concat(Array.from({ length: daysInMonth(month) }, (_, index) => index + 1));
  const postsForDay = (day) => rows.filter((post) => Number(post.day) === day);
  const keyDates = rows.filter((post) => post.keyDate).map((post) => ({ day: Number(post.day), label: post.keyDate }));
  const usedPlatforms = [...new Set(rows.map((post) => post.platform).filter(Boolean))];
  const handleSave = async () => { setSaveState('saving'); try { await save(); setSaveState('saved'); } catch (err) { setSaveState(err.message); } };
  const copyAll = async () => { try { await navigator.clipboard.writeText(rows.map((post) => postToText(post, month)).join('\n\n')); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); } };
  return <section className="calendar-card">
    <div className="calendar-head"><div><p className="eyebrow">YOUR PLAN IS READY</p><h2>Your {monthLabel(month)} calendar</h2><p className="muted">{rows.length} posts across the month · colour coded by platform</p></div><div className="actions calendar-actions"><button className="outline" onClick={handleSave} disabled={saveState === 'saving' || saveState === 'saved'}>{saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved to account' : 'Save to account'}</button><button className="outline" onClick={() => downloadCsv(rows, month)}>Download CSV</button><button className="primary" onClick={copyAll}>{copied ? 'Copied' : 'Copy as text'}</button></div></div>
    {saveState && !['saving', 'saved'].includes(saveState) && <div className="error">{saveState}</div>}
    {notice && <div className="notice">{notice}</div>}
    <div className="view-toggle"><button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>Calendar view</button><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>List view</button></div>
    {view === 'calendar' ? <><div className="calendar-legend">{usedPlatforms.map((platform) => <span key={platform}><i style={{ background: PLATFORM_COLOURS[platform] || '#6B3FA0' }} />{platform}</span>)}{keyDates.length > 0 && <span><i className="legend-date" />Important dates</span>}</div><div className="calendar-grid"><div className="weekday-row">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <strong key={day}>{day}</strong>)}</div><div className="month-grid">{cells.map((day, index) => { const keyDate = day && keyDates.find((item) => item.day === day); return <div className={`calendar-cell ${day ? '' : 'empty'} ${keyDate ? 'key-date' : ''}`} key={`${day || 'empty'}-${index}`}><span className="calendar-day-number">{day}</span>{keyDate && <span className="key-date-label">{keyDate.label}</span>}{day && postsForDay(day).map((post, postIndex) => <button className={`calendar-post ${slug(post.platform)}`} key={`${day}-${postIndex}`} onClick={() => setSelected(post)}><b>{post.platform}</b><span>{post.topic}</span><small>{post.type}</small></button>)}</div>; })}</div></div><p className="calendar-hint">Click any post to see the full details</p></> : <div className="post-list">{rows.map((post, index) => <article className="post" key={`${post.day}-${index}`}><div className="day">{dateLabel(month, Number(post.day))}</div><div><div className="post-meta"><span>{post.platform}</span><span>{post.type}</span>{post.pillar && <span>{post.pillar}</span>}</div><h3>{post.topic}</h3>{post.hook && <p><b>Hook:</b> {post.hook}</p>}<p><b>Call to action:</b> {post.cta}</p>{post.search && <small>Answers: {post.search}</small>}<button className="text-button" onClick={() => setSelected(post)}>View full details</button></div></article>)}</div>}
    {selected && <PostDetail post={selected} month={month} onClose={() => setSelected(null)} />}
    <button className="text-button" onClick={restart}>Start a new calendar</button>
  </section>;
}
