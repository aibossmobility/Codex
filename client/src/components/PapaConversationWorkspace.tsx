import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, MessageCircle, Plus } from 'lucide-react';
import { conversationKinds, papaStages, papaPrompts, conversationQuestions, conversationMissing, conversationInView, type PapaConversation } from '../../../shared/papa-conversations';
import './PapaConversationWorkspace.css';

const views = ['Upcoming', 'Missing information', 'Completed reflections', 'All conversations'];
const topics = [
  { name: 'Choose together', path: '/', description: 'Let their curiosity lead on the homepage.' },
  { name: 'The PAPA Framework', path: '/papa-framework', description: 'Explore Presence → Authority → Purpose → Alignment.' },
  { name: 'A relationship with an adult son', path: '/adult-son-relationship', description: 'Make room for listening and a new season of fatherhood.' },
  { name: 'A relationship with an adult daughter', path: '/adult-daughter-relationship', description: 'Explore what presence and trust could look like.' },
  { name: 'Why adult children pull away', path: '/why-adult-children-pull-away', description: 'Consider distance with curiosity and care.' },
  { name: 'Welcome to Papa Life', path: '/welcome-to-papa-life', description: 'Explore the mission with a pastor, partner, or someone new.' },
];
function fresh(kind = 'Explorer'): PapaConversation { return {id: crypto.randomUUID(), person: '', date: '', kind: kind as PapaConversation['kind'], purpose: '', certainty: 'Unknown', questions: [...conversationQuestions[kind]], stage: 'Presence', prompt: papaPrompts.Presence, useful: '', takeaways: ['', ''], steps: '', missing: '', topic: '/', completed: false}; }
function dateLabel(s: string) { return s ? new Date(s + 'T12:00:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}) : 'Date to confirm'; }

export default function PapaConversationWorkspace() {
  const [records, setRecords] = useState<PapaConversation[]>([]);
  const [selected, setSelected] = useState<PapaConversation | null>(null);
  const [view, setView] = useState('Upcoming'), [tab, setTab] = useState('Prepare'), [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [dirty, setDirty] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  async function load() {
    setLoading(true); setError('');
    try { const r = await fetch('/api/admin/papa-conversations', {credentials: 'include', cache: 'no-store'}); if (!r.ok) throw Error(r.status === 401 ? 'Your sign-in expired. Sign in again to load your private notes.' : 'Your conversations could not be loaded. Please retry.'); const data = await r.json(); setRecords(data.conversations); }
    catch(e) { setError((e as Error).message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { const fn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', fn); return () => window.removeEventListener('beforeunload', fn); }, [dirty]);
  function leave() { if (dirty && !window.confirm('Discard your unsaved changes?')) return false; setDirty(false); setError(''); setNotice(''); return true; }
  function create(kind = 'Explorer') { if (!leave()) return; setSelected(fresh(kind)); setTab('Prepare'); setDirty(true); }
  function change(patch: Partial<PapaConversation>) { setSelected(c => c ? {...c, ...patch} : c); setDirty(true); setNotice(''); }
  function open(c: PapaConversation) { if (!leave()) return; setSelected(structuredClone(c)); setTab(c.completed ? 'Reflect' : 'Prepare'); }
  async function save(complete?: boolean) {
    if (!selected) return;
    if (!selected.person.trim()) { setError('Add the person’s name before saving.'); return; }
    setSaving(true); setError('');
    try {
      const r = await fetch('/api/admin/papa-conversations', {method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({...selected, completed: complete ?? selected.completed})});
      const data = await r.json(); if (!r.ok || !data.ok) throw Error(r.status === 401 ? 'Your sign-in expired. Keep these notes open and sign in again in another tab, then retry saving.' : data.error || 'Saving failed. Your notes are still here. Please retry.');
      setRecords(rs => [data.conversation, ...rs.filter(c => c.id !== selected.id)]); setSelected(data.conversation); setDirty(false); setNotice('Saved to Papa Life');
    } catch(e) { setError((e as Error).message); } finally { setSaving(false); }
  }
  const filtered = records.filter(c => conversationInView(c, view) && [c.person, c.purpose, c.kind].join(' ').toLowerCase().includes(query.toLowerCase())).sort((a,b) => (a.date || '9999').localeCompare(b.date || '9999'));
  const topic = topics.find(t => t.path === selected?.topic) || topics[0];
  return <section id="conversations" className="plc no-print" aria-label="Papa Life conversation workspace">
    <div className="plc-heading"><div><p className="plc-eyebrow">Brian’s private conversation workspace</p><h2>One topic. A real conversation.</h2><p>Prepare lightly, explore Papa Life together, and remember what helped.</p></div><button className="plc-primary" onClick={() => create()} disabled={saving}><Plus size={17}/> New conversation</button></div>
    {error && <div className="plc-error" role="alert">{error} {!selected && <button onClick={load}>Retry loading</button>} {error.includes('sign-in') && <a href="/login?returnTo=/admin/papa-life-outreach" target="_blank" rel="noopener noreferrer">Sign in in a new tab</a>}</div>}
    {selected ? <>
      <div className="plc-toolbar"><button className="plc-link" disabled={saving} onClick={() => {if (leave()) setSelected(null);}}><ArrowLeft size={16}/> Conversations</button><span aria-live="polite">{saving ? 'Saving…' : dirty ? 'Unsaved changes' : notice || 'Saved conversation'}</span><button className="plc-primary" disabled={saving} onClick={() => save()}><Check size={16}/> Save conversation</button></div>
      <div className="plc-tabs" role="tablist" aria-label="Conversation mode">{['Prepare','Reflect'].map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t === 'Prepare' ? 'Prepare lightly' : 'Reflect & review'}</button>)}</div>
      <fieldset disabled={saving} className="plc-editor" role="tabpanel" aria-label={tab === 'Prepare' ? 'Prepare lightly' : 'Reflect and review'}>
        {tab === 'Prepare' ? <>
          <div className="plc-row"><label>Person<input value={selected.person} maxLength={200} placeholder="Who are you connecting with?" onChange={e => change({person: e.target.value})}/></label><label>Date <small>Pacific</small><input type="date" value={selected.date} onChange={e => change({date: e.target.value})}/></label></div>
          <div className="plc-row"><label>Connecting as<select value={selected.kind} onChange={e => change({kind: e.target.value as PapaConversation['kind']})}>{conversationKinds.map(k => <option key={k}>{k}</option>)}</select></label><label>Purpose / interest status<select value={selected.certainty} onChange={e => change({certainty: e.target.value as PapaConversation['certainty']})}>{['Unknown', 'Stated interest', 'Confirmed purpose'].map(v => <option key={v}>{v}</option>)}</select></label></div>
          <label>Purpose or stated interest<textarea value={selected.purpose} maxLength={5000} placeholder="Use their words when possible. It is okay if this is still unknown." onChange={e => change({purpose: e.target.value})}/></label>
          <label>Anything to clarify? <small>Optional</small><input value={selected.missing} maxLength={3000} placeholder="What information is still missing?" onChange={e => change({missing: e.target.value})}/></label>
          <div className="plc-divider"><h3>Two or three possible questions</h3><p>Pick one, edit one, or let their interest lead.</p><button className="plc-link" onClick={() => change({questions: [...conversationQuestions[selected.kind]]})}>Use suggestions for {selected.kind.toLowerCase()}</button></div>
          {selected.questions.map((q,i) => <label key={i}>Question {i+1} {i === 2 && <small>Optional</small>}<input value={q} maxLength={2000} onChange={e => change({questions: selected.questions.map((v,j) => i === j ? e.target.value : v)})}/></label>)}
          <div className="plc-topic"><h3>Explore the existing website together</h3><p>Open one topic in another tab. Return here for one or two takeaways.</p><label>Topic to explore<select value={selected.topic} onChange={e => change({topic: e.target.value})}>{topics.map(t => <option value={t.path} key={t.path}>{t.name}</option>)}</select></label><p>{topic.description}</p><a className="plc-primary" href={topic.path} target="_blank" rel="noopener noreferrer">Explore {topic.name.toLowerCase()} <ArrowUpRight size={16}/></a></div>
          <div className="plc-divider"><h3>One PAPA Framework prompt</h3><p>Presence → Authority → Purpose → Alignment</p><div className="plc-stages">{papaStages.map(s => <button key={s} aria-pressed={selected.stage === s} onClick={() => change({stage: s, prompt: papaPrompts[s]})}>{s}</button>)}</div><label>Prompt for this conversation<textarea value={selected.prompt} maxLength={3000} onChange={e => change({prompt: e.target.value})}/></label></div>
          <button className="plc-link" onClick={() => setTab('Reflect')}>Capture what was useful <ArrowUpRight size={16}/></button>
        </> : <>
          <h3>{selected.person || 'This conversation'} {selected.completed && <small>· Reflection complete</small>}</h3>
          <p>One or two points can be enough. There is no agenda to finish.</p>
          <label>What was useful?<textarea value={selected.useful} maxLength={10000} placeholder="What connected, helped, or surprised you?" onChange={e => change({useful: e.target.value})}/></label>
          {selected.takeaways.map((t,i) => <label key={i}>Takeaway {i+1} {i === 1 && <small>Optional</small>}<input value={t} maxLength={3000} placeholder={i ? 'Another thought, if useful' : 'The thing to remember'} onChange={e => change({takeaways: selected.takeaways.map((v,j) => i === j ? e.target.value : v)})}/></label>)}
          <label>Possible next steps for Brian’s review<textarea value={selected.steps} maxLength={10000} placeholder="What might help next? Nothing needs to be decided now." onChange={e => change({steps: e.target.value})}/></label>
          <p className="plc-note">These notes stay in this private workspace. Saving does not send messages or change calendar, CRM, or meeting records.</p>
          <button className="plc-primary" disabled={saving || !selected.completed && !selected.useful.trim() && !selected.takeaways.some(t => t.trim())} onClick={() => save(!selected.completed)}>{selected.completed ? 'Reopen conversation' : 'Save & complete reflection'}<Check size={16}/></button>
          {!selected.completed && !selected.useful.trim() && !selected.takeaways.some(t => t.trim()) && <p className="plc-note">Add what was useful or one takeaway to complete.</p>}
        </>}
      </fieldset>
    </> : <>
      <div className="plc-tabs" role="tablist" aria-label="Conversation views">{views.map(v => <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}>{v} <span>{records.filter(c => conversationInView(c,v)).length}</span></button>)}</div>
      <label className="plc-search">Find a conversation<input type="search" value={query} placeholder="Search person or interest" onChange={e => setQuery(e.target.value)}/></label>
      {loading ? <p role="status">Loading conversations…</p> : filtered.length ? <div className="plc-cards">{filtered.map(c => <button className="plc-card" key={c.id} onClick={() => open(c)}><div><span>{c.kind}</span><ArrowUpRight size={18}/></div><h3>{c.person}</h3><p>{c.purpose || 'Interest still to clarify'}</p><small>{dateLabel(c.date)} · {c.completed ? 'Reflection complete' : conversationMissing(c).join(' · ') || 'Ready to explore'}</small></button>)}</div> : <div className="plc-empty"><MessageCircle size={30}/><h3>{query ? 'No conversations match.' : view === 'Missing information' ? 'Nothing to clarify right now.' : view === 'Completed reflections' ? 'Completed reflections will appear here.' : 'Make room for your next connection.'}</h3><p>Create a conversation with a name. Fill in the rest as you learn.</p></div>}
      <div className="plc-start"><p>Start with a person, never a script.</p><div>{conversationKinds.map(k => <button key={k} onClick={() => create(k)}><Plus size={15}/>{k}</button>)}</div></div>
    </>}
  </section>;
}
