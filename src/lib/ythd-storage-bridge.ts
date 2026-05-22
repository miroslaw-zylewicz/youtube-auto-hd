import type { EnhancedBitratePreferences, QualityFpsPreferences, VideoFPS } from "./ythd-types";
import { getStorage } from "./ythd-utils";
import { storage } from "#imports";

const KEY_EBR_REJECTED = "local:isEnhancedBitrateRejected";

export async function initializeEnhancedBitrateRejections() {
  const rejectedFpsSteps = await getStorage<VideoFPS[]>({
    area: "local",
    key: "isEnhancedBitrateRejected",
    fallback: []
  });
  window.ythdLastEnhancedBitrateClicked ??= {};
  for (const fpsStep of rejectedFpsSteps) {
    window.ythdLastEnhancedBitrateClicked[fpsStep] = false;
  }
}

export async function saveEnhancedBitrateRejection(fpsStep: VideoFPS) {
  const existing = await getStorage<VideoFPS[]>({
    area: "local",
    key: "isEnhancedBitrateRejected",
    fallback: []
  });
  if (existing.includes(fpsStep)) {
    return;
  }

  await storage.setItem(KEY_EBR_REJECTED, [...existing, fpsStep]);
}

export async function loadStorageValues() {
  window.ythdLastUserQualities = await getStorage({
    area: "local",
    key: "qualities",
    fallback: window.ythdLastUserQualities
  });
  window.ythdLastUserEnhancedBitrates = await getStorage({
    area: "local",
    key: "isEnhancedBitrates",
    fallback: window.ythdLastUserEnhancedBitrates
  });
  window.ythdIsUseSuperResolution = await getStorage({
    area: "local",
    key: "isUseSuperResolution",
    fallback: window.ythdIsUseSuperResolution
  });
}

export function addStorageListeners(onApply: () => void) {
  storage.watch<boolean>("local:isExtensionEnabled", isExtEnabled => {
    window.ythdExtEnabled = isExtEnabled ?? false;

    if (!isExtEnabled) {
      return;
    }

    onApply();
  });

  storage.watch<QualityFpsPreferences>("local:qualities", qualityPreferences => {
    window.ythdLastUserQualities = qualityPreferences;
    window.ythdLastQualityClicked = undefined;
    window.ythdLastEnhancedBitrateClicked = {};

    if (!window.ythdExtEnabled) {
      return;
    }

    onApply();
  });

  storage.watch<EnhancedBitratePreferences>("local:isEnhancedBitrates", isEnhancedBitrates => {
    window.ythdLastEnhancedBitrateClicked = isEnhancedBitrates ?? undefined;
    void storage.setItem(KEY_EBR_REJECTED, []);

    if (!window.ythdExtEnabled) {
      return;
    }

    onApply();
  });

  storage.watch<boolean>("local:isUseSuperResolution", isUseSuperResolution => {
    window.ythdIsUseSuperResolution = isUseSuperResolution ?? undefined;

    if (!window.ythdExtEnabled) {
      return;
    }

    onApply();
  });
}
