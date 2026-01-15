import { JSX } from 'solid-js'
import { MusicItemKey } from '~/types/types'
import { IconType } from '~/components/icon/icon'
import * as configs from '~/base-page-configs'

interface SortItem {
  name: string
  key: MusicItemKey
}

export interface LibraryPageConfig extends configs.BaseConfig {
  icon: IconType
  iconSelected: IconType
  sortOptions: readonly SortItem[]
  actions?: JSX.Element
}

const SORT_NAME = { name: 'A to Z', key: MusicItemKey.NAME } as const
const SORT_YEAR = { name: 'Year', key: MusicItemKey.YEAR } as const

export const CONFIG: readonly LibraryPageConfig[] = [
  {
    ...configs.BASE_ALBUMS_CONFIG,
    icon: 'albumOutline',
    iconSelected: 'album',
    sortOptions: [
      SORT_NAME,
      { name: 'Artists', key: MusicItemKey.ARTISTS },
      SORT_YEAR,
    ],
  },
  {
    ...configs.BASE_HISTORY_CONFIG,
    icon: 'playlistPlay',
    iconSelected: 'playlistPlay',
    sortOptions: [
      { name: 'Most recent', key: MusicItemKey.NAME },
    ],
  },
] as const

export const LIBRARY_PATH = '/library'
export const DEFAULT_LIBRARY_PATH = `${LIBRARY_PATH}/${CONFIG[0].path}`
