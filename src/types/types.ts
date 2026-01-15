interface FileLegacy {
  type: 'file'
  file: File
}

interface FileHandle {
  type: 'fileRef'
  file: FileSystemFileHandle
}

/**
 * FileRemote represents a remote audio source that must be downloaded before playback.
 * The URL is a DOWNLOAD SOURCE, not a direct playback source.
 * Audio is NEVER streamed directly - it is always downloaded to IndexedDB first,
 * then played from a blob URL.
 */
interface FileRemote {
  type: 'remote'
  url: string
}

export type FileWrapper = FileLegacy | FileHandle | FileRemote

// ImageType can be a Blob (local) or string URL (remote)
export type ImageType = Blob | string | undefined

export const MusicItemType = {
  TRACK: 0,
  ALBUM: 1,
  ARTIST: 2,
  PLAYLIST: 3,
} as const

export type MusicItemType = typeof MusicItemType[keyof typeof MusicItemType]

export const MusicItemKey = {
  NAME: 'name',
  ARTISTS: 'artists',
  ALBUM: 'album',
  YEAR: 'year',
  DURATION: 'duration',
  DATE_CREATED: 'dateCreated',
} as const

export type MusicItemKey = typeof MusicItemKey[keyof typeof MusicItemKey]

export interface BaseMusicItem {
  id: string
  type: MusicItemType
  name: string
}

export interface UnknownTrack {
  name: string
  album?: string
  artists: string[]
  year?: string
  duration: number
  genre: string[]
  trackNo?: number
  trackOf?: number
  image?: ImageType
  fileWrapper: FileWrapper
  primaryColor?: number
}

export interface Track extends BaseMusicItem, UnknownTrack {
  type: typeof MusicItemType.TRACK
}

export interface BaseMusicItemWithTrackIds extends BaseMusicItem {
  trackIds: string[]
}

// For Album and Artists id and name are the same thing,
// but for consistency still include both.
export interface Album extends BaseMusicItemWithTrackIds {
  type: typeof MusicItemType.ALBUM
  artists: string[]
  year?: string
  image?: ImageType
}

export interface Artist extends BaseMusicItemWithTrackIds {
  type: typeof MusicItemType.ARTIST
}

export interface Playlist extends BaseMusicItemWithTrackIds {
  type: typeof MusicItemType.PLAYLIST
  dateCreated: number
}
