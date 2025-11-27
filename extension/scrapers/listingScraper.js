export function scrapeListingFromDom(mappings = {}) {
  const FALLBACK_DESCRIPTION_SELECTORS = [
    ".description",
    ".listing-description",
    "[data-testid='listing-description']",
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

  // Extract price and add to propertyDetails
  const priceText = getFirstTextMatch([
    "[data-testid='listing-price']",
    ".text-2xl.font-tbcx-bold",
  ]);
  
  if (priceText) {
    // Remove the last symbol and convert to number
    const priceWithoutLastSymbol = priceText.trim().slice(0, -1);
    // Remove any spaces and non-numeric characters except decimal point
    const cleanedPrice = priceWithoutLastSymbol.replace(/[^\d.,]/g, '').replace(',', '.');
    const priceNumber = parseFloat(cleanedPrice);
    
    if (!isNaN(priceNumber)) {
      propertyDetails['ფასი'] = priceNumber;
    }
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
