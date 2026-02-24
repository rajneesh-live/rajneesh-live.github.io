/**
 * Best-effort Roman (Latin) to Devanagari transliteration for casual Indian user input.
 * Handles common patterns like "laxmi", "lakshmi", "vivekanand" without diacritics.
 */

import Sanscript from '@indic-transliteration/sanscript'

const DEVANAGARI_RANGE = /[\u0900-\u097F]/

/** True if the string appears to be Roman/Latin script (no Devanagari). */
export function isRomanInput(s: string): boolean {
	return !DEVANAGARI_RANGE.test(s.trim())
}

/**
 * Normalizes casual Roman input to be closer to ITRANS, which Sanscript understands.
 * Best-effort heuristics for common Indian typing patterns.
 */
function normalizeForItrans(s: string): string {
	let t = s.trim()
	if (!t) return t

	// "x" is often used for क्ष (ksh) in casual typing - ITRANS supports "x" for क्ष
	// "ksh" -> "kSh" for क्ष (e.g. "lakshmi" -> "lakShmi")
	t = t.replace(/ksh/gi, 'kSh')

	// "gy" -> "j~n" for ज्ञ (e.g. "gyan" -> "j~nan")
	t = t.replace(/gy/gi, 'j~n')

	// "as" at end -> "Asa" for long ā (e.g. "sanyas" -> "sanyAsa" = सन्यास)
	if (/as$/i.test(t) && t.length > 2) {
		t = t.slice(0, -2) + 'Asa'
	}

	return t
}

/**
 * Transliterates Roman input to Devanagari using ITRANS with Hindi-style syncope.
 * Returns the Devanagari string, or the original if transliteration fails.
 */
function transliterateToDevanagari(roman: string): string {
	try {
		const normalized = normalizeForItrans(roman)
		const result = Sanscript.t(normalized, 'itrans', 'devanagari', { syncope: true })
		return result || roman
	} catch {
		return roman
	}
}

/**
 * Returns the best search term(s) for Pagefind: if input is Roman, transliterate to Devanagari.
 * Includes variants for common spelling differences (long vowels, anusvara, etc.).
 */
export function romanToDevanagariForSearch(roman: string): string[] {
	const trimmed = roman.trim()
	if (!trimmed) return []

	if (!isRomanInput(trimmed)) {
		return [trimmed]
	}

	const terms: string[] = []

	// For "sanyas"-like words: try संन्यास (with anusvara) first - common in transcripts
	if (/^sanny?as$/i.test(trimmed)) {
		terms.push(transliterateToDevanagari('saMnyAsa'))
	}

	// For names ending in "anand/ananda": try आनंद variant (with anusvara) - common in transcripts
	if (/anand(a)?$/i.test(trimmed)) {
		const base = trimmed.replace(/anand(a)?$/i, '')
		if (base) {
			terms.push(transliterateToDevanagari(base + 'AnaMda'))
		}
	}

	const primary = transliterateToDevanagari(trimmed)
	terms.push(primary)

	// Try variant with final "i" -> "I" (long ī) for names - e.g. "laxmi" -> "laxmI" -> लक्ष्मी
	if (/i$/i.test(trimmed) && trimmed.length > 1) {
		const withLongI = transliterateToDevanagari(trimmed.slice(0, -1) + 'I')
		if (withLongI !== primary) {
			terms.push(withLongI)
		}
	}

	return [...new Set(terms)]
}
