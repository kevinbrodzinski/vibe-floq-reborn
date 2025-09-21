const store = new Map();

export function registerAsset(asset) {
  const id = asset?.name || String(store.size + 1);
  store.set(id, asset);
  return id;
}

export function getAssetByID(id) { 
  return store.get(id) || null; 
}

export function getAssetByIDForJS(id) { 
  return store.get(id) || null; 
}

const AssetRegistry = { registerAsset, getAssetByID, getAssetByIDForJS };
export default AssetRegistry;