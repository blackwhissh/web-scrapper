import { scrapeListingFromDom } from "./scrapers/listingScraper.js";
import { saveLatestListing, getLatestListing, saveSearchResults, getSearchResults } from "./storage/listingStorage.js";
import { loadMappings } from "./utils/mappingLoader.js";

const ui = {
  scrapeButton: document.getElementById("scrapeButton"),
  autofillButton: document.getElementById("autofillButton"),
  viewResultsButton: document.getElementById("viewResultsButton"),
  searchForm: document.getElementById("searchForm"),
  searchButton: document.getElementById("searchButton"),
  cityInput: document.getElementById("cityInput"),
  dealTypeSelect: document.getElementById("dealTypeSelect"),
  priceMinInput: document.getElementById("priceMinInput"),
  priceMaxInput: document.getElementById("priceMaxInput"),
  excludeSVipInput: document.getElementById("excludeSVipInput"),
  excludeVipInput: document.getElementById("excludeVipInput"),
  maxListingsInput: document.getElementById("maxListingsInput"),
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
  ui.viewResultsButton.addEventListener("click", handleViewResultsClicked);
  if (ui.searchForm) {
    ui.searchForm.addEventListener("submit", handleSearchSubmitted);
  }
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

async function handleViewResultsClicked() {
  try {
    const { listings, scrapedAt } = await getSearchResults();
    
    if (!listings || listings.length === 0) {
      setStatus("No scraped search results found.", { isError: true });
      return;
    }
    
    // Log to console for inspection
    console.log(`[popup] Found ${listings.length} scraped listings:`, listings);
    
    // Create a summary
    const summary = {
      total: listings.length,
      scrapedAt: scrapedAt ? new Date(scrapedAt).toLocaleString() : 'Unknown',
      listings: listings.map(listing => ({
        title: listing.title || listing.propertyDetails?.['სათაური'] || 'No title',
        url: listing.url || 'No URL',
        price: listing.price || listing.propertyDetails?.['ფასი'] || 'N/A',
        address: listing.address || listing.propertyDetails?.['მისამართი'] || 'No address',
        area: listing.area || listing.propertyDetails?.['ფართი'] || 'N/A',
        rooms: listing.rooms || listing.propertyDetails?.['ოთახი'] || 'N/A',
      }))
    };
    
    console.log('[popup] Search Results Summary:', summary);
    
    // Also log full data as JSON for easy export
    console.log('[popup] Full scraped data (JSON):', JSON.stringify(listings, null, 2));
    
    setStatus(`Found ${listings.length} scraped listing(s). Check console (F12) for details.`);
    
    // Optionally, you could open a new tab with the data formatted
    // For now, we'll just log it to console
  } catch (error) {
    console.error("[popup] Error viewing results:", error);
    setStatus(error.message ?? "Error viewing results.", { isError: true });
  }
}

async function handleSearchSubmitted(event) {
  event.preventDefault();

  const filters = {
    city: ui.cityInput?.value?.trim() || "",
    dealType: ui.dealTypeSelect?.value || "",
    priceMin: ui.priceMinInput?.value ? Number(ui.priceMinInput.value) : null,
    priceMax: ui.priceMaxInput?.value ? Number(ui.priceMaxInput.value) : null,
    excludeSVip: ui.excludeSVipInput?.checked || false,
    excludeVip: ui.excludeVipInput?.checked || false,
    maxListings: ui.maxListingsInput?.value ? Number(ui.maxListingsInput.value) : null,
  };

  setPendingStatus("Running search…");

  try {
    await executeSearchOnActiveTab(filters);
    setStatus("Search applied on page.");
  } catch (error) {
    console.error("[popup] search failed", error);
    setStatus(error.message ?? "Search failed.", { isError: true });
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

/**
 * Helper function to scrape a listing from a specific tab
 * Uses the exact same approach as executeScrapeOnActiveTab (Scrape Page button)
 * @param {number} tabId - The tab ID to scrape
 * @param {Object} mappings - Mappings object for scraping
 * @returns {Promise<Object|null>} Scraped listing data or null
 */
async function executeScrapeOnTab(tabId, mappings) {
  // Use the exact same approach as executeScrapeOnActiveTab (Scrape Page button)
  // Pass the function reference directly - Chrome will serialize and execute it
  try {
    const [{ result } = {}] = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: scrapeListingFromDom,
      args: [mappings],
    });
    return result;
  } catch (error) {
    console.error(`[executeScrapeOnTab] Error scraping tab ${tabId}:`, error);
    return null;
  }
}

async function executeSearchOnActiveTab(filters) {
  const tab = await getActiveTab();

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (searchFilters) => {
      /**
       * MyHome.ge search form implementation
       * The form uses modals/dropdowns for filters
       */

      // Helper function to set input value and trigger events
      function setInputValue(element, value) {
        if (!element || (!value && value !== 0)) return false;
        element.focus();
        element.value = value;
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        element.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
        return true;
      }

      // Helper function to find element by text content
      function findElementByText(selector, text, exact = false) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const elementText = (el.textContent || '').trim();
          if (exact ? elementText === text : elementText.includes(text)) {
            return el;
          }
        }
        return null;
      }

      // Helper function to click radio button by text
      function clickRadioByText(text) {
        // Try role="radio" elements first (used by MyHome.ge)
        const radioElements = document.querySelectorAll('[role="radio"]');
        for (const radio of radioElements) {
          const textContent = (radio.textContent || '').trim();
          if (textContent === text || textContent.includes(text)) {
            if (radio.click) {
              radio.click();
              return true;
            }
            // Try parent element
            if (radio.parentElement && radio.parentElement.click) {
              radio.parentElement.click();
              return true;
            }
          }
        }
        
        // Fallback: try actual radio inputs
        const radioInputs = document.querySelectorAll('input[type="radio"]');
        for (const radio of radioInputs) {
          const label = radio.closest('label');
          if (label) {
            const labelText = (label.textContent || '').trim();
            if (labelText === text || labelText.includes(text)) {
              radio.click();
              return true;
            }
          }
        }
        return false;
      }

      // Map deal type values to Georgian text
      const dealTypeMap = {
        'sell': 'იყიდება',
        'rent': 'ქირავდება'
      };

      // 1. Set Deal Type (გარიგების ტიპი) - uses modal with radio buttons
      if (searchFilters.dealType && dealTypeMap[searchFilters.dealType]) {
        const dealTypeText = dealTypeMap[searchFilters.dealType];
        
        // Find deal type selector button (contains "გარიგების ტიპი" or "ქონების ტიპი")
        const dealTypeButton = Array.from(document.querySelectorAll('button, div, span'))
          .find(el => {
            const text = (el.textContent || '').trim();
            return text.includes('გარიგების ტიპი') || text.includes('ქონების ტიპი');
          });
        
        if (dealTypeButton && dealTypeButton.click) {
          dealTypeButton.click();
          // Wait for modal to open, then click the radio
          setTimeout(() => {
            clickRadioByText(dealTypeText);
          }, 400);
        } else {
          // Modal might already be open, try clicking radio directly
          clickRadioByText(dealTypeText);
        }
      }

      // 2. Set City / Location (მდებარეობა)
      if (searchFilters.city) {
        // Find location input - usually first text input in search area
        const searchArea = document.querySelector('form, [role="banner"], header, [class*="search"]');
        let locationInput = null;
        
        if (searchArea) {
          const textInputs = searchArea.querySelectorAll('input[type="text"]');
          // The location input is usually the first one (has empty or minimal placeholder)
          for (const input of textInputs) {
            const placeholder = (input.placeholder || '').trim();
            // MyHome.ge location input has minimal placeholder
            if (!placeholder || placeholder === ' ' || placeholder.length < 5) {
              locationInput = input;
              break;
            }
          }
        }
        
        // Fallback: try other selectors
        if (!locationInput) {
          locationInput = document.querySelector('input[placeholder*="მდებარეობ"], input[name*="location"], input[name*="city"]');
        }
        
        if (locationInput) {
          setInputValue(locationInput, searchFilters.city);
        }
      }

      // 3. Set Price Range
      // Note: Price filters might need to be opened via a filter button/modal on MyHome.ge
      // For now, try to find price inputs directly
      if (searchFilters.priceMin != null) {
        const priceMinInput = document.querySelector('input[placeholder*="მინ"], input[name*="price_from"], input[name*="priceMin"]');
        if (priceMinInput) {
          setInputValue(priceMinInput, searchFilters.priceMin);
        }
      }
      
      if (searchFilters.priceMax != null) {
        const priceMaxInput = document.querySelector('input[placeholder*="მაქს"], input[name*="price_to"], input[name*="priceMax"]');
        if (priceMaxInput) {
          setInputValue(priceMaxInput, searchFilters.priceMax);
        }
      }

      // 4. Function to collect listing URLs from search results
      function collectListingUrls() {
        const urls = [];
        const listingLinks = document.querySelectorAll('a[href*="/pr/"]');
        const processedUrls = new Set();
        const maxListings = searchFilters.maxListings && searchFilters.maxListings > 0 ? searchFilters.maxListings : null;
        
        console.log(`[scraper] Found ${listingLinks.length} listing links on page`);
        if (maxListings) {
          console.log(`[scraper] Max listings limit: ${maxListings}`);
        }
        
        const parsePriceText = (text) => {
          if (!text) return null;
          let value = text.replace(/[\s\u00A0]/g, '').replace(/[^\d.,]/g, '');
          if (!value) return null;
          const hasComma = value.includes(',');
          const hasDot = value.includes('.');
          if (hasComma && hasDot) {
            if (value.lastIndexOf('.') > value.lastIndexOf(',')) {
              return parseFloat(value.replace(/,/g, '')) || null;
            }
            return parseFloat(value.replace(/\./g, '').replace(',', '.')) || null;
          }
          if (hasComma) {
            const parts = value.split(',');
            const last = parts[parts.length - 1];
            if (last.length === 3 && parts.length > 1) {
              return parseFloat(value.replace(/,/g, '')) || null;
            }
            if (last.length <= 2) {
              return parseFloat(value.replace(',', '.')) || null;
            }
            return parseFloat(value.replace(/,/g, '')) || null;
          }
          if (hasDot) {
            const parts = value.split('.');
            const last = parts[parts.length - 1];
            if (last.length === 3 && parts.length > 1) {
              return parseFloat(value.replace(/\./g, '')) || null;
            }
            return parseFloat(value) || null;
          }
          return parseFloat(value) || null;
        };
        
        for (let i = 0; i < listingLinks.length; i++) {
          // Stop if we've reached the max listings limit
          if (maxListings && urls.length >= maxListings) {
            break;
          }
          
          const link = listingLinks[i];
          const container = link.closest('article, div[class*="listing"], div[class*="property"], li') || link.parentElement;
          
          // Skip hidden listings (filtered out VIP listings)
          if (container.style.display === 'none' || window.getComputedStyle(container).display === 'none') {
            continue;
          }
          
          // Extract URL
          const url = link.href || link.getAttribute('href');
          if (url && url.includes('/pr/') && !processedUrls.has(url)) {
            processedUrls.add(url);
            urls.push(url);
            console.log(`[scraper] Collected listing URL ${urls.length}: ${url}`);
          }
        }
        
        console.log(`[scraper] Total listing URLs collected: ${urls.length}${maxListings ? ` (limit was ${maxListings})` : ''}`);
        return urls;
      }

      // 5. Function to filter VIP/S-VIP listings
      function filterVipListings() {
        if (!searchFilters.excludeSVip && !searchFilters.excludeVip) {
          return; // No filtering needed
        }

        // Find all listing elements - they usually contain links to property details
        const listingSelectors = [
          'a[href*="/pr/"]',  // Property detail links
          '[class*="listing"]',
          '[class*="property"]',
          'article',
        ];

        let listings = [];
        for (const selector of listingSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            listings = Array.from(elements);
            break;
          }
        }

        // If no specific listing containers found, try to find by VIP labels
        if (listings.length === 0) {
          // Find all elements that contain VIP labels
          const allElements = document.querySelectorAll('*');
          for (const el of allElements) {
            const text = (el.textContent || '').trim();
            if (text === 'S-VIP' || text === 'VIP+' || text === 'VIP') {
              // Find the parent listing container (usually a link or article)
              let parent = el.parentElement;
              let depth = 0;
              while (parent && depth < 10) {
                if (parent.tagName === 'A' || parent.tagName === 'ARTICLE' || 
                    parent.getAttribute('href')?.includes('/pr/')) {
                  if (!listings.includes(parent)) {
                    listings.push(parent);
                  }
                  break;
                }
                parent = parent.parentElement;
                depth++;
              }
            }
          }
        }

        // Filter listings based on VIP status
        listings.forEach(listing => {
          const listingText = (listing.textContent || '').toUpperCase();
          let shouldHide = false;

          // Check for S-VIP first (most specific)
          const isSVip = listingText.includes('S-VIP') || listingText.includes('S VIP');
          // Check for VIP+ or VIP (but not S-VIP)
          const isVip = !isSVip && (listingText.includes('VIP+') || listingText.includes(' VIP '));

          if (searchFilters.excludeSVip && isSVip) {
            shouldHide = true;
          } else if (searchFilters.excludeVip && isVip) {
            shouldHide = true;
          }

          if (shouldHide) {
            // Hide the listing element
            const listingContainer = listing.closest('article, div, li') || listing.parentElement;
            if (listingContainer) {
              listingContainer.style.display = 'none';
            } else {
              listing.style.display = 'none';
            }
          }
        });
      }

      // 6. Click search button (ძებნა)
      setTimeout(() => {
        // Find search button by text content
        const buttons = Array.from(document.querySelectorAll('button'));
        const searchButton = buttons.find(btn => {
          const text = (btn.textContent || '').trim();
          return text === 'ძებნა' || text.includes('ძებნა');
        });
        
        if (searchButton) {
          searchButton.click();
          
          // After search, wait for results to load, filter VIP listings, and scrape listings
          setTimeout(() => {
            // Filter VIP listings if needed
            if (searchFilters.excludeSVip || searchFilters.excludeVip) {
              filterVipListings();
            }
            
            // Collect listing URLs (we'll scrape them in separate tabs)
            setTimeout(() => {
              try {
                const listingUrls = collectListingUrls();
                if (listingUrls && listingUrls.length > 0) {
                  window.__listingUrlsToScrape = listingUrls;
                  console.log(`[search] Collected ${listingUrls.length} listing URL(s) to scrape:`, listingUrls);
                } else {
                  console.warn('[search] No listing URLs found');
                  window.__listingUrlsToScrape = [];
                }
              } catch (error) {
                console.error('Error collecting listing URLs:', error);
                window.__listingUrlsToScrape = [];
              }
            }, 500);
            
            // Set up mutation observer for dynamic content
            const observer = new MutationObserver(() => {
              if (searchFilters.excludeSVip || searchFilters.excludeVip) {
                filterVipListings();
              }
              
              // Re-collect listing URLs when new content is loaded
              setTimeout(() => {
                try {
                  const listingUrls = collectListingUrls();
                  if (listingUrls && listingUrls.length > 0) {
                    window.__listingUrlsToScrape = listingUrls;
                    console.log(`[search] Re-collected ${listingUrls.length} listing URL(s) after content update`);
                  }
                } catch (error) {
                  console.error('Error collecting listing URLs:', error);
                }
              }, 300);
            });
            
            const resultsContainer = document.querySelector('main, [class*="results"], [class*="listings"]') || document.body;
            if (resultsContainer) {
              observer.observe(resultsContainer, {
                childList: true,
                subtree: true
              });
              
              // Stop observing after 10 seconds
              setTimeout(() => observer.disconnect(), 10000);
            }
          }, 1500);
        } else {
          // Fallback: try aria-label or other attributes
          const fallbackButton = document.querySelector('button[aria-label*="ძებნ"], button[type="submit"]');
          if (fallbackButton) {
            fallbackButton.click();
            
            setTimeout(() => {
              if (searchFilters.excludeSVip || searchFilters.excludeVip) {
                filterVipListings();
              }
              
              // Collect listing URLs
              setTimeout(() => {
                try {
                  const listingUrls = collectListingUrls();
                  if (listingUrls && listingUrls.length > 0) {
                    window.__listingUrlsToScrape = listingUrls;
                    console.log(`[search] Collected ${listingUrls.length} listing URL(s)`, listingUrls);
                  } else {
                    console.warn('[search] No listing URLs found');
                    window.__listingUrlsToScrape = [];
                  }
                } catch (error) {
                  console.error('Error collecting listing URLs:', error);
                  window.__listingUrlsToScrape = [];
                }
              }, 500);
            }, 1500);
          }
        }
      }, 600); // Give time for any modals to close and inputs to be processed
    },
    args: [filters],
  });

  // Wait for URL collection, then scrape each listing in parallel tabs
  setTimeout(async () => {
    try {
      // Get listing URLs from the search results page
      const [{ result: listingUrls }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          return window.__listingUrlsToScrape || [];
        },
      });

      if (listingUrls && listingUrls.length > 0) {
        setPendingStatus(`Found ${listingUrls.length} listing(s). Opening tabs and scraping...`);
        console.log(`[popup] Found ${listingUrls.length} listing URLs to scrape:`, listingUrls);
        
        // Scrape all listings in parallel
        const scrapedListings = await scrapeListingsInParallel(listingUrls);
        
        if (scrapedListings && scrapedListings.length > 0) {
          await saveSearchResults(scrapedListings);
          console.log(`[popup] Saved ${scrapedListings.length} scraped listings`);
          setStatus(`Scraping complete! Scraped ${scrapedListings.length} listing(s) with full details.`);
        } else {
          setStatus("Scraping complete, but no listings were successfully scraped.", { isError: true });
        }
      } else {
        setStatus("Search complete, but no listing URLs were found.", { isError: true });
      }
    } catch (error) {
      console.error('[popup] Error scraping listings:', error);
      setStatus(`Error scraping listings: ${error.message}`, { isError: true });
    }
  }, 3000); // Wait for search, filtering, and URL collection to complete
}

/**
 * Scrapes multiple listing pages in parallel by opening each in a new tab
 * @param {string[]} urls - Array of listing URLs to scrape
 * @returns {Promise<Array>} Array of scraped listing data
 */
async function scrapeListingsInParallel(urls) {
  const scrapedListings = [];
  const openedTabs = [];
  
  try {
    // Load mappings for scraping
    let mappings = {};
    try {
      mappings = await loadMappings();
      console.log('[popup] Loaded mappings:', Object.keys(mappings).length, 'attributes');
    } catch (error) {
      console.warn('[popup] Could not load mappings, using fallback selectors:', error);
    }
    
    // Open all tabs first
    setPendingStatus(`Opening ${urls.length} tabs...`);
    for (const url of urls) {
      try {
        const tab = await chrome.tabs.create({
          url: url,
          active: false, // Open in background
        });
        openedTabs.push(tab);
      } catch (error) {
        console.error(`[popup] Failed to open tab for ${url}:`, error);
      }
    }
    
    console.log(`[popup] Opened ${openedTabs.length} tabs, waiting for them to load...`);
    
    // Wait for all tabs to load
    await Promise.all(
      openedTabs.map(tab =>
        new Promise((resolve) => {
          const listener = (tabId, changeInfo) => {
            if (tabId === tab.id && changeInfo.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              resolve();
            }
          };
          chrome.tabs.onUpdated.addListener(listener);
          
          // Timeout after 15 seconds per tab
          setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }, 15000);
        })
      )
    );
    
    // Wait a bit more for dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Scrape each tab in parallel using the existing scrape function
    setPendingStatus(`Scraping ${openedTabs.length} listings in parallel...`);
    const scrapePromises = openedTabs.map(async (tab, index) => {
      try {
        console.log(`[popup] Starting to scrape tab ${index + 1}/${openedTabs.length}: ${tab.url}`);
        
        // Use executeScrapeOnTab helper (same scraping logic as Scrape Page button)
        const result = await executeScrapeOnTab(tab.id, mappings);
        
        if (result) {
          console.log(`[popup] Successfully scraped listing ${index + 1}/${openedTabs.length}: ${result.propertyDetails?.['სათაური'] || tab.url}`);
          return result;
        } else {
          console.warn(`[popup] No data scraped from ${tab.url} - result was null or undefined`);
          return null;
        }
      } catch (error) {
        console.error(`[popup] Error scraping ${tab.url}:`, error);
        return null;
      } finally {
        // Close the tab after scraping
        try {
          await chrome.tabs.remove(tab.id);
        } catch (closeError) {
          console.warn(`[popup] Could not close tab ${tab.id}:`, closeError);
        }
      }
    });
    
    // Wait for all scraping to complete
    const results = await Promise.all(scrapePromises);
    
    // Filter out null results
    scrapedListings.push(...results.filter(result => result !== null));
    
    console.log(`[popup] Completed scraping: ${scrapedListings.length}/${urls.length} listings scraped successfully`);
    
  } catch (error) {
    console.error('[popup] Error in parallel scraping:', error);
    
    // Clean up any remaining tabs
    for (const tab of openedTabs) {
      try {
        await chrome.tabs.remove(tab.id);
      } catch (closeError) {
        // Ignore close errors
      }
    }
  }
  
  return scrapedListings;
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
