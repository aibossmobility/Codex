import type albumLyrics from "./music-room-lyrics.json";

const tracks: ReadonlyArray<readonly [string, keyof typeof albumLyrics, string]> = [
  ["Believe, Encourage, and Live", "believe-encourage-live.m4a", "Lyrics: Brian Hill · Music / arrangement: Brian Hill & Suno AI"],
  ["Black Men Speak", "black-men-speak.mp3", "Lyrics: Brian Hill · Music / arrangement: William Whitley"],
  ["Dad’s Love (Slow Ballad)", "dads-love.m4a", "Lyrics: Brian Hill · Music / arrangement: Brian Hill & Suno AI"],
  ["Do You Want to Find Your GPS? 1", "find-your-gps.m4a", "Lyrics: Brian Hill · Music / arrangement: Brian Hill & Suno AI"],
  ["Do You Want to Find Your GPS? 2", "gps-suno.mp3", "Lyrics: Brian Hill · Music / arrangement: Brian Hill & Suno AI"],
  ["Dream and Pray 1", "dream-first-suno.mp3", "Lyrics: Brian Hill · Music / arrangement: William Whitley"],
  ["Dream and Pray 2", "dream-and-pray.m4a", "Lyrics: Brian Hill · Music / arrangement: William Whitley"],
  ["Fathers of Adult Children 1", "foadc-ballad.m4a", "Lyrics: Brian Hill · Music / arrangement: Brian Hill & Suno AI"],
  ["Fathers of Adult Children 2", "foadc-da7743c6.m4a", "Lyrics: Brian Hill · Music / arrangement: William Whitley"],
  ["God Above 1", "god-above-60e62206.m4a", "Lyrics: Brian Hill · Music / arrangement: Brian Hill & Suno AI"],
  ["God Above 2", "god-above-f75554a5.m4a", "Lyrics: Brian Hill · Music / arrangement: Brian Hill & Suno AI"],
  ["More Than You Know", "more-than-you-know-20fac5a1.m4a", "Lyrics: Brian Hill · Music / arrangement: William Whitley"],
  ["You Are God Above 3", "you-are-god-above-b370237f.mp3", "Lyrics: Brian Hill · Music / arrangement: Brian Hill & Suno AI"],
  ["Your Purpose Lives On 1", "your-purpose.m4a", "Lyrics: Brian Hill · Music / arrangement: Brian Hill & Suno AI"],
  ["Your Purpose Lives On 2", "purpose-suno.mp3", "Lyrics: Brian Hill · Music / arrangement: Brian Hill & Suno AI"],
  ["Your Purpose Lives On 3", "purpose-e27fed7f.mp3", "Lyrics: Brian Hill · Music / arrangement: Brian Hill & Suno AI"],
];

export const tracksByTitle = [...tracks].sort(([first], [second]) => first.localeCompare(second, "en", { numeric: true, sensitivity: "base" }));
