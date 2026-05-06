import { normalizeSearch } from "@/lib/search";
import type { Track } from "@/types/models";

export type MusicCategory = "hindi" | "english" | "south" | "punjabi" | "devotional" | "other";

const devotionalKeywords = [
  "hanuman chalisa",
  "shree hanuman",
  "bhajan",
  "aarti",
  "devotional",
  "jai hanuman",
];

const englishKeywords = [
  "night changes",
  "love me like you do",
  "snap",
  "one direction",
  "rosa linn",
  "7 rings",
  "ariana grande",
  "attention",
  "charlie puth",
  "blinding lights",
  "the weeknd",
  "closer",
  "the chainsmokers",
  "halsey",
  "dance monkey",
  "tones and i",
  "let me love you",
  "dj snake",
  "justin bieber",
  "me, myself & i",
  "g-eazy",
  "bebe rexha",
  "one dance",
  "drake",
  "rockstar",
  "post malone",
  "21 savage",
  "shape of you",
  "ed sheeran",
  "starboy",
  "daft punk",
  "stay",
  "the kid laroi",
  "sucker",
  "jonas brothers",
  "the real slim shady",
  "eminem",
  "we don't talk anymore",
  "selena gomez",
];

const southKeywords = [
  "pavazha",
  "malli",
  "kalakki",
  "anirudh",
  "ravichander",
  "shruti haasan",
  "sai abhyankkar",
  "youth",
  "the paradise",
  "arjun chandy",
  "g. v. prakash",
];

const punjabiKeywords = [
  "naal",
  "aujla",
  "sandlas",
  "afsana",
  "dhurandhar",
  "mitta ror",
  "khan saab",
  "ap dhillon",
  "bairan",
  "bairi",
  "jass manak",
  "satinder sartaaj",
  "sidhu moose wala",
  "high on you",
  "for a reason",
  "eyes on me",
  "boyfriend",
  "jind universe",
  "ikky",
];

const hindiKeywords = [
  "arijit",
  "pritam",
  "vishal mishra",
  "atif",
  "shreya",
  "jubin",
  "sachet",
  "parampara",
  "amitabh bhattacharya",
  "alka yagnik",
  "sunidhi",
  "palak muchhal",
  "amit trivedi",
  "sachin-jigar",
  "sachin jigar",
  "a.r. rahman",
  "tanishk bagchi",
  "kailash kher",
  "anuv jain",
  "gajendra verma",
  "aditya rikhari",
  "ash king",
  "aastha gill",
  "divya kumar",
  "faheem abdullah",
  "rauhan malik",
  "paresh pahuja",
  "irshad kamil",
  "rahat fateh ali khan",
  "jawad ahmad",
  "mithoon",
  "mohit chauhan",
  "kk",
  "finding her",
  "kushagra",
  "bharath",
  "saaheal",
];

function hasKeyword(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

export function resolveTrackCategory(track: Track): MusicCategory {
  const haystack = normalizeSearch(`${track.title} ${track.artist_display}`);

  if (hasKeyword(haystack, devotionalKeywords)) {
    return "devotional";
  }

  if (hasKeyword(haystack, englishKeywords)) {
    return "english";
  }

  if (hasKeyword(haystack, southKeywords)) {
    return "south";
  }

  if (hasKeyword(haystack, punjabiKeywords)) {
    return "punjabi";
  }

  if (hasKeyword(haystack, hindiKeywords)) {
    return "hindi";
  }

  return "other";
}
