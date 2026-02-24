/**
 * Extracts a contextual excerpt from transcript text around the first occurrence
 * of the search term: 2-3 words before + match + 2-3 lines after.
 */
export function extractExcerptAroundMatch(
	text: string,
	searchTerm: string,
	opts?: { wordsBefore?: number; linesAfter?: number },
): { excerpt: string; found: boolean } {
	const wordsBefore = opts?.wordsBefore ?? 3
	const linesAfter = opts?.linesAfter ?? 3

	const termLower = searchTerm.toLowerCase().trim()
	if (!termLower) return { excerpt: '', found: false }

	const textLower = text.toLowerCase()
	const matchIndex = textLower.indexOf(termLower)
	if (matchIndex === -1) return { excerpt: '', found: false }

	const lines = text.split('\n')
	let charOffset = 0
	let matchLineIndex = -1
	let matchStartInLine = -1

	for (let i = 0; i < lines.length; i++) {
		const lineEnd = charOffset + lines[i].length
		if (matchIndex >= charOffset && matchIndex < lineEnd) {
			matchLineIndex = i
			matchStartInLine = matchIndex - charOffset
			break
		}
		charOffset = lineEnd + 1
	}

	if (matchLineIndex === -1) return { excerpt: '', found: false }

	const matchLine = lines[matchLineIndex]
	const matchEndInLine = matchStartInLine + searchTerm.length

	// Words before: substring before match, split by whitespace, take last N words
	const beforeMatch = matchLine.slice(0, matchStartInLine)
	const words = beforeMatch.split(/\s+/).filter(Boolean)
	const beforeWords = words.slice(-wordsBefore).join(' ')
	const prefix = beforeWords ? `...${beforeWords} ` : ''

	// Match + rest of line
	const match = matchLine.slice(matchStartInLine, matchEndInLine)
	const restOfLine = matchLine.slice(matchEndInLine)

	// Lines after
	const afterLines = lines.slice(matchLineIndex + 1, matchLineIndex + 1 + linesAfter)
	const afterText = afterLines.length > 0 ? '\n' + afterLines.join('\n') : ''

	const excerpt = prefix + match + restOfLine + afterText
	return { excerpt: excerpt.trim(), found: true }
}

/**
 * Wraps the search term in the excerpt with <mark> for highlighting.
 * Includes trailing combining marks (e.g. Devanagari ों) so grapheme clusters
 * stay together and words don't break visually.
 */
export function highlightExcerpt(excerpt: string, searchTerm: string): string {
	if (!searchTerm.trim()) return escapeHtml(excerpt)
	const term = searchTerm.trim()
	// Match term + any trailing combining marks (\p{M}) so "समृद्ध" in "समृद्धों" highlights the whole word
	const regex = new RegExp(`(${escapeRegex(term)}\\p{M}*)`, 'giu')
	return escapeHtml(excerpt).replace(regex, (m) => `<mark>${m}</mark>`)
}

function escapeHtml(s: string): string {
	const div = { textContent: s } as { textContent: string }
	// Use a simple HTML entity escape
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
