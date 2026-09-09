export const TUESDAY_LIVE_SESSION = {
  topic: "When Silence Feels Personal",
  liveHostUrl: "https://meetn.com/briankeithhill",
  youtubeStudioUrl: "https://studio.youtube.com/",
  cue: [
    "0–5: Welcome and prayer",
    "5–15: Why silence can feel personal",
    "15–30: Coaching and reflection",
    "30–40: Questions and one pressure-free action",
    "40–45: Commitment and closing prayer",
  ],
} as const;

export const TUESDAY_LIVE_SLIDES = [
  { label: "WELCOME", tone: "yellow", heading: TUESDAY_LIVE_SESSION.topic, body: "Welcome, fathers. Today is a place for honest reflection, practical next steps, and hope. You are not here to defend yourself. You are here to become the father your adult child can experience as safe, steady, and present." },
  { label: "THE PROBLEM", tone: "red", heading: "Silence can feel personal.", body: "When an adult child is quiet, a father can feel rejected, forgotten, or pushed aside. That hurt can lead us to demand an answer, explain ourselves, or press for a conversation before trust has room to breathe." },
  { label: "PRESENCE", tone: "green", heading: "Be steady before you speak.", body: "Presence means staying emotionally available without chasing, controlling, or making every contact carry the weight of the whole relationship. A calm father creates more room for an honest conversation." },
  { label: "PURPOSE", tone: "yellow", heading: "Choose faithfulness over panic.", body: "Your purpose is not to force a response today. Your purpose is to practice faithful love, humility, and patience. You can keep growing even while the relationship is quiet." },
  { label: "AUTHORITY", tone: "red", heading: "Trustworthiness is real authority.", body: "Authority is not control. It is the character people can rely on. Keep small promises. Respect boundaries. Apologize without turning your impact into an argument." },
  { label: "ALIGNMENT", tone: "green", heading: "Let your actions match your hope.", body: "Ask yourself: What is one way I have made their silence about me? Then choose one small action that makes your love easier to believe." },
  { label: "THIS WEEK", tone: "yellow", heading: "One pressure-free action", body: "Send one simple message: I am thinking of you. No need to respond. I love you, and I am working on being a better listener. Do not ask for praise, proof, or an immediate answer." },
  { label: "CLOSING PRAYER", tone: "green", heading: "A father can become safe again.", body: "Father, help us not to let silence make us fearful or controlling. Teach us to be humble, patient, and trustworthy in small things. As long as we are both alive, it is never too late. Amen." },
] as const;
