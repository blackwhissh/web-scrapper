export const STORAGE_KEYS = Object.freeze({
  latestListing: "latestListing",
  latestScrapeAt: "latestScrapeAt",
  searchResults: "searchResults",
  searchResultsScrapedAt: "searchResultsScrapedAt"
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

export async function saveSearchResults(listings) {
  if (!Array.isArray(listings)) {
    throw new Error("Listings must be an array.");
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.searchResults]: listings,
    [STORAGE_KEYS.searchResultsScrapedAt]: Date.now(),
  });
}

export async function getSearchResults() {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.searchResults,
    STORAGE_KEYS.searchResultsScrapedAt,
  ]);

  return {
    listings: data[STORAGE_KEYS.searchResults] ?? [],
    scrapedAt: data[STORAGE_KEYS.searchResultsScrapedAt] ?? null,
  };
}
