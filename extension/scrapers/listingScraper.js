function scrapeListingFromDom(mappings = {}) {
  const FALLBACK_DESCRIPTION_SELECTORS = [
    ".description",
    ".listing-description",
    "[data-testid='listing-description']",
  ];

  const FALLBACK_SHORT_DESCRIPTION_SELECTORS = [
    "[data-testid='short-description']",
    ".short-description",
    ".listing-short-description",
    "section [class*='short'][class*='description']",
    "div.relative.w-full.p-5.pb-3.mt-4.bg-white.border.rounded-2xl.border-gray-20 .text-sm",
    "div.relative.w-full.p-5.pb-3.mt-4.bg-white.border.rounded-2xl.border-gray-20"
  ];

  // Fallback selectors if mappings are not available
  const FALLBACK_SELECTORS = {
    title: [
      "h1",
      "h1[class*=\"font\"]",
      ".font-tbcx-bold"
    ],
    title_ge: [
      "h1",
      "h1[class*=\"font\"]",
      ".font-tbcx-bold"
    ],
    address: [
      "[itemprop=\"address\"]",
      ".flex.flex-col.items-start .flex.items-center span:last-child"
    ],
    area: [".area", ".property-area", "[data-area]"],
    rooms: [".rooms", "[data-rooms]"],
    bedroom: [".bedroom", "[data-bedroom]"],
    floor: [".floor", "[data-floor]"],
    description: FALLBACK_DESCRIPTION_SELECTORS,
    status: [".status", "[data-status]"],
    condition: [".condition", "[data-condition]"],
    type_of_project: [".type", "[data-type]"],
    bathrooms: [".bathrooms", "[data-bathrooms]"],
    height: [".height", "[data-height]"],
    heating: [".heating", "[data-heating]"],
    hot_water: [".hot-water", "[data-hot-water]"],
    living: [".living", "[data-living]"],
    gas: [".gas", "[data-gas]"],
    internet: [".internet", "[data-internet]"],
    tv: [".tv", "[data-tv]"],
    elevator: [".elevator", "[data-elevator]"],
    lift: [".lift", "[data-lift]"],
    telephone: [".telephone", "[data-telephone]", "[data-phone]"],
  };

  const ATTRIBUTE_CONTAINER_SELECTORS = [
    ".facts li",
    ".property-features li",
    ".key-details li",
    "dl.factsRow",
  ];

  const GALLERY_CONTAINER_SELECTOR =
    "#__next > div.pt-0.md\\:pt-8.pb-8.md\\:pb-12.bg-white.md\\:bg-\\[rgb\\(251\\,251\\,251\\)\\] > div > div.grid.items-start.grid-cols-12.gap-5.mt-0.md\\:mt-3 > div.col-span-12.lg\\:col-span-9 > div.relative > div.h-\\[302px\\].md\\:h-\\[551px\\].w-full.overflow-hidden.relative.z-10.lg\\:rounded-2xl > div.absolute.bottom-6.z-20.max-w-full.w-full.px-\\[60px\\] > div > div";

  /**
   * Normalizes a CSS selector for use with querySelector
   * Skips complex selectors with escaped brackets and converts simple Tailwind classes
   * @param {string} selector - The CSS selector string
   * @returns {string|null} The normalized selector or null if it should be skipped
   */
  const normalizeSelector = (selector) => {
    if (!selector) return selector;

    // If selector contains escaped bracket classes, skip it
    // These create invalid leftover segments when transformed
    if (/\\\[/.test(selector) || /\\\]/.test(selector)) {
      return null;
    }

    // Convert escaped Tailwind md:xxx → [class*="md:xxx"]
    return selector.replace(/\.([\w-]+)\\:([\w-]+)/g, (m, p1, p2) => {
      const cls = `${p1}:${p2}`;
      return `[class*="${cls}"]`;
    });
  };

  const getFirstTextMatch = (selectors) => {
    if (!selectors || selectors.length === 0) {
      return null;
    }
    for (const selector of selectors) {
      if (!selector) continue;
      try {
        // Normalize the selector for querySelector
        const normalizedSelector = normalizeSelector(selector);
        
        // Skip if normalization returned null (complex selector with brackets)
        if (!normalizedSelector) {
          continue;
        }
        
        const element = document.querySelector(normalizedSelector);
        if (element?.textContent) {
          return element.textContent.trim();
        }
      } catch (error) {
        // Silently skip invalid selectors
        continue;
      }
    }
    return null;
  };

  /**
   * Scrapes an attribute using mapping from CSV, with fallback
   * @param {string} attributeName - The name of the attribute
   * @returns {string|null} The scraped value or null if not found
   */
  const scrapeMappedAttribute = (attributeName) => {
    // First try the mapping from CSV
    if (mappings[attributeName]) {
      const value = getFirstTextMatch([mappings[attributeName]]);
      if (value) {
        return value;
      }
    }
    
    // Fallback to default selectors
    const fallbackSelectors = FALLBACK_SELECTORS[attributeName];
    if (fallbackSelectors) {
      return getFirstTextMatch(fallbackSelectors);
    }
    
    return null;
  };

  const collectGalleryImages = () => {
    const container = document.querySelector(GALLERY_CONTAINER_SELECTOR);
    if (!container) {
      return [];
    }

    const toAbsoluteUrl = (value) => {
      if (!value) {
        return null;
      }
      try {
        return new URL(value, location.href).href;
      } catch {
        return null;
      }
    };

    const convertToFullSize = (url) => {
      
      return url;
    };

    const seen = new Set();

    return Array.from(container.querySelectorAll("img"))
      .map((img) => {
        const rawSource =
          img.currentSrc ||
          img.getAttribute("src") ||
          img.getAttribute("data-src") ||
          img.getAttribute("data-lazy") ||
          img.getAttribute("data-srcset")?.split(/\s+/)[0] ||
          img.src;

        const absolute = toAbsoluteUrl(rawSource);
        if (!absolute || seen.has(absolute)) {
          return null;
        }

        seen.add(absolute);
        
        return absolute;
      })
      .filter(Boolean);
  };

  const collectAttributes = () =>
    ATTRIBUTE_CONTAINER_SELECTORS.reduce((acc, selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        const key = element.querySelector?.("dt, .label, .title, .key")?.textContent?.trim();
        const value = element
          .querySelector?.("dd, .value, .data")
          ?.textContent?.trim();
        if (key && value && !acc[key]) {
          acc[key] = value;
        }
      });
      return acc;
    }, {});

  /**
   * Extracts additional parameters from the "დამატებითი პარამეტრები" section
   * Looks for the container div and extracts all header-value pairs from the grid
   * @returns {Object} Object with header names as keys and values as values
   */
  const collectAdditionalParameters = () => {
    const additionalParams = {};
    
    // Find the container div by looking for the heading first, then getting its parent container
    // This is more reliable than trying to match all the classes
    const headings = Array.from(document.querySelectorAll('h3')).filter(h3 => 
      h3.textContent.includes('დამატებითი პარამეტრები')
    );
    
    if (headings.length === 0) {
      return additionalParams;
    }
    
    // Find the parent container (should be a div with bg-white, border, rounded-2xl classes)
    let container = headings[0].closest('div[class*="bg-white"][class*="border"][class*="rounded-2xl"]');
    
    if (!container) {
      return additionalParams;
    }
    
    // Find the grid container
    const gridContainer = container.querySelector('div[class*="grid"][class*="gap"]');
    if (!gridContainer) {
      return additionalParams;
    }
    
    // Find all items in the grid (each item is a div with flex classes)
    const items = gridContainer.querySelectorAll('div[class*="flex"][class*="items-center"]');
    
    items.forEach((item) => {
      // Extract header from span with class containing "line-clamp-1" and "text-secondary-100"
      const headerElement = item.querySelector('span[class*="line-clamp-1"][class*="text-secondary-100"]');
      if (!headerElement) {
        return;
      }
      
      const header = headerElement.textContent.trim();
      if (!header) {
        return;
      }
      
      // Extract value - try desktop version first (hidden on mobile, visible on desktop)
      let valueElement = item.querySelector('div[class*="hidden"][class*="text-xs"][class*="opacity-60"][class*="md:block"]');
      
      // If not found, try mobile version (visible on mobile, hidden on desktop)
      if (!valueElement) {
        valueElement = item.querySelector('span[class*="block"][class*="w-1/2"][class*="text-xs"][class*="md:hidden"]');
      }
      
      // Fallback: look for any div or span with text-xs class that's a sibling or child
      if (!valueElement) {
        // Try to find the value in the flex-col container
        const flexCol = item.querySelector('div[class*="flex-col"]');
        if (flexCol) {
          valueElement = flexCol.querySelector('div[class*="text-xs"], span[class*="text-xs"]');
        }
      }
      
      if (valueElement) {
        const value = valueElement.textContent.trim();
        if (value) {
          // Use header as key (keeping Georgian text as-is)
          additionalParams[header] = value;
        }
      }
    });
    
    return additionalParams;
  };

  /**
   * Extracts the "მოკლე აღწერა" (short description) section
   * Looks for heading text and reads the adjacent text content
   * @returns {string|null}
   */
  const collectShortDescription = () => {
    // Explicit deep selector provided (targeting the inner description div)
    const explicitPath = document.querySelector("#__next > div.pt-0.md\\:pt-8.pb-8.md\\:pb-12.bg-white.md\\:bg-\\[rgb\\(251\\,251\\,251\\)\\] > div > div.grid.items-start.grid-cols-12.gap-5.mt-0.md\\:mt-3 > div.col-span-12.lg\\:col-span-9 > div.px-4.md\\:px-6.lg\\:px-0 > div.relative.w-full.p-5.pb-3.mt-4.bg-white.border.md\\:p-6.rounded-2xl.border-gray-20.md\\:mt-5 > div > div > div > div");
    if (explicitPath) {
      const text = (explicitPath.textContent || '').trim();
      if (text && text !== 'მოკლე აღწერა') {
        return text;
      }
    }

    const extractFromContainer = (container, headingText) => {
      if (!container) return null;

      // Prefer a dedicated text block
      const textBlock = container.querySelector('.text-sm');
      // In myhome layout the actual text sits in the innermost div under .text-sm
      const innerBlock = textBlock?.querySelector('div') || textBlock;
      if (innerBlock?.textContent?.trim()) {
        return innerBlock.textContent.trim();
      }

      // Otherwise, aggregate text excluding the heading text
      const texts = [];
      container.querySelectorAll('p, span, div').forEach(el => {
        const t = (el.textContent || '').trim();
        if (!t) return;
        if (headingText && t === headingText) return;
        texts.push(t);
      });
      return texts.length ? texts.join(' ') : null;
    };

    // Try direct container selectors first to avoid capturing heading-only text
    const directContainers = document.querySelectorAll(
      'div.relative.w-full.p-5.pb-3.mt-4.bg-white.border.rounded-2xl.border-gray-20'
    );
    for (const container of Array.from(directContainers)) {
      const headingEl = container.querySelector('h3, h2, h4, span, div');
      const headingText = headingEl ? (headingEl.textContent || '').trim() : null;
      if (headingText && headingText.trim() === 'მოკლე აღწერა') {
        // Use text after heading
        const textAfterHeading = Array.from(container.querySelectorAll('p, span, div'))
          .map(el => (el.textContent || '').trim())
          .filter(t => t && t !== headingText);
        if (textAfterHeading.length) {
          return textAfterHeading.join(' ');
        }
      }
      const extracted = extractFromContainer(container, headingText);
      if (extracted && extracted !== 'მოკლე აღწერა') return extracted;
    }

    // Try simpler direct selectors (if they point at a text node rather than heading)
    const direct = getFirstTextMatch(FALLBACK_SHORT_DESCRIPTION_SELECTORS);
    if (direct && direct.trim() !== 'მოკლე აღწერა') return direct;

    // Look for a heading that contains "მოკლე აღწერა"
    const heading = Array.from(document.querySelectorAll('h2, h3, h4, span, div')).find(el => {
      const text = (el.textContent || '').trim();
      return text.includes('მოკლე აღწერა');
    });

    if (heading) {
      const container = heading.closest('div.relative.w-full.p-5.pb-3.mt-4.bg-white.border') ||
                        heading.closest('div, section, article') ||
                        heading.parentElement;

      const pulled = extractFromContainer(container, heading.textContent.trim());
      if (pulled) return pulled;

      // Fallback: use the next sibling that has text
      let sibling = heading.nextElementSibling;
      let depth = 0;
      while (sibling && depth < 3) {
        const text = (sibling.textContent || '').trim();
        if (text && !text.includes('მოკლე აღწერა')) {
          return text;
        }
        sibling = sibling.nextElementSibling;
        depth++;
      }
    }

    return null;
  };

  /**
   * Extracts furniture items from the "ავეჯი" section
   * Looks for the container div and extracts all values as a list
   * @returns {Array<string>} Array of furniture item names
   */
  const collectFurnitureItems = () => {
    const furnitureItems = [];
    
    // Find the container div by looking for the "ავეჯი" heading
    const headings = Array.from(document.querySelectorAll('h3')).filter(h3 => 
      h3.textContent.includes('ავეჯი')
    );
    
    if (headings.length === 0) {
      return furnitureItems;
    }
    
    // Find the parent container (should be a div with bg-white, border, rounded-2xl classes)
    let container = headings[0].closest('div[class*="bg-white"][class*="border"][class*="rounded-2xl"]');
    
    if (!container) {
      return furnitureItems;
    }
    
    // Find the grid container
    const gridContainer = container.querySelector('div[class*="grid"][class*="gap"]');
    if (!gridContainer) {
      return furnitureItems;
    }
    
    // Find all items in the grid (each item is a div with flex classes)
    const items = gridContainer.querySelectorAll('div[class*="flex"][class*="items-center"]');
    
    items.forEach((item) => {
      // Extract value from span with class containing "line-clamp-1" and "text-secondary-100"
      // In this section, the span directly contains the value (no separate header/value structure)
      const valueElement = item.querySelector('span[class*="line-clamp-1"][class*="text-secondary-100"]');
      
      if (valueElement) {
        const value = valueElement.textContent.trim();
        if (value) {
          furnitureItems.push(value);
        }
      }
    });
    
    return furnitureItems;
  };

  /**
   * Extracts property details from the main property grid (area, rooms, bedrooms, floor)
   * Looks for the grid container with property details
   * @returns {Object} Object with property labels as keys and values as values
   */
  const collectPropertyDetails = () => {
    const propertyDetails = {};
    
    // Find the container div with classes: items-center, flex-wrap, border, border-gray-20, rounded-xl
    // This is the main property details grid
    const containerSelectors = [
      'div[class*="items-center"][class*="flex-wrap"][class*="border"][class*="border-gray-20"][class*="rounded-xl"]',
      'div[class*="grid"][class*="grid-cols-4"]',
    ];
    
    let container = null;
    for (const selector of containerSelectors) {
      container = document.querySelector(selector);
      if (container) {
        // Verify it's a grid with 4 columns
        const gridItems = container.querySelectorAll('div[class*="flex"][class*="flex-col"]');
        if (gridItems.length > 0) {
          break;
        }
        container = null;
      }
    }
    
    if (!container) {
      return propertyDetails;
    }
    
    // Find all items in the grid (each item is a div with flex-col classes)
    const items = container.querySelectorAll('div[class*="flex"][class*="flex-col"]');
    
    items.forEach((item) => {
      // Extract label from span with classes: text-[10px] md:text-xs text-secondary-60
      const labelElement = item.querySelector('span[class*="text-secondary-60"]');
      
      if (!labelElement) {
        return;
      }
      
      const label = labelElement.textContent.trim();
      if (!label) {
        return;
      }
      
      // Extract value - try desktop version first (hidden on mobile, visible on desktop)
      let valueElement = item.querySelector('span[class*="mt-0.5"][class*="hidden"][class*="md:block"][class*="text-sm"][class*="font-tbcx-medium"]');
      
      // If not found, try mobile version (visible on mobile, hidden on desktop)
      if (!valueElement) {
        valueElement = item.querySelector('span[class*="block"][class*="md:hidden"][class*="text-[10px]"][class*="font-tbcx-medium"]');
      }
      
      // Fallback: look for any span with font-tbcx-medium class
      if (!valueElement) {
        valueElement = item.querySelector('span[class*="font-tbcx-medium"]');
      }
      
      if (valueElement) {
        const value = valueElement.textContent.trim();
        if (value) {
          // Convert specific numeric fields to numbers
          const numericFields = ['ოთახი', 'საძინებელი', 'ფართი'];
          
          if (numericFields.includes(label)) {
            // Remove the last symbol and extract numeric value
            let cleanedValue = value.trim();
            
            // Remove the last character if it's not a digit (handles units like "²", "მ", etc.)
            if (cleanedValue.length > 0 && !/\d/.test(cleanedValue[cleanedValue.length - 1])) {
              cleanedValue = cleanedValue.slice(0, -1).trim();
            }
            
            // Extract only digits, dots, and commas, then convert comma to dot
            cleanedValue = cleanedValue.replace(/[^\d.,]/g, '').replace(',', '.');
            const numericValue = parseFloat(cleanedValue);
            
            if (!isNaN(numericValue)) {
              propertyDetails[label] = numericValue;
            } else {
              // If conversion fails, keep original value
              propertyDetails[label] = value;
            }
          } else {
            // Use label as key (keeping Georgian text as-is) for non-numeric fields
            propertyDetails[label] = value;
          }
        }
      }
    });
    
    return propertyDetails;
  };

  /**
   * Detects deal type by searching for specific Georgian words in the page
   * @returns {string|null} The deal type found or null
   */
  const detectDealType = () => {
    const dealTypes = [
      'ქირავდება დღიურად', // Check longest first
      'ქირავდება',
      'გირავდება',
      'იყიდება'
    ];
    
    // Get all text content from the page
    const pageText = document.body.textContent || document.body.innerText || '';
    
    // Search for each deal type (check longer phrases first)
    for (const dealType of dealTypes) {
      if (pageText.includes(dealType)) {
        return dealType;
      }
    }
    
    return null;
  };

  const galleryImages = collectGalleryImages();
  const additionalParameters = collectAdditionalParameters();
  const furnitureItems = collectFurnitureItems();
  const propertyDetails = collectPropertyDetails();
  const dealType = detectDealType();
  const shortDescription = collectShortDescription();

  /**
   * Transforms address format from "გლდანი - ა მ/რ" to "ა მიკრორაიონი - გლდანი"
   * Handles patterns like:
   * - "გლდანი - ა მ/რ" → "ა მიკრორაიონი - გლდანი"
   * - "გლდანი - V მ/რ" → "V მიკრორაიონი - გლდანი"
   * - "გლდანი - III ა მ/რ" → "III ა მიკრორაიონი - გლდანი"
   * @param {string} address - The original address
   * @returns {string} The transformed address or original if pattern doesn't match
   */
  const transformAddress = (address) => {
    if (!address) {
      return address;
    }

    // Pattern: "{district} - {microdistrict} მ/რ"
    // Match pattern: district - microdistrict მ/რ
    const pattern = /^(.+?)\s*-\s*(.+?)\s*მ\/რ$/;
    const match = address.match(pattern);

    if (match) {
      const district = match[1].trim(); // e.g., "გლდანი"
      const microdistrict = match[2].trim(); // e.g., "ა", "V", "III ა"
      
      // Transform to: "{microdistrict} მიკრორაიონი - {district}"
      return `${microdistrict} მიკრორაიონი - ${district}`;
    }

    // If pattern doesn't match, return original address
    return address;
  };

  // Scrape address from mappings (only mapping still needed)
  const address = scrapeMappedAttribute('address');
  
  // Add address to propertyDetails if available (with transformation)
  if (address) {
    propertyDetails['მისამართი'] = transformAddress(address);
  }

  /**
   * Parses a price string containing currency symbols and various separators.
   * Handles formats like "105,000", "105.000", "105,000.50", "105.000,50", "105 000 ₾".
   */
  const parsePriceText = (text) => {
    if (!text) return null;

    // Keep only digits and separators, drop currency and other symbols/spaces
    let value = text.replace(/[\s\u00A0]/g, '').replace(/[^\d.,]/g, '');
    if (!value) return null;

    const hasComma = value.includes(',');
    const hasDot = value.includes('.');

    // Helper to parse after replacements
    const toNumber = (str) => {
      const num = parseFloat(str);
      return isNaN(num) ? null : num;
    };

    if (hasComma && hasDot) {
      // Decide decimal separator by the rightmost separator
      if (value.lastIndexOf('.') > value.lastIndexOf(',')) {
        // Comma as thousands, dot as decimal: 105,000.50
        return toNumber(value.replace(/,/g, ''));
      }
      // Dot as thousands, comma as decimal: 105.000,50
      return toNumber(value.replace(/\./g, '').replace(',', '.'));
    }

    if (hasComma) {
      const parts = value.split(',');
      const last = parts[parts.length - 1];
      if (last.length === 3 && parts.length > 1) {
        // Comma used as thousands separator
        return toNumber(value.replace(/,/g, ''));
      }
      if (last.length <= 2) {
        // Comma used as decimal separator
        return toNumber(value.replace(',', '.'));
      }
      // Fallback: remove commas
      return toNumber(value.replace(/,/g, ''));
    }

    if (hasDot) {
      const parts = value.split('.');
      const last = parts[parts.length - 1];
      if (last.length === 3 && parts.length > 1) {
        // Dot used as thousands separator
        return toNumber(value.replace(/\./g, ''));
      }
      // Dot as decimal separator
      return toNumber(value);
    }

    // Only digits remaining
    return toNumber(value);
  };

  // Extract price and add to propertyDetails
  const priceText = getFirstTextMatch([
    "[data-testid='listing-price']",
    ".text-2xl.font-tbcx-bold",
  ]);
  
  if (priceText) {
    const priceNumber = parsePriceText(priceText);
    if (priceNumber !== null) {
      propertyDetails['ფასი'] = priceNumber;
    }
  }

  // Add short description if available
  if (shortDescription) {
    propertyDetails['მოკლე აღწერა'] = shortDescription;
    propertyDetails.shortDescription = shortDescription;
  }

  return {
    scrapedAt: new Date().toISOString(),
    url: location.href,
    propertyDetails: propertyDetails,
    images: galleryImages,
    furniture: furnitureItems,
    additionalParameters: additionalParameters,
    dealType: dealType,
  };
}

// Make function available globally when injected as file (must be before export)
// This code runs when the file is injected into a page context
if (typeof window !== 'undefined') {
  window.scrapeListingFromDom = scrapeListingFromDom;
  console.log('[scraper-file] scrapeListingFromDom attached to window');
}

// Export for ES modules (when imported)
// Note: This will cause an error when file is injected, but the function
// is already on window, so execution should continue
export { scrapeListingFromDom };

