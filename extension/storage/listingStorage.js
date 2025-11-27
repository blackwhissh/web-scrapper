export const STORAGE_KEYS = Object.freeze({
  latestListing: "latestListing",
  latestScrapeAt: "latestScrapeAt"
});

export async function saveLatestListing(listing) {
  if (!listing) {
    throw new Error("Listing payload is required.");
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.latestListing]: listing,
    [STORAGE_KEYS.latestScrapeAt]: Date.now(),
  });
}

export async function getLatestListing() {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.latestListing,
    STORAGE_KEYS.latestScrapeAt,
  ]);

  return {
    listing: data[STORAGE_KEYS.latestListing] ?? null,
    scrapedAt: data[STORAGE_KEYS.latestScrapeAt] ?? null,
  };
}
