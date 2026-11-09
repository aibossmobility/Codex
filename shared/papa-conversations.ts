import { z } from 'zod';
export const conversationKinds = ['Father', 'Pastor', 'Partner', 'Explorer'] as const;
export const papaStages = ['Presence', 'Authority', 'Purpose', 'Alignment'] as const;
export const papaPrompts: Record<string, string> = {
  Presence: 'What would it look like to listen fully and be present in this relationship?',
  Authority: 'How can you lead with care while respecting the other person’s choices?',
  Purpose: 'What matters most to you in this relationship or work right now?',
  Alignment: 'What small action would bring your intentions and daily life closer together?',
};
export const conversationQuestions: Record<string, string[]> = {
  Father: ['What has been on your heart about your relationship with your adult child?', 'What feels useful to explore together today?', 'What is one small thing you would like to try?'],
  Pastor: ['What are you noticing among the fathers you serve?', 'Where could a short Papa Life conversation be useful?', 'What would make this practical for your community?'],
  Partner: ['What drew your interest to Papa Life?', 'Where do our work and the people we serve connect?', 'What small possibility would be useful to explore?'],
  Explorer: ['What brought you to Papa Life?', 'What would make this conversation useful for you?', 'Is there one topic you would like to click into together?'],
};
const date = z.string().refine(s => s === '' || /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s, 'Enter a valid date.');
export const papaConversationSchema = z.object({
  id: z.string().uuid(), person: z.string().trim().min(1).max(200), date,
  kind: z.enum(conversationKinds), purpose: z.string().max(5000),
  certainty: z.enum(['Unknown', 'Stated interest', 'Confirmed purpose']),
  questions: z.array(z.string().max(2000)).min(2).max(3),
  stage: z.enum(papaStages), prompt: z.string().max(3000),
  useful: z.string().max(10000), takeaways: z.array(z.string().max(3000)).length(2),
  steps: z.string().max(10000), missing: z.string().max(3000),
  topic: z.string().max(120), completed: z.boolean(),
}).strict().refine(c => !c.completed || Boolean(c.useful.trim() || c.takeaways.some(t => t.trim())), 'Add what was useful or one takeaway before completing.');
export type PapaConversation = z.infer<typeof papaConversationSchema>;
export function conversationMissing(c: PapaConversation) {
  return [...(!c.date ? ['Date'] : []), ...(!c.purpose.trim() || c.certainty === 'Unknown' ? ['Purpose or interest'] : []), ...(c.missing.trim() ? ['Details to clarify'] : [])];
}
export function pacificToday() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = (name: string) => parts.find(p => p.type === name)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
export function conversationInView(c: PapaConversation, view: string, today = pacificToday()) {
  if (view === 'Completed reflections') return c.completed;
  if (view === 'Missing information') return !c.completed && conversationMissing(c).length > 0;
  if (view === 'Upcoming') return !c.completed && (!c.date || c.date >= today);
  return true;
}
