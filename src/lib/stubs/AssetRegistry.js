// Minimal web-safe AssetRegistry stub.
// Satisfies libraries that call register/get without RN's packager.

const store = new Map();

const AssetRegistry = {
  registerAsset(asset) {
    const id = asset?.name || String(store.size + 1);
    store.set(id, asset);
    return id;
  },
  getAssetByID(id) {
    return store.get(id) || null;
  },
  // React Native sometimes calls this variant in web transforms
  getAssetByIDForJS(id) {
    return store.get(id) || null;
  },
};

// Named exports for compatibility with different import patterns
export const { registerAsset, getAssetByID, getAssetByIDForJS } = AssetRegistry;

export default AssetRegistry;