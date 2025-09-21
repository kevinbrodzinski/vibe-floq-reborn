const store = new Map();
const AssetRegistry = {
  registerAsset(asset) {
    const id = asset?.name || String(store.size + 1);
    store.set(id, asset);
    return id;
  },
  getAssetByID(id) { return store.get(id) || null; },
  getAssetByIDForJS(id) { return store.get(id) || null; },
};
export default AssetRegistry;