import { qualities } from "@/lib/ythd-defaults";
import { loadStorageValues, saveEnhancedBitrateRejection } from "@/lib/ythd-storage-bridge";
import { type EnhancedBitratePreferences, SUFFIX_EBR, SUFFIX_SUPER_RESOLUTION } from "@/lib/ythd-types";
import {
  extractFpsFromLabel,
  getFpsFromRange,
  getPlayerDiv,
  getVisibleElement,
  OBSERVER_OPTIONS,
  SELECTORS
} from "@/lib/ythd-utils";

const MIN_QUALITY_DIGITS_IN_LABEL = 3;

function getQualityNavigationItem(elPlayer: HTMLDivElement) {
  const elMenuItems = [...elPlayer.querySelectorAll<HTMLDivElement>(SELECTORS.menuOption)];
  return elMenuItems.find(item => {
    const content = item.querySelector<HTMLDivElement>(SELECTORS.menuOptionContent);
    return Boolean(content?.textContent?.match(new RegExp(`\\d{${MIN_QUALITY_DIGITS_IN_LABEL},}`)));
  }) ?? null;
}

function getIsLastOptionQuality(elVideo: HTMLVideoElement) {
  const elPlayer = getPlayerDiv(elVideo);
  if (!elPlayer) {
    return false;
  }

  if (getCurrentQualityElements(elVideo).length > 0) {
    return true;
  }

  if (getQualityNavigationItem(elPlayer)) {
    return true;
  }

  return Boolean(elPlayer.querySelector(SELECTORS.qualityDropDownTrigger));
}

function getIsQualityElement(element: Element) {
  return Boolean(element.textContent?.trim().match(new RegExp(`^\\d{${MIN_QUALITY_DIGITS_IN_LABEL},}`)));
}

function getCurrentQualityElements(elVideo: HTMLVideoElement) {
  const elPlayer = getPlayerDiv(elVideo);
  if (!elPlayer) {
    return [];
  }

  return elPlayer
    .querySelectorAll<HTMLDivElement>(SELECTORS.menuOption)
    .values()
    .filter(getIsQualityElement)
    .toArray();
}

function convertQualityToNumber(elQuality: Element) {
  const isRegularQuality = !elQuality.querySelector(SELECTORS.labelPremium);
  const qualityNumber = qualities.find(quality => quality === parseInt(elQuality.textContent ?? "", 10));
  const isPremiumQuality = !isRegularQuality && Boolean(elQuality.textContent?.match(/premium/i));

  let result: number | string | undefined;
  if (!qualityNumber) {
    result = undefined;
  } else if (isRegularQuality) {
    result = qualityNumber;
  } else if (isPremiumQuality) {
    result = `${qualityNumber}${SUFFIX_EBR}`;
  } else {
    result = `${qualityNumber}${SUFFIX_SUPER_RESOLUTION}`;
  }

  return result;
}

function getAvailableQualities(elVideo: HTMLVideoElement) {
  return getCurrentQualityElements(elVideo)
    .values()
    .map(convertQualityToNumber)
    .filter(quality => quality !== undefined)
    .toArray();
}

export function getVideoFPS(elVideo: HTMLVideoElement) {
  const elQualities = getCurrentQualityElements(elVideo);
  for (const elQuality of elQualities) {
    if (elQuality.textContent) {
      return extractFpsFromLabel(elQuality.textContent);
    }
  }
  return 30;
}

function openQualityMenu(elVideo: HTMLVideoElement) {
  if (getCurrentQualityElements(elVideo).length > 0) {
    return;
  }

  const elPlayer = getPlayerDiv(elVideo);
  if (!elPlayer) {
    return;
  }

  const elQualityNavItem = getQualityNavigationItem(elPlayer);
  if (elQualityNavItem) {
    elQualityNavItem.click();
    return;
  }

  elPlayer.querySelector<HTMLElement>(SELECTORS.qualityDropDownTrigger)?.click();
}

function changeQuality(
  elVideo: HTMLVideoElement,
  isEnhancedBitrateCustom?: Partial<EnhancedBitratePreferences>,
  isUseSuperResolution?: boolean
) {
  if (!window.ythdLastUserQualities) {
    return;
  }

  const fpsVideo = getVideoFPS(elVideo);
  const fpsStep = getFpsFromRange(window.ythdLastUserQualities, fpsVideo);
  const elQualities = getCurrentQualityElements(elVideo);
  const qualitiesAvailable = getAvailableQualities(elVideo);
  const qualityPreferred = window.ythdLastQualityClicked?.[fpsStep] ?? window.ythdLastUserQualities[fpsStep];
  const isEnhancedBitrate = {
    ...window.ythdLastUserEnhancedBitrates,
    ...isEnhancedBitrateCustom
  };

  function applyQuality(iQuality: number) {
    const elQuality = elQualities[iQuality];
    if (!elQuality || elQuality.ariaChecked === "true") {
      return;
    }

    elQuality.click();
  }

  function isQualityEligible(quality: string | number) {
    const qualityLabel = quality.toString();
    if (qualityLabel.endsWith(SUFFIX_EBR) && !isEnhancedBitrate[fpsStep]) {
      return false;
    }

    if (qualityLabel.endsWith(SUFFIX_SUPER_RESOLUTION) && !isUseSuperResolution) {
      return false;
    }

    return true;
  }

  const isQualityPreferredEBR = qualitiesAvailable[0]?.toString().endsWith(SUFFIX_EBR) && isEnhancedBitrate[fpsStep];
  if (isQualityPreferredEBR) {
    applyQuality(0);
    const elEbrQuality = elQualities[0];
    const elPlayer = getPlayerDiv(elVideo);
    if (elPlayer) {
      new MutationObserver((_, observer) => {
        if (elEbrQuality.ariaChecked !== "true" && elEbrQuality.isConnected) {
          return;
        }

        observer.disconnect();

        if (elEbrQuality.ariaChecked === "true") {
          return;
        }

        window.ythdLastEnhancedBitrateClicked ??= {};
        window.ythdLastEnhancedBitrateClicked[fpsStep] = false;
        void saveEnhancedBitrateRejection(fpsStep);
      }).observe(elPlayer, OBSERVER_OPTIONS);
    }

    return;
  }

  const iQualityPreferred = qualitiesAvailable.findIndex(quality => {
    if (!isQualityEligible(quality)) {
      return false;
    }

    return parseInt(quality.toString(), 10) <= parseInt(qualityPreferred.toString(), 10);
  });
  if (iQualityPreferred > -1) {
    applyQuality(iQualityPreferred);
    return;
  }

  const iLastEligibleQuality = qualitiesAvailable.findLastIndex(isQualityEligible);
  if (iLastEligibleQuality > -1) {
    applyQuality(iLastEligibleQuality);
  }
}

function changeQualityWhenPossible(elVideo: HTMLVideoElement) {
  if (!getIsLastOptionQuality(elVideo)) {
    return false;
  }

  openQualityMenu(elVideo);

  if (getCurrentQualityElements(elVideo).length === 0) {
    return false;
  }

  changeQuality(
    elVideo,
    window.ythdLastEnhancedBitrateClicked,
    window.ythdIsUseSuperResolution
  );
  return true;
}

function closeMenu(elPlayer: HTMLDivElement) {
  function clickPanelBackIfPossible() {
    const elPanelHeaderBack = elPlayer.querySelector<HTMLButtonElement>(SELECTORS.panelHeaderBack);
    if (elPanelHeaderBack) {
      elPanelHeaderBack.click();
      return true;
    }

    return false;
  }

  if (clickPanelBackIfPossible()) {
    return;
  }

  new MutationObserver((_, observer) => {
    if (clickPanelBackIfPossible()) {
      observer.disconnect();
    }
  }).observe(elPlayer, OBSERVER_OPTIONS);
}

function getIsSettingsPanelOpen(elPlayer: HTMLDivElement) {
  const elSettingsButton = elPlayer.querySelector<HTMLButtonElement>(SELECTORS.buttonSettings);
  if (!elSettingsButton) {
    return false;
  }

  const isVorapis = elSettingsButton.ariaPressed === "true";
  return elSettingsButton.ariaExpanded === "true" || isVorapis;
}

function changeQualityOnPage(elVideo: HTMLVideoElement) {
  const elPlayer = getPlayerDiv(elVideo);
  if (!elPlayer) {
    return;
  }

  if (getIsSettingsPanelOpen(elPlayer)) {
    return;
  }

  const elSettings = elPlayer.querySelector<HTMLElement>(SELECTORS.buttonSettings);
  if (getCurrentQualityElements(elVideo).length === 0) {
    elSettings?.click();
    elSettings?.click();
  }

  if (changeQualityWhenPossible(elVideo)) {
    closeMenu(elPlayer);
    elSettings?.blur();
  }
}

export async function prepareToChangeQualityOnDesktop(e?: Event) {
  if (location.pathname.startsWith("/shorts/")) {
    return;
  }

  await loadStorageValues();

  const elVideo = e?.target ?? getVisibleElement(SELECTORS.video);
  if (!(elVideo instanceof HTMLVideoElement)) {
    return;
  }

  changeQualityOnPage(elVideo);
}
