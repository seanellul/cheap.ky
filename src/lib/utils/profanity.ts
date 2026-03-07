import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

/** Returns true if the text contains profanity */
export function isProfane(text: string): boolean {
  return matcher.hasMatch(text);
}

/** Censors profane words with asterisks */
export function censor(text: string): string {
  const matches = matcher.getAllMatches(text, true);
  if (matches.length === 0) return text;

  const chars = [...text];
  for (const match of matches) {
    for (let i = match.startIndex; i <= match.endIndex; i++) {
      if (chars[i] && chars[i] !== " ") chars[i] = "*";
    }
  }
  return chars.join("");
}
