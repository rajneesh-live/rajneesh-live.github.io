import ConfirmRemoveLibraryItem from './ConfirmRemoveLibraryItem.svelte'
// biome-ignore lint/correctness/noPrivateImports: false positive
import BookmarkDialog from './bookmarks/BookmarkDialog.svelte'

export const APP_DIALOGS_COMPONENTS = [
	ConfirmRemoveLibraryItem,
	BookmarkDialog,
] as const
