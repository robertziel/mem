export const openDatabaseSync = () => ({
  execSync: () => {},
  runSync: () => {},
  getAllSync: () => [],
  getFirstSync: () => undefined,
  withTransactionSync: (cb: () => void) => cb(),
});
