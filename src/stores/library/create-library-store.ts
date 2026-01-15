import { createStore } from 'solid-js/store'
import {
  Track,
  Album,
  Artist,
  Playlist,
  MusicItemType,
  MusicItemKey,
} from '../../types/types'

interface LibraryItemSortState {
  [MusicItemType.ALBUM]: keyof Album
  [MusicItemType.ARTIST]: keyof Artist
  [MusicItemType.PLAYLIST]: keyof Playlist
  [MusicItemType.HISTORY]: keyof Track
}

type LibraryItemTypes = keyof LibraryItemSortState

interface State {
  sortKeys: LibraryItemSortState
}

interface SortOptions<T extends LibraryItemTypes> {
  type: T
  key: LibraryItemSortState[T]
}

export const createLibraryStore = () => {
  const [state, setState] = createStore<State>({
    sortKeys: {
      [MusicItemType.ALBUM]: MusicItemKey.NAME,
      [MusicItemType.ARTIST]: MusicItemKey.NAME,
      [MusicItemType.PLAYLIST]: MusicItemKey.NAME,
      [MusicItemType.HISTORY]: MusicItemKey.NAME,
    },
  })

  const sort = <T extends LibraryItemTypes>(opts: SortOptions<T>) => {
    setState({
      sortKeys: {
        ...state.sortKeys,
        [opts.type]: opts.key,
      },
    })
  }

  const actions = {
    sort,
  }

  const persistedItems = [
    {
      key: 'library-sort',
      selector: () => state.sortKeys,
      load: (sortKeys: LibraryItemSortState) => setState({ sortKeys }),
    },
  ]

  return [state, actions, persistedItems] as const
}
