// Databases that should never be deleted by cleanup
const PROTECTED_DATABASES = ['RajneeshAudioCache']

export const deleteIDBDatabases = async (
  baseName: string,
  latestVersion: number,
): Promise<void> => {
  const idb = window.indexedDB
  if ('databases' in idb) {
    const fullName = `${baseName}-${latestVersion}`

    const dbs = await idb.databases()
    dbs.forEach((db) => {
      // Skip protected databases and the current version
      if (db.name && !PROTECTED_DATABASES.includes(db.name) && db.name !== fullName) {
        idb.deleteDatabase(db.name)
      }
    })
  } else {
    // Firefox doesn't support idb.databases() yet.
    for (let i = 0; i < latestVersion; i += 1) {
      idb.deleteDatabase(`${baseName}-${i}`)
    }
  }
}
