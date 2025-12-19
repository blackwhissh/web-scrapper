/**
 * Finds the category element using multiple strategies
 * @returns {HTMLElement|null} The category element or null if not found
 */
function findCategoryElement() {
  let categoryElement = null;
  
  // Strategy 1: Try the original selector (if the hash class still exists)
  const container = document.querySelector('#create-app-type');
  if (container) {
    // Strategy 2: Look for any clickable elements within the container
    const allElements = container.querySelectorAll('*');
    categoryElement = Array.from(allElements).find(el => {
      const text = el.textContent || '';
      return text.includes('უძრავი ქონება') && 
             (el.tagName === 'BUTTON' || 
              el.tagName === 'DIV' || 
              el.onclick !== null ||
              el.style.cursor === 'pointer' ||
              window.getComputedStyle(el).cursor === 'pointer');
    });
    
    // Strategy 3: If still not found, look for any element with the text (more permissive)
    if (!categoryElement) {
      categoryElement = Array.from(allElements).find(el => {
        const text = el.textContent || '';
        return text.trim() === 'უძრავი ქონება' || text.includes('უძრავი ქონება');
      });
    }
  }
  
  // Strategy 4: Fallback - search entire document for the text
  if (!categoryElement) {
    const allClickable = Array.from(document.querySelectorAll('button, div[role="button"], div[onclick], [data-testid*="category"]'));
    categoryElement = allClickable.find(el => {
      const text = el.textContent || '';
      return text.includes('უძრავი ქონება');
    });
  }
  
  return categoryElement;
}

/**
 * Autofills a listing form with scraped data
 * @param {Object} listingData - The scraped listing data
 */
function autofillListingForm(listingData) {
  if (!listingData) {
    throw new Error('No listing data provided');
  }

  const { propertyDetails, furniture, additionalParameters, dealType, images } = listingData;

  // Step 1: Select category - "უძრავი ქონება" (Real Estate)
  // Try to find the category element with retry mechanism (in case page is still loading)
  let categoryElement = findCategoryElement();
  
  // If not found immediately, wait a bit and try again (up to 3 times)
  let retryCount = 0;
  const maxRetries = 3;
  
  const trySelectCategory = () => {
    categoryElement = findCategoryElement();
  
  if (categoryElement) {
      console.log('[Autofill] Found category element:', categoryElement);
    categoryElement.click();
    // Wait a bit for the next section to appear
    setTimeout(() => {
      selectPropertyType(propertyDetails, furniture, additionalParameters, dealType, images);
    }, 500);
    } else if (retryCount < maxRetries) {
      retryCount++;
      console.log(`[Autofill] Category element not found, retrying... (${retryCount}/${maxRetries})`);
      setTimeout(trySelectCategory, 500);
  } else {
      console.error('[Autofill] Could not find category element after', maxRetries, 'retries');
      console.error('[Autofill] Container #create-app-type exists:', !!document.querySelector('#create-app-type'));
      const container = document.querySelector('#create-app-type');
      if (container) {
        console.error('[Autofill] Available text in container:', container.textContent?.substring(0, 500));
      }
      throw new Error('Could not find category element "უძრავი ქონება". Please ensure you are on the correct form page and it has fully loaded.');
    }
  };
  
  trySelectCategory();
}

/**
 * Finds the property type element using multiple strategies
 * @param {string} propertyTypeText - The property type text to search for (e.g., "ბინა", "კერძო სახლი")
 * @returns {HTMLElement|null} The property type element or null if not found
 */
function findPropertyTypeElement(propertyTypeText) {
  let typeElement = null;
  
  // Strategy 1: Look for container with class sc-dcc3c3bd-2 (parent of options)
  const optionsContainer = document.querySelector('.sc-dcc3c3bd-2, [class*="sc-dcc3c3bd-2"]');
  if (optionsContainer) {
    // Look for divs with the specific class pattern (sc-dcc3c3bd-3 dyjMDI)
    const optionDivs = optionsContainer.querySelectorAll('div[class*="sc-dcc3c3bd-3"], div[class*="dyjMDI"]');
    typeElement = Array.from(optionDivs).find(el => {
      const text = el.textContent || '';
      return text.includes(propertyTypeText);
    });
    
    // If not found with class pattern, search all divs in container
    if (!typeElement) {
      const allDivs = optionsContainer.querySelectorAll('div');
      typeElement = Array.from(allDivs).find(el => {
        const text = el.textContent || '';
        // Make sure we're selecting the option div, not a parent container
        // Option divs typically have shorter text content
        return text.includes(propertyTypeText) && 
               text.trim().length < 50 && 
               el !== optionsContainer;
      });
    }
  }
  
  // Strategy 2: Look within the type container (#create-app-type)
  if (!typeElement) {
    const typeContainer = document.querySelector('#create-app-type');
    if (typeContainer) {
      // Look for divs with class pattern
      const optionDivs = typeContainer.querySelectorAll('div[class*="sc-dcc3c3bd-3"], div[class*="dyjMDI"]');
      typeElement = Array.from(optionDivs).find(el => {
        const text = el.textContent || '';
        return text.includes(propertyTypeText);
      });
      
      // Look for any div within the container
      if (!typeElement) {
        const allDivs = typeContainer.querySelectorAll('div');
        typeElement = Array.from(allDivs).find(el => {
          const text = el.textContent || '';
          // Filter out parent containers - they have longer text
          return text.includes(propertyTypeText) && 
                 text.trim().length < 100 &&
                 el !== typeContainer;
        });
      }
    }
  }
  
  // Strategy 3: Search entire document for divs with the class pattern
  if (!typeElement) {
    const allOptionDivs = document.querySelectorAll('div[class*="dyjMDI"], div[class*="sc-dcc3c3bd-3"]');
    typeElement = Array.from(allOptionDivs).find(el => {
      const text = el.textContent || '';
      return text.includes(propertyTypeText);
    });
  }
  
  // Strategy 4: Fallback - search for any clickable div containing the text
  if (!typeElement) {
    const allDivs = Array.from(document.querySelectorAll('div'));
    typeElement = allDivs.find(el => {
      const text = el.textContent || '';
      const isClickable = window.getComputedStyle(el).cursor === 'pointer' ||
                         el.onclick !== null ||
                         el.getAttribute('role') === 'button';
      return text.includes(propertyTypeText) && 
             text.trim().length < 50 &&
             isClickable;
    });
  }
  
  return typeElement;
}

/**
 * Selects the property type based on scraped data
 * @param {Object} propertyDetails - Property details from scraped data
 * @param {Array} furniture - Furniture items
 * @param {Object} additionalParameters - Additional parameters
 * @param {string} dealType - Deal type from scraped data
 * @param {Array} images - Array of image URLs
 */
function selectPropertyType(propertyDetails, furniture, additionalParameters, dealType, images) {
  // Determine property type from scraped data
  // Default to "ბინა" (Apartment) if we can't determine
  let propertyType = 'ბინა'; // Default to apartment
  
  // You can add logic here to determine type from propertyDetails
  // For example, if propertyDetails contains certain keywords
  
  // Try to find the property type element with retry mechanism
  let typeElement = findPropertyTypeElement(propertyType);
  
  let retryCount = 0;
  const maxRetries = 3;
  
  const trySelectPropertyType = () => {
    typeElement = findPropertyTypeElement(propertyType);
  
  if (typeElement) {
      console.log('[Autofill] Found property type element:', typeElement);
      console.log('[Autofill] Element text:', typeElement.textContent);
      console.log('[Autofill] Element classes:', typeElement.className);
      
      // Click the element
    typeElement.click();
      
    // Wait a bit for the deal type section to appear
    setTimeout(() => {
      selectDealType(propertyDetails, furniture, additionalParameters, dealType, images);
    }, 500);
    } else if (retryCount < maxRetries) {
      retryCount++;
      console.log(`[Autofill] Property type element not found, retrying... (${retryCount}/${maxRetries})`);
      setTimeout(trySelectPropertyType, 500);
  } else {
      console.error('[Autofill] Could not find property type element after', maxRetries, 'retries');
      console.error('[Autofill] Looking for property type:', propertyType);
      console.error('[Autofill] Container #create-app-type exists:', !!document.querySelector('#create-app-type'));
      const typeContainer = document.querySelector('#create-app-type');
      if (typeContainer) {
        console.error('[Autofill] Available text in container:', typeContainer.textContent?.substring(0, 500));
        console.error('[Autofill] Available divs:', Array.from(typeContainer.querySelectorAll('div')).map(d => ({
          text: d.textContent?.substring(0, 50),
          classes: d.className
        })));
      }
      throw new Error(`Could not find property type element "${propertyType}". The form may have changed or not loaded yet.`);
    }
  };
  
  trySelectPropertyType();
}

/**
 * Finds the deal type element using multiple strategies
 * @param {string} dealTypeText - The deal type text to search for (e.g., "იყიდება", "ქირავდება")
 * @returns {HTMLElement|null} The deal type element or null if not found
 */
function findDealTypeElement(dealTypeText) {
  let dealTypeElement = null;
  
  // Strategy 1: Look for container with similar class pattern as property type (sc-dcc3c3bd-2)
  // Deal type options might use the same or similar container structure
  const dealTypeContainers = document.querySelectorAll('.sc-dcc3c3bd-2, [class*="sc-dcc3c3bd-2"], #create-dealType-block ~ div[class*="sc-"]');
  for (const container of Array.from(dealTypeContainers)) {
    // Look for divs with the specific class pattern (sc-dcc3c3bd-3 dyjMDI)
    const optionDivs = container.querySelectorAll('div[class*="sc-dcc3c3bd-3"], div[class*="dyjMDI"]');
    dealTypeElement = Array.from(optionDivs).find(el => {
      const text = el.textContent || '';
      return text.includes(dealTypeText);
    });
    
    if (dealTypeElement) break;
    
    // If not found with class pattern, search all divs in container
    const allDivs = container.querySelectorAll('div');
    dealTypeElement = Array.from(allDivs).find(el => {
      const text = el.textContent || '';
      // Make sure we're selecting the option div, not a parent container
      return text.includes(dealTypeText) && 
             text.trim().length < 50 && 
             el !== container;
    });
    
    if (dealTypeElement) break;
  }
  
  // Strategy 2: Look for the deal type block container and search within it
  if (!dealTypeElement) {
    const dealTypeBlock = document.querySelector('#create-dealType-block');
    if (dealTypeBlock) {
      // Search in the parent container (often the deal type options are siblings)
      const parent = dealTypeBlock.parentElement;
      if (parent) {
        const allElements = parent.querySelectorAll('*');
        dealTypeElement = Array.from(allElements).find(el => {
          const text = el.textContent || '';
          return text.includes(dealTypeText) && 
                 (el.tagName === 'BUTTON' || 
                  el.tagName === 'DIV' || 
                  el.onclick !== null ||
                  window.getComputedStyle(el).cursor === 'pointer');
        });
      }
      
      // Search within the deal type block itself
      if (!dealTypeElement) {
        const elementsInBlock = dealTypeBlock.querySelectorAll('*');
        dealTypeElement = Array.from(elementsInBlock).find(el => {
          const text = el.textContent || '';
          return text.includes(dealTypeText) && 
                 (el.tagName === 'BUTTON' || 
                  el.tagName === 'DIV' || 
                  el.onclick !== null ||
                  window.getComputedStyle(el).cursor === 'pointer');
        });
      }
      
      // Find the container that comes after the deal type block
      if (!dealTypeElement) {
        let container = dealTypeBlock.nextElementSibling;
        if (container) {
          const allElements = container.querySelectorAll('*');
          dealTypeElement = Array.from(allElements).find(el => {
            const text = el.textContent || '';
            return text.includes(dealTypeText) && 
                   (el.tagName === 'BUTTON' || 
                    el.tagName === 'DIV' || 
                    el.onclick !== null ||
                    window.getComputedStyle(el).cursor === 'pointer');
          });
        }
      }
      
      // Search all siblings after the deal type block
      if (!dealTypeElement) {
        let nextSibling = dealTypeBlock.nextElementSibling;
        let searchDepth = 0;
        while (nextSibling && searchDepth < 5) {
          const allElements = nextSibling.querySelectorAll ? nextSibling.querySelectorAll('*') : [];
          dealTypeElement = Array.from(allElements).find(el => {
            const text = el.textContent || '';
            return text.includes(dealTypeText) && text.trim().length < 50;
          });
          if (dealTypeElement) break;
          nextSibling = nextSibling.nextElementSibling;
          searchDepth++;
        }
      }
    }
  }
  
  // Strategy 3: Search for elements by looking for common deal type keywords (document-wide)
  if (!dealTypeElement) {
    const dealTypeKeywords = ['იყიდება', 'ქირავდება', 'გირავდება'];
    const matchingKeyword = dealTypeKeywords.find(keyword => dealTypeText.includes(keyword) || keyword.includes(dealTypeText));
    
    if (matchingKeyword) {
      // First try divs with the class pattern
      const allOptionDivs = document.querySelectorAll('div[class*="dyjMDI"], div[class*="sc-dcc3c3bd-3"]');
      dealTypeElement = Array.from(allOptionDivs).find(el => {
        const text = el.textContent || '';
        return text.includes(matchingKeyword);
      });
      
      // Fallback to any clickable element
      if (!dealTypeElement) {
        const allClickable = Array.from(document.querySelectorAll('button, div[role="button"], div[onclick], [data-testid*="deal"]'));
        dealTypeElement = allClickable.find(el => {
          const text = el.textContent || '';
          return text.includes(matchingKeyword) && text.trim().length < 50;
        });
      }
    }
  }
  
  // Strategy 4: Fallback - search entire document for the deal type text
  if (!dealTypeElement) {
    const allDivs = Array.from(document.querySelectorAll('div'));
    dealTypeElement = allDivs.find(el => {
      const text = el.textContent || '';
      const isClickable = window.getComputedStyle(el).cursor === 'pointer' ||
                         el.onclick !== null ||
                         el.getAttribute('role') === 'button';
      return text.includes(dealTypeText) && 
             text.trim().length < 50 &&
             isClickable;
    });
  }
  
  return dealTypeElement;
}

/**
 * Selects the deal type (For Sale / For Rent)
 * @param {Object} propertyDetails - Property details from scraped data
 * @param {Array} furniture - Furniture items
 * @param {Object} additionalParameters - Additional parameters
 * @param {string} scrapedDealType - Deal type from scraped data
 * @param {Array} images - Array of image URLs
 */
function selectDealType(propertyDetails, furniture, additionalParameters, scrapedDealType, images) {
  // Use scraped deal type, or default to "იყიდება" (For Sale)
  // Map common variations to standard form
  let dealType = scrapedDealType || 'იყიდება';
  
  // Normalize deal type - handle variations like "ქირავდება დღიურად" -> "ქირავდება"
  if (dealType.includes('ქირავდება')) {
    dealType = 'ქირავდება';
  } else if (dealType.includes('იყიდება')) {
    dealType = 'იყიდება';
  } else if (dealType.includes('გირავდება')) {
    dealType = 'გირავდება';
  }
  
  // Try to find the deal type element with retry mechanism
  let dealTypeElement = findDealTypeElement(dealType);
  
  let retryCount = 0;
  const maxRetries = 3;
  
  const trySelectDealType = () => {
    dealTypeElement = findDealTypeElement(dealType);
  
  if (dealTypeElement) {
      console.log('[Autofill] Found deal type element:', dealTypeElement);
      console.log('[Autofill] Element text:', dealTypeElement.textContent);
      console.log('[Autofill] Element classes:', dealTypeElement.className);
    dealTypeElement.click();
    // Wait for the form fields to appear
    setTimeout(() => {
        // Step 1: Upload images (after deal type)
        uploadImages(images);
        
        // Step 2: Fill location (address) first
        setTimeout(() => {
          fillLocation(propertyDetails);
    }, 1000);
        
        // Step 3: Fill other fields after location with delay
        setTimeout(() => {
          fillRemainingFields(propertyDetails, furniture, additionalParameters);
        }, 2500);
      }, 1000);
    } else if (retryCount < maxRetries) {
      retryCount++;
      console.log(`[Autofill] Deal type element not found, retrying... (${retryCount}/${maxRetries})`);
      setTimeout(trySelectDealType, 500);
  } else {
      console.error('[Autofill] Could not find deal type element after', maxRetries, 'retries');
      console.error('[Autofill] Looking for deal type:', dealType);
      console.error('[Autofill] Deal type block exists:', !!document.querySelector('#create-dealType-block'));
      const dealTypeBlock = document.querySelector('#create-dealType-block');
      if (dealTypeBlock) {
        console.error('[Autofill] Next sibling:', dealTypeBlock.nextElementSibling);
        console.error('[Autofill] Available text near block:', dealTypeBlock.textContent?.substring(0, 500));
        // Log all containers with sc-dcc3c3bd-2 class
        const containers = document.querySelectorAll('.sc-dcc3c3bd-2, [class*="sc-dcc3c3bd-2"]');
        console.error('[Autofill] Found containers with sc-dcc3c3bd-2:', containers.length);
        Array.from(containers).forEach((container, idx) => {
          console.error(`[Autofill] Container ${idx} text:`, container.textContent?.substring(0, 200));
        });
      }
      
      // Try alternative deal types as fallback
      const alternatives = dealType === 'იყიდება' ? ['ქირავდება'] : ['იყიდება'];
      for (const alt of alternatives) {
        const altElement = findDealTypeElement(alt);
        if (altElement) {
          console.warn(`[Autofill] Found alternative deal type "${alt}", using it instead`);
          altElement.click();
          setTimeout(() => {
            // Step 1: Upload images (after deal type)
            uploadImages(images);
            
            // Step 2: Fill location (address) first
            setTimeout(() => {
              fillLocation(propertyDetails);
            }, 1000);
            
            // Step 3: Fill other fields after location with delay
            setTimeout(() => {
              fillRemainingFields(propertyDetails, furniture, additionalParameters);
            }, 2500);
          }, 1000);
          return;
        }
      }
      
      throw new Error(`Could not find deal type element "${dealType}". Please ensure the form has fully loaded.`);
    }
  };
  
  trySelectDealType();
}

/**
 * Fills the rooms field
 * @param {Object} propertyDetails - Property details from scraped data
 */
function fillRoomsField(propertyDetails) {
  if (!propertyDetails || !propertyDetails['ოთახი']) {
    return;
  }
  
  const roomValue = propertyDetails['ოთახი'];
  // Normalize room value - if it's greater than 8, use "8+"
  let roomText = roomValue.toString().trim();
  const roomNumber = parseFloat(roomValue);
  if (!isNaN(roomNumber) && roomNumber > 8) {
    roomText = '8+';
  }
  
  // Try to find the room-input container and select the option
  const roomInputContainer = document.querySelector('#room-input');
  if (roomInputContainer) {
    // Look for divs with class sc-9e0391b6-0 yrPxb that contain the room number
    const optionDivs = roomInputContainer.querySelectorAll('div[class*="sc-9e0391b6-0"], div[class*="yrPxb"]');
    let matchingOption = Array.from(optionDivs).find(div => {
      const text = (div.textContent || '').trim();
      return text === roomText;
    });
    
    // If no exact match, try to find by number
    if (!matchingOption) {
      matchingOption = Array.from(optionDivs).find(div => {
        const text = (div.textContent || '').trim();
        return text.includes(roomText) || roomText.includes(text);
      });
    }
    
    if (matchingOption) {
      console.log('[Autofill] Found room option:', matchingOption.textContent.trim(), 'for value:', roomText);
      matchingOption.click();
      const changeEvent = new Event('change', { bubbles: true });
      roomInputContainer.dispatchEvent(changeEvent);
    } else {
      console.warn('[Autofill] Could not find room option for:', roomText);
    }
  } else {
    // Fallback: try traditional input field
    const roomsField = document.querySelector('input[name="rooms"], input[placeholder*="ოთახი"], #rooms');
    if (roomsField) {
      roomsField.value = propertyDetails['ოთახი'];
      roomsField.dispatchEvent(new Event('input', { bubbles: true }));
      roomsField.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}

/**
 * Fills the area field
 * @param {Object} propertyDetails - Property details from scraped data
 */
function fillAreaField(propertyDetails) {
  if (!propertyDetails || !propertyDetails['ფართი']) {
    return;
  }
  
  const areaField = document.querySelector('input[name="area"], input[placeholder*="ფართი"], #area');
  if (areaField) {
    areaField.value = propertyDetails['ფართი'];
    areaField.dispatchEvent(new Event('input', { bubbles: true }));
    areaField.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

/**
 * Fills the price field
 * @param {Object} propertyDetails - Property details from scraped data
 */
function fillPriceField(propertyDetails) {
  const price = propertyDetails?.['ფასი'];
  if (price === undefined || price === null) {
    return;
  }

  const priceValue = price.toString();

  // Prefer USD input (right-hand, $) inside the price container
  const priceContainer = document.querySelector('#create-app-price > div.sc-c963185b-2.fuFvYb') ||
                         document.querySelector('#create-app-price');

  const fillInputValue = (targetInput) => {
    targetInput.value = priceValue;
    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
    targetInput.dispatchEvent(new Event('change', { bubbles: true }));
  };

  if (priceContainer) {
    const labels = Array.from(priceContainer.querySelectorAll('label'));

    // Prefer label whose child contains "$"
    let usdLabel = labels.find(label =>
      Array.from(label.querySelectorAll('*')).some(node => (node.textContent || '').includes('$'))
    );
    if (!usdLabel && labels.length >= 2) {
      usdLabel = labels[1]; // assume right-hand label is USD
    }

    if (usdLabel) {
      usdLabel.click();

      let attempts = 0;
      const tryActive = () => {
        const activeUsdInput = priceContainer.querySelector('label.active input[type="text"]');
        attempts += 1;
        if (activeUsdInput) {
          console.log('[Autofill] Price active USD input found on attempt', attempts);
          fillInputValue(activeUsdInput);
          return;
        }
        if (attempts < 4) {
          setTimeout(tryActive, 120);
        } else {
          const fallbackInput = usdLabel.querySelector('input[type="text"]') || usdLabel.querySelector('input');
          if (fallbackInput) {
            console.log('[Autofill] Price fallback using USD label input');
            fillInputValue(fallbackInput);
          } else {
            console.warn('[Autofill] USD input not found after retries');
          }
        }
      };

      tryActive();
      return;
    }
  }

  console.warn('[Autofill] Price USD label/input not found');
}

/**
 * Fills the floor field
 * @param {Object} propertyDetails - Property details from scraped data
 */
function fillFloorField(propertyDetails) {
  if (!propertyDetails || !propertyDetails['სართული']) {
    return;
  }
  
  // Find the first input field (სართული) - it has name="floor" and placeholder="სართული"
    const floorField = document.querySelector('input[name="floor"], input[placeholder*="სართული"], #floor');
    if (floorField) {
    // Parse floor from format like "2 / 12" - get the first number
    const floorStr = propertyDetails['სართული'].toString();
    const floorValue = floorStr.includes('/') ? floorStr.split('/')[0].trim() : floorStr.trim();
    
    console.log('[Autofill] Filling floor field with:', floorValue);
      floorField.value = floorValue;
      floorField.dispatchEvent(new Event('input', { bubbles: true }));
      floorField.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('[Autofill] ✅ Floor field filled successfully');
  } else {
    console.warn('[Autofill] Could not find floor input field (name="floor")');
  }
}

/**
 * Fills the total floor numbers field (სართულიანობა)
 * @param {Object} propertyDetails - Property details from scraped data
 */
function fillTotalFloorField(propertyDetails) {
  if (!propertyDetails || !propertyDetails['სართული']) {
    return;
  }
  
  // Parse total floors from format like "2 / 12" - the second part
  const floorStr = propertyDetails['სართული'].toString();
  if (floorStr.includes('/')) {
    const parts = floorStr.split('/');
    const totalFloors = parts[1]?.trim();
    
    if (totalFloors) {
      console.log('[Autofill] Filling total floors field with:', totalFloors);
      
      // Find the second input field (სართულიანობა) - it has name="floors" and placeholder="სართულიანობა"
      const totalFloorField = document.querySelector('input[name="floors"], input[placeholder*="სართულიანობა"], input[name="totalFloors"]');
      
      if (totalFloorField) {
        totalFloorField.value = totalFloors;
        totalFloorField.dispatchEvent(new Event('input', { bubbles: true }));
        totalFloorField.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('[Autofill] ✅ Total floors field filled successfully');
      } else {
        console.warn('[Autofill] Could not find total floors input field (name="floors" or placeholder="სართულიანობა")');
      }
    } else {
      console.warn('[Autofill] Could not parse total floors from:', floorStr);
    }
  } else {
    console.log('[Autofill] Floor data does not contain "/" separator, skipping total floors');
  }
}

/**
 * Fills the project type field (პროექტის ტიპი)
 * @param {Object} propertyDetails - Property details from scraped data
 * @param {Object} additionalParameters - Additional parameters from scraped data
 */
function fillProjectTypeField(propertyDetails, additionalParameters) {
  const projectValue = propertyDetails?.['პროექტის ტიპი'] ||
                       propertyDetails?.['type_of_project'] ||
                       propertyDetails?.['ProjectType'] ||
                       additionalParameters?.['პროექტის ტიპი'] ||
                       additionalParameters?.['type_of_project'] ||
                       additionalParameters?.['ProjectType'];

  if (!projectValue) {
    console.log('[Autofill] No project type value found for project type field');
    return;
  }

  const normalizeText = (value) => (value || '').toString().trim().toLowerCase();
  const projectText = normalizeText(projectValue);

  const findProjectTypeContainer = () => {
    // Primary selector provided by the UI structure
    const direct = document.querySelector('#create-app-details > div.sc-e8a87f7a-0.dMKNFB > div:nth-child(9)');
    if (direct) return direct;

    // Fallback: same structure but allow hashed class name variations
    const detailsRoot = document.querySelector('#create-app-details');
    if (detailsRoot) {
      const hashed = detailsRoot.querySelector('div.sc-e8a87f7a-0.dMKNFB > div:nth-child(9)') ||
                     detailsRoot.querySelector('div[class*="sc-e8a87f7a-0"] > div:nth-child(9)');
      if (hashed) return hashed;
    }

    // Fallback: locate by label text and climb to the nearest container
    const labelEl = Array.from(document.querySelectorAll('span, p, div')).find(el => {
      const text = (el.textContent || '').trim();
      return text.includes('პროექტის ტიპი');
    });

    if (labelEl) {
      const labeledContainer = labelEl.closest('.sc-e8a87f7a-0, .sc-e8a87f7a-1, [class*="sc-e8a87f7a-0"], [class*="sc-e8a87f7a-1"], .dMKNFB, [class*="dMKNFB"]');
      if (labeledContainer) return labeledContainer;
      if (labelEl.parentElement) return labelEl.parentElement;
    }

    // Fallback: search within the details section for any div containing the label text
    if (detailsRoot) {
      const candidate = Array.from(detailsRoot.querySelectorAll('div')).find(div => {
        const text = (div.textContent || '').trim();
        return text.includes('პროექტის ტიპი');
      });
      if (candidate) return candidate;
    }

    // Last resort: document-wide search for a container that mentions the label
    return Array.from(document.querySelectorAll('div[class*="sc-e8a87f7a-0"], div[class*="dMKNFB"]')).find(div => {
      const text = (div.textContent || '').trim();
      return text.includes('პროექტის ტიპი');
    }) || null;
  };

  const projectContainer = findProjectTypeContainer();

  if (projectContainer) {
    const optionDivs = projectContainer.querySelectorAll('div[class*="sc-9e0391b6-0"], div[class*="yrPxb"], div[role="button"], button, p');
    let matchingOption = Array.from(optionDivs).find(option => {
      const text = normalizeText(option.textContent);
      return text === projectText || text.includes(projectText) || projectText.includes(text);
    });

    if (!matchingOption) {
      // Try any clickable element inside the container
      const clickableCandidates = projectContainer.querySelectorAll('div, button');
      matchingOption = Array.from(clickableCandidates).find(option => {
        const text = normalizeText(option.textContent);
        const isClickable = window.getComputedStyle(option).cursor === 'pointer' ||
                            option.onclick !== null ||
                            option.getAttribute('role') === 'button';
        return isClickable && text && (text === projectText || text.includes(projectText) || projectText.includes(text));
      });
    }

    if (matchingOption) {
      console.log('[Autofill] Found project type option:', matchingOption.textContent.trim());
      matchingOption.click();
      const changeEvent = new Event('change', { bubbles: true });
      projectContainer.dispatchEvent(changeEvent);
      return;
    }

    console.warn('[Autofill] Could not find project type option for:', projectValue);
  }

  // Fallback: try traditional input/select field
  const projectField = findFieldByLabel('პროექტის ტიპი');
  if (projectField) {
    console.log('[Autofill] Fallback filling project type via input/select');
    if (projectField.tagName === 'SELECT') {
      const option = Array.from(projectField.options).find(opt => {
        const text = normalizeText(opt.textContent);
        return text === projectText || text.includes(projectText) || projectText.includes(text);
      });
      if (option) {
        projectField.value = option.value;
        projectField.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
    }

    projectField.value = projectValue;
    projectField.dispatchEvent(new Event('input', { bubbles: true }));
    projectField.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    console.warn('[Autofill] Project type container/field not found');
  }
}

/**
 * Fills the location (address) field
 * @param {Object} propertyDetails - Property details from scraped data
 */
function fillLocation(propertyDetails) {
  console.log('[Autofill] Filling location (address)...');
  
  // Address field (if there's a direct address field)
  if (propertyDetails && propertyDetails['მისამართი']) {
    const addressField = document.querySelector('input[name="address"], input[placeholder*="მისამართი"], textarea[name="address"]');
    if (addressField) {
      // Address is already transformed during scraping
      addressField.value = propertyDetails['მისამართი'];
      addressField.dispatchEvent(new Event('input', { bubbles: true }));
      addressField.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Fill location form (city, street, house number)
    fillLocationForm(propertyDetails['მისამართი']);
  }
  
  console.log('[Autofill] Location filling completed');
}

/**
 * Fills the remaining form fields in the specified order
 * @param {Object} propertyDetails - Property details
 * @param {Array} furniture - Furniture items
 * @param {Object} additionalParameters - Additional parameters
 */
function fillRemainingFields(propertyDetails, furniture, additionalParameters) {
  console.log('[Autofill] Filling remaining fields...');
  
  // Order: rooms, bedrooms, area, floor, total floor, bathroom, status, condition, other info, description
  
  // 1. Price
  fillPriceField(propertyDetails);

  // 2. Rooms field
  fillRoomsField(propertyDetails);
  
  // 3. Bedrooms field
  setTimeout(() => {
    fillBedroomField(propertyDetails);
  }, 300);
  
  // 4. Area field
  setTimeout(() => {
    fillAreaField(propertyDetails);
  }, 600);
  
  // 5. Floor field
  setTimeout(() => {
    fillFloorField(propertyDetails);
  }, 900);
  
  // 6. Total floor numbers
  setTimeout(() => {
    fillTotalFloorField(propertyDetails);
  }, 1200);
  
  // 7. Project type field (პროექტის ტიპი)
  setTimeout(() => {
    fillProjectTypeField(propertyDetails, additionalParameters);
  }, 1500);

  // 8. Bathroom field - with retry mechanism
  setTimeout(() => {
    fillBathroomFieldWithRetry(propertyDetails, additionalParameters);
  }, 2000);
  
  // 9. Status field (სტატუსი)
  setTimeout(() => {
    fillStatusField(propertyDetails, additionalParameters);
  }, 1800);
  
  // 10. Condition field (მდგომარეობა) - might be separate from status
  setTimeout(() => {
    fillConditionField(propertyDetails, additionalParameters);
  }, 2100);
  
  // 11. Other information (additional parameters, furniture)
  setTimeout(() => {
    fillOtherInformation(additionalParameters, furniture);
  }, 2400);
  
  // 12. Short description (მოკლე აღწერა) – fill if available
  setTimeout(() => {
    fillShortDescription(propertyDetails);
  }, 2600);

  // 13. Description (explicit selector first, then fallback)
  setTimeout(() => {
    fillDescriptionExplicit(propertyDetails, additionalParameters);
  }, 2700);
  
  console.log('[Autofill] Remaining fields filling initiated');
}

/**
 * Fills the condition field (მდგომარეობა)
 * @param {Object} propertyDetails - Property details from scraped data
 * @param {Object} additionalParameters - Additional parameters from scraped data
 */
function fillConditionField(propertyDetails, additionalParameters) {
  // Condition field should map to: ახალი რემონტით, ძველი რემონტით, სარემონტო, მიმდინარე რემონტი, etc.
  const conditionValue = propertyDetails?.['მდგომარეობა'] || 
                         additionalParameters?.['მდგომარეობა'];
  
  if (!conditionValue) {
    console.log('[Autofill] No condition value found for condition field');
    return;
  }
  
  console.log('[Autofill] Original condition from myhome.ge:', conditionValue);
  
  // Map myhome.ge condition to ss.ge condition
  let conditionText = mapMyhomeConditionToSsCondition(conditionValue);
  
  if (!conditionText) {
    console.warn('[Autofill] Could not map condition, trying to use as-is');
    conditionText = conditionValue.toString().trim();
  }
  
  console.log('[Autofill] Mapped condition:', conditionValue, '→', conditionText);
  
  // Find the container by looking for the label "მდგომარეობა"
  let conditionContainer = null;
  
  // Strategy 1: Find span with the label text
  const labelSpan = Array.from(document.querySelectorAll('span')).find(span => {
    const text = (span.textContent || '').trim();
    return text.includes('მდგომარეობა');
  });
  
  if (labelSpan) {
    conditionContainer = labelSpan.closest('.sc-e8a87f7a-1, [class*="sc-e8a87f7a-1"], [class*="bilVxg"]');
  }
  
  // Strategy 2: Search for container
  if (!conditionContainer) {
    const containers = document.querySelectorAll('.sc-e8a87f7a-1, [class*="sc-e8a87f7a-1"]');
    conditionContainer = Array.from(containers).find(container => {
      const text = container.textContent || '';
      return text.includes('მდგომარეობა') && !text.includes('სტატუსი');
    });
  }
  
  // If container found, use div selector (like other fields)
  if (conditionContainer) {
    const optionDivs = conditionContainer.querySelectorAll('div[class*="sc-9e0391b6-0"], div[class*="yrPxb"]');
    let matchingOption = Array.from(optionDivs).find(div => {
      const text = (div.textContent || '').trim();
      return text === conditionText;
    });
    
    if (!matchingOption) {
      matchingOption = Array.from(optionDivs).find(div => {
        const text = (div.textContent || '').trim();
        return text.includes(conditionText) || conditionText.includes(text);
      });
    }
    
    if (matchingOption) {
      console.log('[Autofill] Found condition option:', matchingOption.textContent.trim());
      matchingOption.click();
      const changeEvent = new Event('change', { bubbles: true });
      conditionContainer.dispatchEvent(changeEvent);
      return;
    }
  }
  
  // Fallback: try traditional input/select field
  const conditionField = findFieldByLabel('მდგომარეობა');
  if (conditionField) {
    if (conditionField.tagName === 'SELECT') {
      const option = Array.from(conditionField.options).find(opt => 
        opt.textContent.includes(conditionText)
      );
      if (option) {
        conditionField.value = option.value;
        conditionField.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else {
      conditionField.value = conditionText;
      conditionField.dispatchEvent(new Event('input', { bubbles: true }));
      conditionField.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}

/**
 * Fills other information (additional parameters, furniture) - clickable div options
 * @param {Object} additionalParameters - Additional parameters from scraped data
 * @param {Array} furniture - Furniture items from scraped data
 */
function fillOtherInformation(additionalParameters, furniture) {
  console.log('[Autofill] Filling additional information...');
  console.log('[Autofill] additionalParameters:', additionalParameters);
  console.log('[Autofill] furniture:', furniture);
  
  // Find the additional information container
  const additionalInfoContainer = document.querySelector('#create-app-additional-info');
  
  if (!additionalInfoContainer) {
    console.warn('[Autofill] Could not find additional information container (#create-app-additional-info)');
    return;
  }
  
  console.log('[Autofill] Found additional information container');
  
  // Get all option divs - they have class sc-9e0391b6-0 sc-9e0391b6-1 yrPxb cRvJlS
  const optionDivs = additionalInfoContainer.querySelectorAll('div[class*="sc-9e0391b6-0"], div[class*="yrPxb"], div[class*="cRvJlS"]');
  console.log('[Autofill] Found', optionDivs.length, 'additional information options');
  
  // Collect all items to match from additionalParameters and furniture
  const itemsToMatch = new Set();
  
  // Add items from additionalParameters (skip მდგომარეობა, სც.წერტილები, სტატუსი as they're handled separately)
  if (additionalParameters) {
    Object.entries(additionalParameters).forEach(([key, value]) => {
      // Skip fields that are handled separately
      if (key === 'მდგომარეობა' || key === 'სც.წერტილები' || key === 'სტატუსი' || 
          key.includes('წერტილ') || key.includes('სტატუსი')) {
        return;
      }
      
      // If value is truthy (not empty, not "არა", etc.), add the key to match
      if (value && value.toString().trim() && 
          !value.toString().toLowerCase().includes('არა') &&
          !value.toString().toLowerCase().includes('არ აქვს')) {
        itemsToMatch.add(key);
      }
    });
  }
  
  // Add items from furniture array
  if (furniture && Array.isArray(furniture)) {
    furniture.forEach(item => {
      if (item && item.toString().trim()) {
        itemsToMatch.add(item.toString().trim());
      }
    });
  }
  
  console.log('[Autofill] Items to match:', Array.from(itemsToMatch));
  
  // Match and click options
  let matchedCount = 0;
  Array.from(optionDivs).forEach(optionDiv => {
    const optionText = (optionDiv.textContent || '').trim();
    const pTag = optionDiv.querySelector('p');
    const displayText = pTag ? pTag.textContent.trim() : optionText;
    
    // Check if this option matches any of our items
    const matches = Array.from(itemsToMatch).some(item => {
      // Try exact match
      if (displayText === item || optionText === item) {
        return true;
      }
      // Try partial match (item contains displayText or vice versa)
      if (displayText.includes(item) || item.includes(displayText)) {
        return true;
      }
      // Try case-insensitive match
      const displayLower = displayText.toLowerCase();
      const itemLower = item.toLowerCase();
      if (displayLower.includes(itemLower) || itemLower.includes(displayLower)) {
        return true;
      }
      return false;
    });
    
    if (matches) {
      console.log('[Autofill] ✅ Matching additional info option:', displayText);
      optionDiv.click();
      matchedCount++;
    }
  });
  
  console.log('[Autofill] ✅ Filled', matchedCount, 'additional information items');
  
  // Fallback: try traditional field filling for any remaining additionalParameters
  if (additionalParameters) {
    Object.entries(additionalParameters).forEach(([key, value]) => {
      // Skip fields that are handled separately or already matched
      if (key === 'მდგომარეობა' || key === 'სც.წერტილები' || key === 'სტატუსი' || 
          key.includes('წერტილ') || key.includes('სტატუსი')) {
        return;
      }
      
      // Only try traditional fields if not already matched in clickable options
      if (!itemsToMatch.has(key)) {
        const field = findFieldByLabel(key);
        if (field) {
          if (field.tagName === 'SELECT') {
            const option = Array.from(field.options).find(opt => opt.textContent.includes(value));
            if (option) {
              field.value = option.value;
              field.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } else {
            field.value = value;
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    });
  }
}
  
/**
 * Fills the description field
 * @param {Object} propertyDetails - Property details from scraped data
 */
function fillDescription(propertyDetails) {
  // Check if there's a description in propertyDetails or additionalParameters
  const description = propertyDetails?.['აღწერა'] || 
                     propertyDetails?.['description'] ||
                     propertyDetails?.['დეტალები'];
  
  if (!description) {
    return;
  }
  
  const descriptionField = document.querySelector('textarea[name="description"], textarea[placeholder*="აღწერა"], textarea[placeholder*="დეტალები"], #description');
  if (descriptionField) {
    descriptionField.value = description;
    descriptionField.dispatchEvent(new Event('input', { bubbles: true }));
    descriptionField.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

/**
 * Fills the main description textarea using the explicit selector if available
 * @param {Object} propertyDetails - Property details from scraped data
 * @param {Object} additionalParameters - Additional parameters from scraped data
 */
function fillDescriptionExplicit(propertyDetails, additionalParameters) {
  // Prefer the short description for the textarea, fallback to full description
  const description = propertyDetails?.['მოკლე აღწერა'] ||
                     propertyDetails?.shortDescription ||
                     propertyDetails?.['description'] ||
                     propertyDetails?.['აღწერა'] ||
                     propertyDetails?.['დეტალები'];

  if (!description) {
    return;
  }

  // Explicit selector provided by user for ss.ge description field
  const explicitField = document.querySelector('#create-app-desc > div.sc-c285bd07-2.fASXuL > textarea');
  if (explicitField) {
    explicitField.value = description;
    explicitField.dispatchEvent(new Event('input', { bubbles: true }));
    explicitField.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  // Fallback to existing fillDescription if explicit selector not found
  fillDescription(propertyDetails, additionalParameters);
}

/**
 * Fills the short description field (მოკლე აღწერა) if present
 * @param {Object} propertyDetails - Property details from scraped data
 */
function fillShortDescription(propertyDetails) {
  const shortDesc = propertyDetails?.['მოკლე აღწერა'] ||
                    propertyDetails?.shortDescription ||
                    propertyDetails?.['description'] ||
                    propertyDetails?.['აღწერა'];

  if (!shortDesc) {
    return;
  }

  const selectors = [
    'textarea[placeholder*="მოკლე"]',
    'textarea[name*="short"]',
    'textarea[id*="short"]',
    'input[placeholder*="მოკლე"]',
    'input[name*="short"]',
    '#create-edit-translation-block textarea',
  ];

  let field = null;
  for (const selector of selectors) {
    field = document.querySelector(selector);
    if (field) break;
  }

  if (field) {
    field.value = shortDesc;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

/**
 * Fills the bedroom field - called separately with delay to ensure form has rendered
 * @param {Object} propertyDetails - Property details from scraped data
 */
function fillBedroomField(propertyDetails) {
  if (!propertyDetails || !propertyDetails['საძინებელი']) {
    return;
  }
  
  const bedroomValue = propertyDetails['საძინებელი'];
  let bedroomText = bedroomValue.toString().trim();
  
  // Find the container by looking for the label "საძინებელი"
  let bedroomContainer = null;
  
  // Strategy 1: Look for a specific ID like #bedroom-input (similar to #room-input)
  bedroomContainer = document.querySelector('#bedroom-input, #bedrooms-input');
  
  // Strategy 2: Find span with the label text, then get its parent container
  if (!bedroomContainer) {
    const labelSpan = Array.from(document.querySelectorAll('span')).find(span => {
      const text = (span.textContent || '').trim();
      return text.includes('საძინებელი');
    });
    
    if (labelSpan) {
      // Find the parent container with class sc-e8a87f7a-1 bilVxg (same structure as rooms)
      bedroomContainer = labelSpan.closest('.sc-e8a87f7a-1, [class*="sc-e8a87f7a-1"], [class*="bilVxg"]');
    }
  }
  
  // Strategy 3: Search for container with similar structure by traversing up from label
  if (!bedroomContainer) {
    const labelSpan = Array.from(document.querySelectorAll('span, div')).find(el => {
      const text = (el.textContent || '').trim();
      return text.includes('საძინებელი') && text.length < 50; // Avoid matching large containers
    });
    
    if (labelSpan) {
      // Walk up the DOM tree to find the container
      let parent = labelSpan.parentElement;
      let depth = 0;
      while (parent && depth < 10) {
        if (parent.classList.contains('sc-e8a87f7a-1') || 
            parent.className.includes('sc-e8a87f7a-1') ||
            parent.className.includes('bilVxg')) {
          bedroomContainer = parent;
          break;
        }
        parent = parent.parentElement;
        depth++;
      }
    }
  }
  
  // Strategy 4: Search for all containers with similar structure
  if (!bedroomContainer) {
    const containers = document.querySelectorAll('.sc-e8a87f7a-1, [class*="sc-e8a87f7a-1"]');
    bedroomContainer = Array.from(containers).find(container => {
      const text = container.textContent || '';
      return text.includes('საძინებელი') && !text.includes('ოთახი') && !text.includes('სველი');
    });
  }
  
  if (bedroomContainer) {
    // Look for divs with class sc-9e0391b6-0 yrPxb that contain the bedroom number
    const optionDivs = bedroomContainer.querySelectorAll('div[class*="sc-9e0391b6-0"], div[class*="yrPxb"]');
    let matchingOption = Array.from(optionDivs).find(div => {
      const text = (div.textContent || '').trim();
      return text === bedroomText;
    });
    
    // If no exact match, try partial matching
    if (!matchingOption) {
      matchingOption = Array.from(optionDivs).find(div => {
        const text = (div.textContent || '').trim();
        return text.includes(bedroomText) || bedroomText.includes(text);
      });
    }
    
    if (matchingOption) {
      console.log('[Autofill] Found bedroom option:', matchingOption.textContent.trim(), 'for value:', bedroomText);
      matchingOption.click();
      // Trigger change event on the container to ensure form recognizes the selection
      const changeEvent = new Event('change', { bubbles: true });
      bedroomContainer.dispatchEvent(changeEvent);
        } else {
      console.warn('[Autofill] Could not find bedroom option for:', bedroomText);
      console.warn('[Autofill] Available bedroom options:', Array.from(optionDivs).map(d => d.textContent.trim()));
      console.warn('[Autofill] Bedroom container found but no matching option. Container HTML:', bedroomContainer.outerHTML.substring(0, 500));
    }
  } else {
    // Fallback: try traditional input field
    const bedroomsField = document.querySelector('input[name="bedrooms"], input[placeholder*="საძინებელი"], #bedrooms, input[id*="bedroom"]');
    if (bedroomsField) {
      bedroomsField.value = propertyDetails['საძინებელი'];
      bedroomsField.dispatchEvent(new Event('input', { bubbles: true }));
      bedroomsField.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      console.warn('[Autofill] Could not find bedroom container or input field (delayed fill)');
      console.warn('[Autofill] Searching for label "საძინებელი"...');
      const allSpans = Array.from(document.querySelectorAll('span'));
      const matchingSpans = allSpans.filter(span => span.textContent.includes('საძინებელი'));
      console.warn('[Autofill] Found', matchingSpans.length, 'spans containing "საძინებელი"');
      matchingSpans.forEach((span, idx) => {
        console.warn(`[Autofill] Span ${idx}:`, span.textContent.trim(), 'Parent:', span.parentElement?.className);
      });
      console.warn('[Autofill] All containers with sc-e8a87f7a-1:', Array.from(document.querySelectorAll('[class*="sc-e8a87f7a-1"]')).map(c => ({
        text: c.textContent?.substring(0, 100),
        classes: c.className
      })));
    }
  }
}

/**
 * Fills the bathroom field (სველი წერტილი) - called separately with delay to ensure form has rendered
 * @param {Object} propertyDetails - Property details from scraped data
 * @param {Object} additionalParameters - Additional parameters from scraped data
 */
function fillBathroomField(propertyDetails, additionalParameters) {
  console.log('[Autofill] Starting bathroom field fill...');
  console.log('[Autofill] propertyDetails:', propertyDetails);
  console.log('[Autofill] additionalParameters:', additionalParameters);
  
  // Log all keys in additionalParameters to debug
  if (additionalParameters) {
    console.log('[Autofill] Additional parameters keys:', Object.keys(additionalParameters));
    console.log('[Autofill] Looking for bathroom keys...');
    Object.keys(additionalParameters).forEach(key => {
      if (key.includes('წერტილ') || key.includes('სველი') || key.includes('სვ')) {
        console.log('[Autofill] Found potential bathroom key:', key, '=', additionalParameters[key]);
      }
    });
  }
  
  // Try to find bathroom value by searching all keys that contain bathroom-related text
  let bathroomValue = null;
  
  // First, try exact key matches in additionalParameters
  if (additionalParameters) {
    bathroomValue = additionalParameters['სც.წერტილები'] ||
                    additionalParameters['სც წერტილები'] ||
                    additionalParameters['სვ.წერტილი'] ||
                    additionalParameters['სველი წერტილი'];
    
    // If not found, search for any key containing bathroom-related text
    if (!bathroomValue) {
      const bathroomKeys = Object.keys(additionalParameters).filter(key => 
        key.includes('წერტილ') || key.includes('სველი') || key.includes('სც')
      );
      
      if (bathroomKeys.length > 0) {
        console.log('[Autofill] Found bathroom-related keys:', bathroomKeys);
        bathroomValue = additionalParameters[bathroomKeys[0]];
        console.log('[Autofill] Using key:', bathroomKeys[0], 'with value:', bathroomValue);
      }
    }
  }
  
  // Fallback to propertyDetails
  if (!bathroomValue && propertyDetails) {
    bathroomValue = propertyDetails['სც.წერტილები'] ||
                    propertyDetails['სც წერტილები'] ||
                    propertyDetails['სვ.წერტილი'] ||
                    propertyDetails['სველი წერტილი'];
  }
  
  console.log('[Autofill] Bathroom value found:', bathroomValue);
  
  if (bathroomValue === undefined || bathroomValue === null) {
    console.warn('[Autofill] No bathroom value found in propertyDetails or additionalParameters');
    console.warn('[Autofill] All additionalParameters keys:', additionalParameters ? Object.keys(additionalParameters) : 'none');
    console.warn('[Autofill] All propertyDetails keys:', propertyDetails ? Object.keys(propertyDetails) : 'none');
    return;
  }
  
  let bathroomText = bathroomValue.toString().trim();
  console.log('[Autofill] Initial bathroom text:', bathroomText);
  
  // Handle "არ აქვს" (doesn't have) case first - check if value is 0 or "არ აქვს"
  if (bathroomValue === 0 || bathroomValue === '0' || 
      bathroomValue.toString().toLowerCase().includes('არ აქვს') ||
      bathroomValue.toString().toLowerCase().includes('არა')) {
    bathroomText = 'არ აქვს';
    console.log('[Autofill] Mapped to "არ აქვს"');
  } else {
    // Normalize: if it's a number and > 5, use "5+"
    const bathroomNumber = parseFloat(bathroomValue);
    if (!isNaN(bathroomNumber)) {
      if (bathroomNumber > 5) {
        bathroomText = '5+';
        console.log('[Autofill] Mapped to "5+" (value > 5)');
      } else {
        bathroomText = bathroomNumber.toString();
        console.log('[Autofill] Using number as-is:', bathroomText);
      }
    }
  }
  
  console.log('[Autofill] Final bathroom text to search for:', bathroomText);
  
  // Find the container by looking for the label "სველი წერტილი"
  let bathroomContainer = null;
  
  // Strategy 0: Direct container by provided structure
  const directContainer = Array.from(document.querySelectorAll('div.sc-e8a87f7a-1.bilVxg')).find(div => {
    const label = div.querySelector('span.sc-6e54cb25-19.cHrSsJ');
    return label && (label.textContent || '').includes('სველი წერტილი');
  });
  if (directContainer) {
    bathroomContainer = directContainer;
  }

  // Strategy 1: Find span with the label text, then get its parent container (only if not found yet)
  const labelSpan = bathroomContainer ? null : Array.from(document.querySelectorAll('span')).find(span => {
    const text = (span.textContent || '').trim();
    return text === 'სველი წერტილი' || text.includes('სველი წერტილი') || text.includes('სვ.წერტილი');
  });
  
  console.log('[Autofill] Label span found:', !!labelSpan);
  
  if (!bathroomContainer && labelSpan) {
    // Find the parent container with class sc-e8a87f7a-1 bilVxg (same structure as rooms/bedrooms)
    bathroomContainer = labelSpan.closest('.sc-e8a87f7a-1, [class*="sc-e8a87f7a-1"], [class*="bilVxg"]');
    console.log('[Autofill] Container found via closest():', !!bathroomContainer);
  }
  
  // Strategy 2: Search for container with similar structure by traversing up from label
  if (!bathroomContainer && labelSpan) {
    // Walk up the DOM tree to find the container
    let parent = labelSpan.parentElement;
    let depth = 0;
    while (parent && depth < 10) {
      if (parent.classList.contains('sc-e8a87f7a-1') || 
          parent.className.includes('sc-e8a87f7a-1') ||
          parent.className.includes('bilVxg')) {
        bathroomContainer = parent;
        console.log('[Autofill] Container found via DOM traversal at depth', depth);
        break;
      }
      parent = parent.parentElement;
      depth++;
    }
  }
  
  // Strategy 3: Search for all containers with similar structure
  if (!bathroomContainer) {
    const containers = document.querySelectorAll('.sc-e8a87f7a-1, [class*="sc-e8a87f7a-1"]');
    console.log('[Autofill] Searching', containers.length, 'containers with sc-e8a87f7a-1 class');
    bathroomContainer = Array.from(containers).find(container => {
      const text = container.textContent || '';
      const hasBathroomLabel = text.includes('სველი წერტილი') || text.includes('სვ.წერტილი');
      const notOtherField = !text.includes('ოთახი') && !text.includes('საძინებელი') && !text.includes('სტატუსი');
      return hasBathroomLabel && notOtherField;
    });
    console.log('[Autofill] Container found via container search:', !!bathroomContainer);
  }
  
  if (bathroomContainer) {
    console.log('[Autofill] Bathroom container found!');
    // Look for divs with class sc-9e0391b6-0 yrPxb that contain the bathroom number
    // Also check for p tags inside (since the HTML shows <p> tags)
    const optionDivs = bathroomContainer.querySelectorAll('div[class*="sc-9e0391b6-0"], div[class*="yrPxb"]');
    console.log('[Autofill] Found', optionDivs.length, 'option divs');
    
    // Log all available options
    const availableOptions = Array.from(optionDivs).map(d => {
      const text = (d.textContent || '').trim();
      return { text, html: d.outerHTML.substring(0, 100) };
    });
    console.log('[Autofill] Available bathroom options:', availableOptions);
    
    let matchingOption = Array.from(optionDivs).find(div => {
      const text = (div.textContent || '').trim();
      return text === bathroomText;
    });
    
    // If no exact match, try partial matching
    if (!matchingOption) {
      matchingOption = Array.from(optionDivs).find(div => {
        const text = (div.textContent || '').trim();
        return text.includes(bathroomText) || bathroomText.includes(text);
      });
    }
    
    if (matchingOption) {
      console.log('[Autofill] ✅ Found bathroom option:', matchingOption.textContent.trim(), 'for value:', bathroomText);
      matchingOption.click();
      // Trigger change event on the container to ensure form recognizes the selection
      const changeEvent = new Event('change', { bubbles: true });
      bathroomContainer.dispatchEvent(changeEvent);
      console.log('[Autofill] ✅ Bathroom field filled successfully');
    } else {
      console.warn('[Autofill] ❌ Could not find bathroom option for:', bathroomText);
      console.warn('[Autofill] Available bathroom options:', Array.from(optionDivs).map(d => d.textContent.trim()));
      console.warn('[Autofill] Bathroom container found but no matching option. Container HTML:', bathroomContainer.outerHTML.substring(0, 500));
    }
  } else {
    console.warn('[Autofill] ❌ Could not find bathroom container (delayed fill)');
    console.warn('[Autofill] Searching for label "სველი წერტილი"...');
    const allSpans = Array.from(document.querySelectorAll('span'));
    const matchingSpans = allSpans.filter(span => 
      span.textContent.includes('სველი წერტილი') || span.textContent.includes('სვ.წერტილი')
    );
    console.warn('[Autofill] Found', matchingSpans.length, 'spans containing bathroom label');
    matchingSpans.forEach((span, idx) => {
      console.warn(`[Autofill] Span ${idx}:`, span.textContent.trim(), 'Parent:', span.parentElement?.className);
    });
    const allContainers = Array.from(document.querySelectorAll('[class*="sc-e8a87f7a-1"]'));
    console.warn('[Autofill] All containers with sc-e8a87f7a-1:', allContainers.length);
    allContainers.forEach((c, idx) => {
      console.warn(`[Autofill] Container ${idx}:`, {
        text: c.textContent?.substring(0, 100),
        classes: c.className,
        hasBathroom: c.textContent?.includes('სველი წერტილი') || c.textContent?.includes('სვ.წერტილი')
      });
    });
  }
}

/**
 * Fills the bathroom field with retry mechanism
 * @param {Object} propertyDetails - Property details from scraped data
 * @param {Object} additionalParameters - Additional parameters from scraped data
 */
function fillBathroomFieldWithRetry(propertyDetails, additionalParameters) {
  let retryCount = 0;
  const maxRetries = 5;
  const retryDelay = 500;
  
  const tryFillBathroom = () => {
    // Check if container exists before trying to fill
    const labelSpan = Array.from(document.querySelectorAll('span')).find(span => {
      const text = (span.textContent || '').trim();
      return text === 'სველი წერტილი' || text.includes('სველი წერტილი') || text.includes('სვ.წერტილი');
    });
    
    const container = labelSpan ? labelSpan.closest('.sc-e8a87f7a-1, [class*="sc-e8a87f7a-1"], [class*="bilVxg"]') : null;
    
    if (container || retryCount >= maxRetries) {
      // Container found or max retries reached, try to fill
      fillBathroomField(propertyDetails, additionalParameters);
      
      // If container wasn't found and we've exhausted retries, log error
      if (!container && retryCount >= maxRetries) {
        console.error('[Autofill] Bathroom container not found after', maxRetries, 'retries');
      }
    } else {
      retryCount++;
      console.log(`[Autofill] Bathroom container not ready, retrying... (${retryCount}/${maxRetries})`);
      setTimeout(tryFillBathroom, retryDelay);
    }
  };
  
  tryFillBathroom();
}

/**
 * Fills the status field (სტატუსი) - called separately with delay to ensure form has rendered
 * @param {Object} propertyDetails - Property details from scraped data
 * @param {Object} additionalParameters - Additional parameters from scraped data
 */
/**
 * Maps myhome.ge condition values to ss.ge status values
 * @param {string} myhomeCondition - The condition value from myhome.ge
 * @returns {string} The corresponding status value for ss.ge
 */
/**
 * Maps myhome.ge condition values to ss.ge status values (სტატუსი)
 * Status options: ახალი აშენებული, მშენებარე, ძველი აშენებული
 * @param {string} myhomeStatus - The status/condition value from myhome.ge
 * @returns {string} The corresponding status value for ss.ge
 */
function mapMyhomeToSsStatus(myhomeStatus) {
  if (!myhomeStatus) {
    return null;
  }
  
  const status = myhomeStatus.toString().trim().toLowerCase();
  
  // Map to status options: ახალი აშენებული, მშენებარე, ძველი აშენებული
  if (status.includes('ახალი')) {
    return 'ახალი აშენებული';
  }
  if (status.includes('მშენებარე')) {
    return 'მშენებარე';
  }
  if (status.includes('ძველი')) {
    return 'ძველი აშენებული';
  }
  
  // Default fallback
  return 'ძველი აშენებული';
}

/**
 * Maps myhome.ge condition values to ss.ge condition values (მდგომარეობა)
 * Condition options: ახალი რემონტით, ძველი რემონტით, სარემონტო, მიმდინარე რემონტი, გარემონტებული, თეთრი კარკასი, შავი კარკასი, მწვანე კარკასი
 * @param {string} myhomeCondition - The condition value from myhome.ge
 * @returns {string} The corresponding condition value for ss.ge
 */
function mapMyhomeConditionToSsCondition(myhomeCondition) {
  if (!myhomeCondition) {
    return null;
  }
  
  const condition = myhomeCondition.toString().trim();
  
  // Exact matches first
  if (condition === 'სარემონტო') {
    return 'სარემონტო';
  }
  if (condition === 'მიმდინარე რემონტი') {
    return 'მიმდინარე რემონტი';
  }
  if (condition === 'თეთრი კარკასი') {
    return 'თეთრი კარკასი';
  }
  if (condition === 'შავი კარკასი') {
    return 'შავი კარკასი';
  }
  if (condition === 'მწვანე კარკასი') {
    return 'მწვანე კარკასი';
  }
  
  // Partial matches for renovated conditions
  if (condition === 'ახალი გარემონტებული' || condition.includes('ახალი გარემონტებული')) {
    return 'ახალი რემონტით';
  }
  if (condition === 'ძველი გარემონტებული' || condition.includes('ძველი გარემონტებული')) {
    return 'ძველი რემონტით';
  }
  
  // Keyword-based matching
  if (condition.includes('თეთრი პლიუსი')) {
    // თეთრი პლიუსი doesn't exist on ss.ge, map to closest: თეთრი კარკასი
    return 'თეთრი კარკასი';
  }
  
  // Default fallback based on keywords
  if (condition.includes('გარემონტებული')) {
    return 'გარემონტებული';
  }
  if (condition.includes('სარემონტო')) {
    return 'სარემონტო';
  }
  if (condition.includes('მიმდინარე რემონტი')) {
    return 'მიმდინარე რემონტი';
  }
  
  // If no match found, return null to handle gracefully
  return null;
}

function fillStatusField(propertyDetails, additionalParameters) {
  // Check for status value - might be in status field or მდგომარეობა
  // Status should map to: ახალი აშენებული, მშენებარე, ძველი აშენებული
  const statusValue = propertyDetails?.['სტატუსი'] || 
                      propertyDetails?.['status'] ||
                      additionalParameters?.['სტატუსი'] ||
                      additionalParameters?.['status'] ||
                      propertyDetails?.['მდგომარეობა'] || 
                      additionalParameters?.['მდგომარეობა'];
  
  if (!statusValue) {
    console.log('[Autofill] No status value found for status field');
    return;
  }
  
  console.log('[Autofill] Original status/condition from myhome.ge:', statusValue);
  
  // Map myhome.ge status to ss.ge status (ახალი აშენებული, მშენებარე, ძველი აშენებული)
  let statusText = mapMyhomeToSsStatus(statusValue);
  
  if (!statusText) {
    console.warn('[Autofill] Could not map status, using default');
    statusText = 'ძველი აშენებული';
  }
  
  console.log('[Autofill] Mapped status:', statusValue, '→', statusText);
  
  // Find the container by looking for the label "სტატუსი"
  let statusContainer = null;
  
  // Strategy 1: Find span with the label text, then get its parent container
  const labelSpan = Array.from(document.querySelectorAll('span')).find(span => {
    const text = (span.textContent || '').trim();
    return text.includes('სტატუსი');
  });
  
  if (labelSpan) {
    // Find the parent container with class sc-e8a87f7a-1 bilVxg (same structure as other fields)
    statusContainer = labelSpan.closest('.sc-e8a87f7a-1, [class*="sc-e8a87f7a-1"], [class*="bilVxg"]');
  }
  
  // Strategy 2: Search for container with similar structure by traversing up from label
  if (!statusContainer) {
    const labelSpan = Array.from(document.querySelectorAll('span, div')).find(el => {
      const text = (el.textContent || '').trim();
      return text.includes('სტატუსი') && text.length < 50;
    });
    
    if (labelSpan) {
      // Walk up the DOM tree to find the container
      let parent = labelSpan.parentElement;
      let depth = 0;
      while (parent && depth < 10) {
        if (parent.classList.contains('sc-e8a87f7a-1') || 
            parent.className.includes('sc-e8a87f7a-1') ||
            parent.className.includes('bilVxg')) {
          statusContainer = parent;
          break;
        }
        parent = parent.parentElement;
        depth++;
      }
    }
  }
  
  // Strategy 3: Search for all containers with similar structure
  if (!statusContainer) {
    const containers = document.querySelectorAll('.sc-e8a87f7a-1, [class*="sc-e8a87f7a-1"]');
    statusContainer = Array.from(containers).find(container => {
      const text = container.textContent || '';
      return text.includes('სტატუსი');
    });
  }
  
  if (statusContainer) {
    console.log('[Autofill] Status container found!');
    // Look for divs with class sc-9e0391b6-0 yrPxb that contain the status text
    const optionDivs = statusContainer.querySelectorAll('div[class*="sc-9e0391b6-0"], div[class*="yrPxb"]');
    console.log('[Autofill] Found', optionDivs.length, 'status option divs');
    
    // Log all available options
    const availableOptions = Array.from(optionDivs).map(d => {
      const text = (d.textContent || '').trim();
      return { text, html: d.outerHTML.substring(0, 100) };
    });
    console.log('[Autofill] Available status options:', availableOptions);
    
    let matchingOption = Array.from(optionDivs).find(div => {
      const text = (div.textContent || '').trim();
      return text === statusText;
    });
    
    // If no exact match, try partial matching
    if (!matchingOption) {
      matchingOption = Array.from(optionDivs).find(div => {
        const text = (div.textContent || '').trim();
        return text.includes(statusText) || statusText.includes(text);
      });
    }
    
    if (matchingOption) {
      console.log('[Autofill] ✅ Found status option:', matchingOption.textContent.trim(), 'for value:', statusValue, 'mapped to:', statusText);
      matchingOption.click();
      // Trigger change event on the container to ensure form recognizes the selection
      const changeEvent = new Event('change', { bubbles: true });
      statusContainer.dispatchEvent(changeEvent);
      console.log('[Autofill] ✅ Status field filled successfully');
    } else {
      console.warn('[Autofill] ❌ Could not find status option for:', statusText);
      console.warn('[Autofill] Available status options:', Array.from(optionDivs).map(d => d.textContent.trim()));
      console.warn('[Autofill] Status container found but no matching option. Container HTML:', statusContainer.outerHTML.substring(0, 500));
    }
  } else {
    console.warn('[Autofill] Could not find status container (delayed fill)');
    console.warn('[Autofill] Searching for label "სტატუსი"...');
    const allSpans = Array.from(document.querySelectorAll('span'));
    const matchingSpans = allSpans.filter(span => span.textContent.includes('სტატუსი'));
    console.warn('[Autofill] Found', matchingSpans.length, 'spans containing "სტატუსი"');
    matchingSpans.forEach((span, idx) => {
      console.warn(`[Autofill] Span ${idx}:`, span.textContent.trim(), 'Parent:', span.parentElement?.className);
    });
  }
}

/**
 * Fills the location form (city, street, house number)
 * @param {string} address - The address to parse and fill (already transformed during scraping)
 */
function fillLocationForm(address) {
  if (!address) {
    return;
  }

  console.log('[Autofill] Filling location form with address:', address);

  // If address contains a house number (e.g. "ასპინძის ქ. 5"), separate it:
  //  - street part goes to the street field
  //  - number part goes to the house-number field
  let streetAddressPart = address;
  let explicitHouseNumber = null;

  // Look for a number token at the very end (optionally with trailing letter, e.g. "5ა")
  const houseNumberMatchFull = address.match(/(\d+[ა-ჰA-Za-z\-\/0-9]*)\s*$/);
  if (houseNumberMatchFull) {
    explicitHouseNumber = houseNumberMatchFull[1];
    streetAddressPart = address.slice(0, houseNumberMatchFull.index).trim();
    console.log('[Autofill] Detected house number in address:', explicitHouseNumber, 'street part:', streetAddressPart);
  }

  // Address is already transformed during scraping, but we apply an extra
  // normalization step to better match ss.ge street patterns (especially microdistricts)
  const transformedAddress = normalizeStreetForSs(streetAddressPart);
  console.log('[Autofill] Using address:', transformedAddress);

  // Use the full transformed address for street (don't split)
  let streetValue = transformedAddress.trim(); // e.g., "ა მიკრორაიონი - გლდანი"
  
  // Fill city dropdown (react-select) - default to "თბილისი"
  // If city is not present in scraped data, leave it as თბილისი (default)
  // Only interact with city dropdown if we need to change it
  const citySelectContainer = document.querySelector('#create-app-loc .css-b62m3t-container:first-of-type');
  if (citySelectContainer) {
    const cityInput = citySelectContainer.querySelector('input.select__input');
    if (cityInput) {
      // Check if city is already set to თბილისი
      const cityValue = citySelectContainer.querySelector('.select__single-value');
      if (cityValue && cityValue.textContent.includes('თბილისი')) {
        console.log('[Autofill] City already set to თბილისი, leaving it as is');
        // City is already თბილისი, no need to change it
      } else {
        // City is not set or set to something else, but since we don't have city data,
        // we'll leave it as თბილისი (which should be the default)
        console.log('[Autofill] City not set to თბილისი, but no city data provided - leaving default');
        // Don't change it - the form should already have თბილისი as default
      }
    }
  }

  // Fill street dropdown (react-select)
  // Use the full transformed address as street value
  // Find the street select container - it has class fAZwZA and contains input with id react-select-3-input
  // Make sure we're not selecting the city dropdown (which has react-select-4-input)
  let streetInput = null;
  
  // First, try to find by the specific container class fAZwZA
  const streetSelectContainer = document.querySelector('#create-app-loc .fAZwZA.css-b62m3t-container');
  if (streetSelectContainer) {
    streetInput = streetSelectContainer.querySelector('input.select__input');
  }
  
  // Fallback: find by id react-select-3-input (street) - NOT react-select-4-input (city)
  if (!streetInput) {
    streetInput = document.querySelector('#react-select-3-input');
  }
  
  // Another fallback: find input that's NOT the city input
  if (!streetInput) {
    const allInputs = document.querySelectorAll('#create-app-loc input.select__input');
    streetInput = Array.from(allInputs).find(input => {
      const id = input.id || '';
      // Street is react-select-3, city is react-select-4
      return id.includes('react-select-3') || (!id.includes('react-select-4') && input.closest('.fAZwZA'));
    });
  }
  
  if (streetInput && streetValue) {
    setTimeout(() => {
      console.log('[Autofill] Setting street to:', streetValue);
      console.log('[Autofill] Street input found:', streetInput.id || streetInput);
      streetInput.focus();
      streetInput.click();
      
      setTimeout(() => {
        // Clear any existing value first
        streetInput.value = '';
        streetInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Type the street value character by character to trigger search
        let currentValue = '';
        let triedSurnameFallback = false;
        const typeStreet = () => {
          if (currentValue.length < streetValue.length) {
            currentValue = streetValue.substring(0, currentValue.length + 1);
            streetInput.value = currentValue;
            
            const inputEvent = new InputEvent('input', {
              bubbles: true,
              cancelable: true,
              inputType: 'insertText',
              data: streetValue[currentValue.length - 1]
            });
            streetInput.dispatchEvent(inputEvent);
            
            setTimeout(typeStreet, 50);
          } else {
            // After typing, wait for options and select
            setTimeout(() => {
              // Look for matching option - react-select options have specific classes
              const streetOptions = Array.from(document.querySelectorAll('[id*="react-select"][id*="option"], .css-1n7v3ny-option'));
              
              // First, try to find exact match
              let matchingOption = streetOptions.find(opt => {
                const text = (opt.textContent || '').trim();
                return text === streetValue;
              });
              
              // If no exact match, try to find options that start with the street value
              if (!matchingOption) {
                matchingOption = streetOptions.find(opt => {
                  const text = (opt.textContent || '').trim();
                  return text.startsWith(streetValue);
                });
              }
              
              // If still no match, try to find the shortest option that contains the street value
              // This helps avoid selecting "III ა მიკრორაიონი" when we want "ა მიკრორაიონი"
              if (!matchingOption) {
                const containingOptions = streetOptions.filter(opt => {
                  const text = (opt.textContent || '').trim();
                  return text.includes(streetValue);
                });
                
                if (containingOptions.length > 0) {
                  // Sort by length and take the shortest (most likely to be the exact match)
                  containingOptions.sort((a, b) => {
                    const aText = (a.textContent || '').trim();
                    const bText = (b.textContent || '').trim();
                    return aText.length - bText.length;
                  });
                  matchingOption = containingOptions[0];
                }
              }
              
              if (matchingOption) {
                console.log('[Autofill] Found matching street option:', matchingOption.textContent);
                matchingOption.click();
              } else {
                // If we didn't find a match, try a fallback by stripping leading initial
                // Example: "ვ. კუპრაძის" -> "კუპრაძის"
                if (!triedSurnameFallback) {
                  const surnameCandidate = streetValue.replace(/^[ა-ჰ]\.\s+/, '');
                  if (surnameCandidate && surnameCandidate !== streetValue) {
                    triedSurnameFallback = true;
                    console.log('[Autofill] No match, retrying with surname-only street value:', surnameCandidate);
                    streetValue = surnameCandidate;
                    currentValue = '';
                    // Clear input before retry
                    streetInput.value = '';
                    streetInput.dispatchEvent(new Event('input', { bubbles: true }));
                    setTimeout(typeStreet, 50);
                    return;
                  }
                }

                // Final fallback: press Enter to select first result if any
                console.log('[Autofill] No match found, trying to select first option with Enter');
                const enterEvent = new KeyboardEvent('keydown', {
                  key: 'Enter',
                  code: 'Enter',
                  keyCode: 13,
                  bubbles: true,
                  cancelable: true
                });
                streetInput.dispatchEvent(enterEvent);
              }
            }, 800);
          }
        };
        
        typeStreet();
      }, 300);
    }, 500); // Reduced wait time since we're not changing city
  } else if (!streetInput) {
    console.warn('[Autofill] Could not find street input field');
  } else {
    console.warn('[Autofill] No street value to fill');
  }

  // Fill house number (if available in address)
  const houseNumberInput = document.querySelector('input[name="house-number"]');
  if (houseNumberInput) {
    // Prefer the explicit house number we split out from the address, if any
    let houseNumberToUse = explicitHouseNumber;

    // Fallback: try to extract from the original address
    if (!houseNumberToUse) {
      const fallbackMatch = address.match(/(\d+)/);
      if (fallbackMatch) {
        houseNumberToUse = fallbackMatch[1];
      }
    }

    if (houseNumberToUse) {
      setTimeout(() => {
        houseNumberInput.value = houseNumberToUse;
        houseNumberInput.dispatchEvent(new Event('input', { bubbles: true }));
        houseNumberInput.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('[Autofill] Set house number:', houseNumberToUse);
      }, 2500);
    }
  }

  console.log('[Autofill] Location form filling initiated');
}

/**
 * Normalizes a myhome.ge-style street/address string so it better matches
 * ss.ge street naming patterns.
 *
 * The idea is to take patterns like:
 *   "თემქა- III მ/რ V კვარტ."
 * and convert them into something closer to ss.ge's format:
 *   "III მიკრორაიონი, V კვარტალი - თემქა"
 *
 * This function is intentionally conservative: if a pattern is not recognized,
 * it simply returns the original address unchanged.
 *
 * @param {string} address
 * @returns {string}
 */
function normalizeStreetForSs(address) {
  if (!address || typeof address !== 'string') {
    return address;
  }

  let normalized = address.trim();

   // Pattern 0 (specific to ნუცუბიძის პლატო):
  // "ნუცუბიძის პლ. II მ/რ. I კვარტ."
  //   → "ნუცუბიძის II პლატო"
  //
  // - We only care about the microdistrict number (II) and map it to the plateau number.
  // - The kvartal part is ignored for ss.ge, since its street list uses plateau names.
  //
  // Regex groups:
  //   1: microdistrict Roman numeral (I, II, III, ...)
  const nutsubidzePlatoRegex = /^ნუცუბიძის\s+პლ\.?\s*([IVX]+)\s*მ\/რ\.?\s*[IVX\d]+\s*კვარტ\.?$/i;
  const nutsubidzeMatch = normalized.match(nutsubidzePlatoRegex);
  if (nutsubidzeMatch) {
    const mkrRoman = nutsubidzeMatch[1].trim(); // e.g. "II"
    const result = `ნუცუბიძის ${mkrRoman} პლატო`;
    console.log('[Autofill] Normalized ნუცუბიძის პლატო address:', normalized, '→', result);
    return result;
  }

  // Pattern 1:
  // "<district>- III მ/რ V კვარტ."
  //   → "III მიკრორაიონი, V კვარტალი - <district>"
  //
  // - <district>  : any text before the dash (e.g. "თემქა")
  // - III         : Roman numeral for microdistrict (I, II, III, IV, V, VI, VII, VIII, IX, X ...)
  // - მ/რ         : abbreviation for "მიკრორაიონი"
  // - V           : Roman numeral or digit(s) for quarter
  // - კვარტ.      : abbreviation for "კვარტალი"
  //
  // We keep the Roman numerals as they are – ss.ge also uses them.
  const mkrKvRegex = /^(.+?)\s*-\s*([IVX]+)\s*მ\/რ\s*([IVX\d]+)\s*კვარტ\.?$/i;
  const mkrKvMatch = normalized.match(mkrKvRegex);
  if (mkrKvMatch) {
    const rawDistrict = mkrKvMatch[1].trim();  // e.g. "თემქა"
    const mkrRoman   = mkrKvMatch[2].trim();   // e.g. "III"
    const kvartToken = mkrKvMatch[3].trim();   // e.g. "V"

    const district = rawDistrict.replace(/\s+/, ' ');

    const result = `${mkrRoman} მიკრორაიონი, ${kvartToken} კვარტალი - ${district}`;
    console.log('[Autofill] Normalized microdistrict address:', normalized, '→', result);
    return result;
  }

  // Future patterns for other microdistrict formats can be added here in a
  // similar way, always returning early when a pattern matches.

  // --- Generic street-name normalization rules ---
  // These handle patterns like:
  //  - "ასპინძის I ქ."          -> "ასპინძის"
  //  - "ასკანის II ჩიხი"        -> "ასკანის"
  //  - "ასათიანი ლ. I შეს."     -> "ასათიანი ლ."
  //  - "ასათიანი გ. ქ."         -> "გ. ასათიანის ქ." (handled by more specific rules later)

  let s = normalized;

  // Normalize "შეს." -> "შესახვევი" to reduce variants
  s = s.replace(/\bშეს\.\b/gi, ' შესახვევი ');

  // Strip Roman numerals used for branch numbering (I, II, III, IV, ...)
  // when they appear right before a type word like ქ./ქუჩა/ჩიხი/შესახვევი/შეს.
  // Examples:
  //   "ასპინძის I ქ."            -> "ასპინძის ქ."
  //   "ასკანის II ჩიხი"          -> "ასკანის ჩიხი"
  //   "13 ასურელი მამის I შეს."  -> "13 ასურელი მამის შეს."
  s = s.replace(/\s+[IVX]+\s+(?=(ქ\.?|ქუჩა|ჩიხი|შესახვევი|შეს\.?)\b)/gi, ' ');

  // For many branched streets on ss.ge, only the base street is present in the list.
  // Drop the street-type suffix entirely so we search by the base name:
  //   "ასპინძის ქ."      -> "ასპინძის"
  //   "ასკანის ჩიხი"     -> "ასკანის"
  //   "ასათიანი ლ. ქ."   -> "ასათიანი ლ."
  s = s.replace(/\s+(ქ\.?|ქუჩა|გამზ\.?|ჩიხი|ჩ\.|შესახვევი|შეს\.?)$/i, '');

  // Remove trailing commas / periods and collapse spaces
  s = s.replace(/[,\.\s]+$/g, '');
  s = s.replace(/\s+/g, ' ').trim();

  if (s) {
    console.log('[Autofill] Normalized generic street address:', normalized, '→', s);
    return s;
  }

  // No known pattern matched – return original
  return normalized;
}

/**
 * Finds a form field by its label text
 * @param {string} labelText - The label text to search for
 * @returns {HTMLElement|null} The found field or null
 */
function findFieldByLabel(labelText) {
  const labels = Array.from(document.querySelectorAll('label'));
  const label = labels.find(l => l.textContent.includes(labelText));
  
  if (label) {
    const fieldId = label.getAttribute('for');
    if (fieldId) {
      return document.getElementById(fieldId);
    }
    return label.querySelector('input, select, textarea');
  }
  
  const byPlaceholder = document.querySelector(`input[placeholder*="${labelText}"], textarea[placeholder*="${labelText}"]`);
  if (byPlaceholder) return byPlaceholder;
  
  const byName = document.querySelector(`input[name*="${labelText}"], select[name*="${labelText}"], textarea[name*="${labelText}"]`);
  if (byName) return byName;
  
  return null;
}

/**
 * Finds a checkbox by its label text
 * @param {string} labelText - The label text to search for
 * @returns {HTMLElement|null} The found checkbox or null
 */
function findCheckboxByLabel(labelText) {
  const labels = Array.from(document.querySelectorAll('label'));
  const label = labels.find(l => l.textContent.includes(labelText));
  
  if (label) {
    const checkbox = label.querySelector('input[type="checkbox"]');
    if (checkbox) return checkbox;
    
    const fieldId = label.getAttribute('for');
    if (fieldId) {
      return document.getElementById(fieldId);
    }
  }
  
  const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
  return checkboxes.find(cb => {
    const parent = cb.closest('div, label, span');
    return parent && parent.textContent.includes(labelText);
  }) || null;
}

/**
 * Uploads images to the file input using the URLs directly
 * Uses background script to bypass CORS
 * @param {Array<string>} imageUrls - Array of image URLs to upload
 */
async function uploadImages(imageUrls) {
  if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    console.log('[Autofill] No images to upload');
    return;
  }

  console.log('[Autofill] Starting image upload process...');
  console.log('[Autofill] Image URLs:', imageUrls);

  // Find the file input - try multiple selectors
  let fileInput = document.querySelector('#create-app-images input[type="file"]');
  if (!fileInput) {
    // Try alternative selectors
    fileInput = document.querySelector('input[type="file"][accept*="image"]');
  }
  if (!fileInput) {
    // Try finding any file input in the images section
    const imagesSection = document.querySelector('#create-app-images');
    if (imagesSection) {
      fileInput = imagesSection.querySelector('input[type="file"]');
    }
  }
  if (!fileInput) {
    console.error('[Autofill] Could not find file input for images');
    console.error('[Autofill] Available file inputs:', document.querySelectorAll('input[type="file"]').length);
    return;
  }

  console.log('[Autofill] Found file input:', fileInput);
  console.log('[Autofill] File input accepts:', fileInput.accept);
  console.log('[Autofill] File input multiple:', fileInput.multiple);

  try {
    console.log(`[Autofill] Requesting background script to fetch ${imageUrls.length} images...`);
    
    // Request background script to fetch images (bypasses CORS)
    const response = await chrome.runtime.sendMessage({
      action: 'fetchImages',
      urls: imageUrls
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to fetch images from background script');
    }

    console.log(`[Autofill] Background script fetched ${response.images.length} images`);

    // Convert base64 data back to File objects
    // Use fetch with data URL to avoid stack overflow with large images
    const files = await Promise.all(response.images.map(async (imageData, index) => {
      try {
        // Convert base64 to blob using fetch (more efficient for large files)
        const dataUrl = `data:${imageData.type};base64,${imageData.data}`;
        const fetchResponse = await fetch(dataUrl);
        const blob = await fetchResponse.blob();
        const file = new File([blob], imageData.name, { type: imageData.type });
        console.log(`[Autofill] Created file object: ${imageData.name}, size: ${file.size}`);
        return file;
      } catch (error) {
        console.error(`[Autofill] Error converting image ${imageData.name}:`, error);
        return null;
      }
    }));

    const validFiles = files.filter(file => file !== null);
    
    if (validFiles.length === 0) {
      console.error('[Autofill] No valid images could be loaded');
      return;
    }

    console.log(`[Autofill] Successfully converted ${validFiles.length} images, uploading to form...`);
    console.log('[Autofill] Files to upload:', validFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));

    // Create a DataTransfer object to set files
    const dataTransfer = new DataTransfer();
    validFiles.forEach(file => {
      dataTransfer.items.add(file);
    });

    console.log('[Autofill] DataTransfer created with', dataTransfer.files.length, 'files');

    // Set the files to the input
    fileInput.files = dataTransfer.files;
    
    console.log('[Autofill] Files set on input. Input now has', fileInput.files.length, 'files');
    console.log('[Autofill] File input files:', Array.from(fileInput.files).map(f => f.name));
    
    // Trigger multiple events to ensure the form recognizes the change
    const events = ['change', 'input', 'blur', 'focus'];
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      fileInput.dispatchEvent(event);
      console.log(`[Autofill] Dispatched ${eventType} event`);
    });

    // Also try triggering on the parent container
    const uploadContainer = fileInput.closest('.sc-c2cf8f33-6, .sc-8e765712-1');
    if (uploadContainer) {
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer
      });
      uploadContainer.dispatchEvent(dropEvent);
      console.log('[Autofill] Dispatched drop event on container');
    }

    // Wait a bit and check if files are still there
    setTimeout(() => {
      console.log('[Autofill] After 1 second, file input has', fileInput.files.length, 'files');
      if (fileInput.files.length > 0) {
        console.log('[Autofill] ✅ Images successfully uploaded!');
      } else {
        console.warn('[Autofill] ⚠️ Files may have been cleared. Trying alternative method...');
        // Try setting files again
        fileInput.files = dataTransfer.files;
      }
    }, 1000);

    console.log(`[Autofill] ✅ Upload process completed for ${validFiles.length} images`);
  } catch (error) {
    console.error('[Autofill] Error uploading images:', error);
    console.error('[Autofill] Error stack:', error.stack);
  }
}

// Expose function globally for injection
if (typeof window !== 'undefined') {
  window.autofillListingForm = autofillListingForm;
}

