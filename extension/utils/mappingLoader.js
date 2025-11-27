/**
 * Parses a CSV line, handling quoted fields and brackets
 * @param {string} line - The CSV line to parse
 * @returns {string[]} Array of field values
 */
function parseCSVLine(line) {
  const fields = [];
  let currentField = '';
  let insideQuotes = false;
  let bracketDepth = 0;
  const bracketPairs = { '(': ')', '[': ']', '{': '}' };
  const openBrackets = new Set(Object.keys(bracketPairs));
  const closeBrackets = new Set(Object.values(bracketPairs));
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    const prevChar = i > 0 ? line[i - 1] : null;
    
    // Check if this character is escaped (preceded by backslash)
    const isEscaped = prevChar === '\\';
    
    if (char === '"' && !isEscaped) {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
        currentField += char;
      }
    } else if (char === ',' && !insideQuotes && bracketDepth === 0 && !isEscaped) {
      // Field separator - only split if not in quotes, not inside brackets, and not escaped
      fields.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
      
      // Track bracket depth (for CSS selectors with rgb(), etc.)
      // Don't count escaped brackets
      if (!insideQuotes && !isEscaped) {
        if (openBrackets.has(char)) {
          bracketDepth++;
        } else if (closeBrackets.has(char)) {
          bracketDepth--;
          if (bracketDepth < 0) {
            // Mismatched brackets, but continue anyway
            bracketDepth = 0;
          }
        }
      }
    }
  }
  
  // Add the last field
  fields.push(currentField.trim());
  
  return fields;
}

/**
 * Loads and parses the mappings.csv file
 * @returns {Promise<Object>} An object mapping attribute names to CSS selectors
 */
export async function loadMappings() {
  try {
    const response = await fetch(chrome.runtime.getURL('mappings.csv'));
    if (!response.ok) {
      throw new Error(`Failed to load mappings.csv: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    console.log('[mappingLoader] Raw CSV text length:', csvText.length, 'characters');
    console.log('[mappingLoader] Raw CSV preview (first 200 chars):', csvText.substring(0, 200));
    
    const lines = csvText.trim().split('\n').filter(line => line.trim());
    console.log('[mappingLoader] Number of lines:', lines.length);
    
    if (lines.length < 2) {
      throw new Error('mappings.csv must have at least 2 lines (header and data)');
    }
    
    // Parse header row
    const headers = parseCSVLine(lines[0]);
    console.log('[mappingLoader] Parsed headers:', headers);
    console.log('[mappingLoader] Number of headers:', headers.length);
    
    // Parse selectors row
    const selectors = parseCSVLine(lines[1]);
    console.log('[mappingLoader] Number of selectors:', selectors.length);
    console.log('[mappingLoader] First 3 selectors:');
    selectors.slice(0, 3).forEach((selector, index) => {
      console.log(`  [${index}] (${selector.length} chars):`, selector.substring(0, 100) + (selector.length > 100 ? '...' : ''));
    });
    
    // Debug: Check if counts match
    if (headers.length !== selectors.length) {
      console.warn(`[mappingLoader] Header count (${headers.length}) doesn't match selector count (${selectors.length})`);
    }
    
    // Create mapping object
    const mappings = {};
    headers.forEach((header, index) => {
      const selector = selectors[index];
      if (header && selector) {
        mappings[header] = selector;
      }
    });
    
    console.log('[mappingLoader] Final mappings object:');
    console.log('[mappingLoader] Total mappings:', Object.keys(mappings).length);
    console.log('[mappingLoader] Mappings:', mappings);
    
    return mappings;
  } catch (error) {
    console.error('[mappingLoader] Error loading mappings:', error);
    throw error;
  }
}

