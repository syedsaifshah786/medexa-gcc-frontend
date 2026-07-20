const arabicDiacriticsPattern = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/u;
const punctuationPattern = /[^\p{L}\p{N}]/u;

function normalizeCharacter(character: string) {
  if (character === "ـ" || arabicDiacriticsPattern.test(character)) return "";
  const decomposed = character.normalize("NFKD");
  let output = "";
  for (const value of decomposed) {
    if (/\p{M}/u.test(value)) continue;
    if (punctuationPattern.test(value)) {
      output += " ";
      continue;
    }
    output += value
      .toLocaleLowerCase("und")
      .replace(/[إأآٱ]/g, "ا")
      .replace(/ى/g, "ي");
  }
  return output;
}

export type SBSNormalizedText = {
  value: string;
  sourceIndexes: number[];
};

export function normalizeSBSTextWithMap(input: string): SBSNormalizedText {
  let value = "";
  const sourceIndexes: number[] = [];
  let previousWasSpace = true;

  for (let sourceIndex = 0; sourceIndex < input.length; sourceIndex += 1) {
    const normalized = normalizeCharacter(input[sourceIndex]);
    for (const character of normalized) {
      const isSpace = character === " ";
      if (isSpace && previousWasSpace) continue;
      value += character;
      sourceIndexes.push(sourceIndex);
      previousWasSpace = isSpace;
    }
  }

  if (value.endsWith(" ")) {
    value = value.slice(0, -1);
    sourceIndexes.pop();
  }

  return { value, sourceIndexes };
}

export function normalizeSBSText(input: string) {
  return normalizeSBSTextWithMap(input).value;
}
