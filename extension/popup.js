import { scrapeListingFromDom } from "./scrapers/listingScraper.js";
import { saveLatestListing, getLatestListing } from "./storage/listingStorage.js";
import { loadMappings } from "./utils/mappingLoader.js";

const ui = {
  scrapeButton: document.getElementById("scrapeButton"),
  autofillButton: document.getElementById("autofillButton"),
  statusLabel: document.getElementById("status"),
};

const STATUS_ICON = Object.freeze({
  success: "✓ ",
  error: "⚠ ",
});

const STATUS_MESSAGES = Object.freeze({
  idle: "Ready.",
  scraping: "Scraping page…",
  scrapeSuccess: "Scrape complete.",
  scrapeEmpty: "Scraper returned no data.",
  autofillPending: "Autofill command pending implementation.",
  noActiveTab: "No active tab detected.",
});

document.addEventListener("DOMContentLoaded", () => {
  setStatus(STATUS_MESSAGES.idle);
  registerEventHandlers();
});

function registerEventHandlers() {
  ui.scrapeButton.addEventListener("click", handleScrapeClicked);
  ui.autofillButton.addEventListener("click", handleAutofillClicked);
}

async function handleScrapeClicked() {
  setPendingStatus(STATUS_MESSAGES.scraping);
  try {
    const scrapedData = await executeScrapeOnActiveTab();
    if (!scrapedData) {
      throw new Error(STATUS_MESSAGES.scrapeEmpty);
    }

    await saveLatestListing(scrapedData);
    setStatus(STATUS_MESSAGES.scrapeSuccess);
  } catch (error) {
    console.error("[popup] scraping failed", error);
    setStatus(error.message ?? "Scrape failed.", { isError: true });
  }
}

async function handleAutofillClicked() {
  setPendingStatus("Autofill starting…");
  try {
    // Get the latest scraped listing
    const { listing } = await getLatestListing();
    if (!listing) {
      throw new Error("No scraped data found. Please scrape a listing first.");
    }

    // Execute autofill on the active tab
    await executeAutofillOnActiveTab(listing);
    setStatus("Autofill complete.");
  } catch (error) {
    console.error("[popup] autofill failed", error);
    setStatus(error.message ?? "Autofill failed.", { isError: true });
  }
}

async function executeAutofillOnActiveTab(listingData) {
  const tab = await getActiveTab();
  
  // Inject the autofill script file
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['autofill/listingAutofill.js'],
  });
  
  // Execute the autofill function
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (data) => {
      // Import and call the autofill function
      if (typeof autofillListingForm === 'function') {
        autofillListingForm(data);
      } else {
        console.error('autofillListingForm function not found');
      }
    },
    args: [listingData],
  });
}

async function executeScrapeOnActiveTab() {
  const tab = await getActiveTab();
  
  // Load mappings from CSV
  let mappings = {};
  try {
    mappings = await loadMappings();
    console.log('[popup] Loaded mappings:', Object.keys(mappings).length, 'attributes');
  } catch (error) {
    console.warn('[popup] Failed to load mappings, using fallback selectors:', error);
  }
  
  const [{ result } = {}] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: scrapeListingFromDom,
    args: [mappings],
  });
  return result;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error(STATUS_MESSAGES.noActiveTab);
  }
  return tab;
}

function setStatus(message, { isError = false } = {}) {
  const prefix = isError ? STATUS_ICON.error : STATUS_ICON.success;
  ui.statusLabel.textContent = `${prefix}${message}`;
}

function setPendingStatus(message) {
  ui.statusLabel.textContent = message;
}
