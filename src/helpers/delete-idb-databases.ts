export const deleteIDBDatabases = async (
  baseName: string,
  latestVersion: number,
): Promise<void> => {
  const idb = window.indexedDB
  if ('databases' in idb) {
    const fullName = `${baseName}-${latestVersion}`

    const dbs = await idb.databases()
    dbs.forEach((db) => {
      // Only delete databases that start with the baseName but aren't the current version
      if (db.name && db.name.startsWith(baseName) && db.name !== fullName) {
        window.indexedDB.deleteDatabase(db.name)
      }
    })
  } else {
    // Firefox doesn't support idb.databases() yet.
    for (let i = 0; i < latestVersion; i += 1) {
      idb.deleteDatabase(`${baseName}-${i}`)
    }
  }
}
