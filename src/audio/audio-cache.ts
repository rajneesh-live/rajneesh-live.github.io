// IndexedDB-based audio cache for persistent storage
const DB_NAME = 'AudioCache'
const DB_VERSION = 1
const STORE_NAME = 'audio'

interface AudioCacheEntry {
  url: string
  blob: Blob
  timestamp: number
  contentType: string
}

// No longer using in-memory cache for blob URLs to avoid revoked URL issues

let dbPromise: Promise<IDBDatabase> | null = null

const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    console.log(`[AudioCache] Opening IndexedDB: ${DB_NAME}`)
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => {
      console.error(`[AudioCache] ✗ Failed to open IndexedDB:`, request.error)
      reject(request.error)
    }
    
    request.onsuccess = () => {
      console.log(`[AudioCache] ✓ IndexedDB opened successfully`)
      resolve(request.result)
    }
    
    request.onupgradeneeded = (event) => {
      console.log(`[AudioCache] Creating IndexedDB schema`)
      const db = (event.target as IDBOpenDBRequest).result
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' })
      console.log(`[AudioCache] ✓ Created object store: ${STORE_NAME}`)
    }
  })

  return dbPromise
}

const getCachedBlob = async (url: string): Promise<Blob | null> => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    
    return new Promise((resolve, reject) => {
      const request = store.get(url)
      
      request.onsuccess = () => {
        const result = request.result as AudioCacheEntry | undefined
        if (result) {
          console.log(`[AudioCache] ✓ Found cached blob for: ${url}, size: ${result.blob.size} bytes`)
          resolve(result.blob)
        } else {
          console.log(`[AudioCache] Cache miss for: ${url}`)
          resolve(null)
        }
      }
      
      request.onerror = () => {
        console.error(`[AudioCache] ✗ Error reading from cache:`, request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error(`[AudioCache] ✗ Error accessing IndexedDB:`, error)
    return null
  }
}

const storeCachedBlob = async (url: string, blob: Blob, contentType: string): Promise<void> => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    const entry: AudioCacheEntry = {
      url,
      blob,
      timestamp: Date.now(),
      contentType
    }
    
    return new Promise((resolve, reject) => {
      const request = store.put(entry)
      
      request.onsuccess = () => {
        console.log(`[AudioCache] ✓ Stored blob in IndexedDB: ${url}, size: ${blob.size} bytes`)
        resolve()
      }
      
      request.onerror = () => {
        console.error(`[AudioCache] ✗ Error storing in cache:`, request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error(`[AudioCache] ✗ Error storing in IndexedDB:`, error)
    throw error
  }
}

export const getCachedAudio = async (url: string): Promise<string> => {
  console.log(`[AudioCache] Requesting audio: ${url}`)
  
  try {
    // Always try to get from IndexedDB first (don't reuse blob URLs)
    let blob = await getCachedBlob(url)
    
    if (!blob) {
      console.log(`[AudioCache] Cache miss, fetching: ${url}`)
      
      // Fetch the audio file
      const fetchStart = performance.now()
      const response = await fetch(url)
      const fetchTime = performance.now() - fetchStart
      
      console.log(`[AudioCache] Fetch completed in ${fetchTime.toFixed(2)}ms, status: ${response.status}`)
      console.log(`[AudioCache] Response content-type:`, response.headers.get('content-type'))
      console.log(`[AudioCache] Response content-length:`, response.headers.get('content-length'))
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      blob = await response.blob()
      console.log(`[AudioCache] Blob created, size: ${blob.size} bytes, type: ${blob.type}`)
      
      // Check if blob is empty
      if (blob.size === 0) {
        throw new Error('Received empty blob')
      }
      
      // If no content type, try to preserve the original response content type
      const contentType = response.headers.get('content-type') || 'application/octet-stream'
      
      if (!blob.type && contentType) {
        console.log(`[AudioCache] Blob has no type, creating new blob with content-type: ${contentType}`)
        blob = new Blob([blob], { type: contentType })
      }
      
      console.log(`[AudioCache] Final blob, size: ${blob.size} bytes, type: ${blob.type}`)
      
      // Store in IndexedDB
      try {
        await storeCachedBlob(url, blob, contentType)
      } catch (storeError) {
        console.warn(`[AudioCache] Failed to store in IndexedDB, continuing anyway:`, storeError)
      }
    } else {
      console.log(`[AudioCache] ✓ Found cached blob for: ${url}, size: ${blob.size} bytes`)
    }
    
    // Always create fresh blob URL to avoid revoked URL issues
    const blobUrl = URL.createObjectURL(blob)
    console.log(`[AudioCache] ✓ Created fresh blob URL: ${url} -> ${blobUrl}`)
    
    // Test the blob URL by creating a temporary audio element
    const testAudio = new Audio()
    testAudio.src = blobUrl
    testAudio.addEventListener('canplaythrough', () => {
      console.log(`[AudioCache] ✓ Blob URL verified working: ${blobUrl}`)
    })
    testAudio.addEventListener('error', (e) => {
      console.error(`[AudioCache] ✗ Blob URL verification failed: ${blobUrl}`, e)
    })
    
    return blobUrl
  } catch (error) {
    console.error(`[AudioCache] ✗ Failed to get cached audio: ${url}`, error)
    // Return original URL as fallback
    console.log(`[AudioCache] Fallback to original URL: ${url}`)
    return url
  }
}

export const clearAudioCache = async () => {
  console.log(`[AudioCache] Clearing IndexedDB cache`)
  
  // Clear IndexedDB
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    await new Promise<void>((resolve, reject) => {
      const request = store.clear()
      
      request.onsuccess = () => {
        console.log(`[AudioCache] ✓ IndexedDB cleared`)
        resolve()
      }
      
      request.onerror = () => {
        console.error(`[AudioCache] ✗ Error clearing IndexedDB:`, request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error(`[AudioCache] ✗ Error clearing IndexedDB:`, error)
  }
  
  console.log(`[AudioCache] Cache cleared`)
}

// Get cache statistics
export const getCacheStats = async () => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    
    const countRequest = store.count()
    const count = await new Promise<number>((resolve, reject) => {
      countRequest.onsuccess = () => resolve(countRequest.result)
      countRequest.onerror = () => reject(countRequest.error)
    })
    
    console.log(`[AudioCache] Cache stats: ${count} items in IndexedDB`)
    return {
      indexedDBCount: count
    }
  } catch (error) {
    console.error(`[AudioCache] Error getting cache stats:`, error)
    return {
      indexedDBCount: 0
    }
  }
}

// List all cached URLs (for debugging)
export const listCachedUrls = async () => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    
    const request = store.getAll()
    const entries = await new Promise<AudioCacheEntry[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    
    console.log(`[AudioCache] Cached URLs (${entries.length}):`)
    entries.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.url} (${entry.blob.size} bytes, ${entry.contentType})`)
    })
    
    return entries.map(entry => ({
      url: entry.url,
      size: entry.blob.size,
      contentType: entry.contentType,
      timestamp: entry.timestamp
    }))
  } catch (error) {
    console.error(`[AudioCache] Error listing cached URLs:`, error)
    return []
  }
}

export const isUrlCached = async (url: string): Promise<boolean> => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    
    return new Promise((resolve, reject) => {
      const request = store.count(url)
      
      request.onsuccess = () => {
        const isCached = request.result > 0
        resolve(isCached)
      }
      
      request.onerror = () => {
        console.error(`[AudioCache] Error checking cache for: ${url}`, request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error(`[AudioCache] Error accessing IndexedDB for cache check:`, error)
    return false
  }
}

export const downloadAudio = async (url: string): Promise<void> => {
  console.log(`[AudioDownload] Starting download: ${url}`)
  
  // Check if already cached
  const cachedBlob = await getCachedBlob(url)
  if (cachedBlob) {
    console.log(`[AudioDownload] Already cached: ${url}`)
    return
  }
  
  // Check for mobile device
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  console.log(`[AudioDownload] Mobile detection: ${isMobile}, User agent: ${navigator.userAgent}`)
  
  // Fetch the audio file
  const fetchStart = performance.now()
  const response = await fetch(url)
  const fetchTime = performance.now() - fetchStart
  
  console.log(`[AudioDownload] Fetch completed in ${fetchTime.toFixed(2)}ms, status: ${response.status}`)
  console.log(`[AudioDownload] Response content-type:`, response.headers.get('content-type'))
  console.log(`[AudioDownload] Response content-length:`, response.headers.get('content-length'))
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  const contentLength = response.headers.get('content-length')
  const fileSizeBytes = contentLength ? parseInt(contentLength) : 0
  const fileSizeMB = fileSizeBytes / (1024 * 1024)
  
  let blob: Blob
  
  // Use ArrayBuffer approach for mobile devices or large files (>5MB)
  console.log(`[AudioDownload] Decision: isMobile=${isMobile}, fileSizeBytes=${fileSizeBytes}, threshold=${5 * 1024 * 1024}`)
  const shouldUseArrayBuffer = isMobile || fileSizeBytes > 5 * 1024 * 1024
  console.log(`[AudioDownload] Will use ArrayBuffer: ${shouldUseArrayBuffer}`)
  
  if (shouldUseArrayBuffer) {
    console.log(`[AudioDownload] Using ArrayBuffer approach for ${isMobile ? 'mobile' : 'large file'} (${fileSizeMB.toFixed(1)}MB)`)
    try {
      const arrayBuffer = await response.arrayBuffer()
      console.log(`[AudioDownload] ArrayBuffer created, size: ${arrayBuffer.byteLength} bytes`)
      
      const contentType = response.headers.get('content-type') || 'application/octet-stream'
      blob = new Blob([arrayBuffer], { type: contentType })
      console.log(`[AudioDownload] Blob created from ArrayBuffer, size: ${blob.size} bytes`)
    } catch (error) {
      console.error(`[AudioDownload] ArrayBuffer approach failed:`, error)
      throw new Error(`ArrayBuffer conversion failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  } else {
    // Standard blob approach for desktop with smaller files
    try {
      console.log(`[AudioDownload] Converting response to blob...`)
      blob = await response.blob()
      console.log(`[AudioDownload] Blob created, size: ${blob.size} bytes, type: ${blob.type}`)
    } catch (error) {
      console.error(`[AudioDownload] Standard blob approach failed, trying ArrayBuffer fallback:`, error)
      
      // Fallback to ArrayBuffer if blob() fails
      try {
        console.log(`[AudioDownload] Trying ArrayBuffer fallback...`)
        const arrayBuffer = await response.arrayBuffer()
        console.log(`[AudioDownload] Fallback ArrayBuffer created, size: ${arrayBuffer.byteLength} bytes`)
        
        const contentType = response.headers.get('content-type') || 'application/octet-stream'
        blob = new Blob([arrayBuffer], { type: contentType })
        console.log(`[AudioDownload] Fallback blob created, size: ${blob.size} bytes`)
      } catch (fallbackError) {
        console.error(`[AudioDownload] Both blob() and ArrayBuffer fallback failed:`, fallbackError)
        throw new Error(`Failed to create blob: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }
  
  // Check if blob is empty
  if (blob.size === 0) {
    throw new Error('Received empty blob')
  }
  
  if (isMobile && fileSizeMB > 5) {
    console.warn(`[AudioDownload] Large file (${fileSizeMB.toFixed(1)}MB) on mobile device`)
  }
  
  const contentType = response.headers.get('content-type') || 'application/octet-stream'
  console.log(`[AudioDownload] Final blob, size: ${blob.size} bytes, type: ${blob.type}`)
  
  // Store in IndexedDB - this must succeed for download to be considered successful
  try {
    console.log(`[AudioDownload] Storing blob in IndexedDB...`)
    await storeCachedBlob(url, blob, contentType)
    console.log(`[AudioDownload] ✓ Successfully downloaded and cached: ${url}`)
  } catch (error) {
    console.error(`[AudioDownload] Failed to store in IndexedDB:`, error)
    throw new Error(`Failed to store in cache: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Make cache functions available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).audioCache = {
    stats: getCacheStats,
    list: listCachedUrls,
    clear: clearAudioCache
  }
  console.log(`[AudioCache] Debug functions available: window.audioCache.stats(), window.audioCache.list(), window.audioCache.clear()`)
} 