import type { AudioConfig } from "./audio-config";

export interface PlannedAudioAsset {
  itemId: string;
  hash: string;
  config: AudioConfig;
}

export interface AudioManifest {
  schemaVersion: 1;
  assets: Record<string, string>;
}

export interface AudioAssetStore {
  exists: (hash: string) => Promise<boolean>;
  write: (hash: string, bytes: Uint8Array) => Promise<void>;
}

export interface AudioGenerationOptions {
  plan: PlannedAudioAsset[];
  manifest: AudioManifest;
  store: AudioAssetStore;
  synthesize: (config: AudioConfig) => Promise<Uint8Array>;
  saveManifest: (manifest: AudioManifest) => Promise<void>;
  syncMetadata?: (asset: PlannedAudioAsset) => Promise<void>;
  onAsset?: (asset: PlannedAudioAsset, existed: boolean) => void;
}

export async function generateAudioAssets(options: AudioGenerationOptions) {
  let manifest: AudioManifest = { schemaVersion: 1, assets: { ...options.manifest.assets } };
  let createdCount = 0;

  for (const asset of options.plan) {
    const existed = await options.store.exists(asset.hash);

    if (!existed) {
      const bytes = await options.synthesize(asset.config);
      await options.store.write(asset.hash, bytes);
      createdCount++;
    }

    await options.syncMetadata?.(asset);

    const nextManifest: AudioManifest = {
      schemaVersion: 1,
      assets: { ...manifest.assets, [asset.itemId]: asset.hash },
    };

    await options.saveManifest(nextManifest);
    manifest = nextManifest;
    options.onAsset?.(asset, existed);
  }

  return { manifest, createdCount };
}
