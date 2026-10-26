import type PizZip from 'pizzip';

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

/**
 * Pre-processes docx XML in-place, converting all supported placeholder formats
 * to the canonical {{FIELD_NAME}} syntax.
 *
 * Supported formats:
 * 1. Complex MERGEFIELD (fldChar begin / instrText / separate / end)
 * 2. Simple MERGEFIELD (<w:fldSimple w:instr="MERGEFIELD X">)
 * 3. «FIELD_NAME» (guillemet markers)
 * 4. ${FIELD_NAME}
 * 5. <<FIELD_NAME>>
 *
 * Does NOT auto-detect single-brace {FIELD_NAME} (too many false positives).
 */
export function normalizeFieldsInDocx(zip: PizZip): void {
  const xmlParts = [
    'word/document.xml',
    'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
    'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml',
  ];

  for (const partName of xmlParts) {
    const file = zip.file(partName);
    if (!file) continue;

    let xmlText = file.asText();
    const original = xmlText;

    // Phase 1: Normalize complex MERGEFIELD (fldChar-based) using DOM
    xmlText = normalizeComplexMergeFields(xmlText);

    // Phase 2: Normalize simple MERGEFIELD (<w:fldSimple>)
    xmlText = normalizeSimpleMergeFields(xmlText);

    // Phase 3: Normalize text-based formats in <w:t> elements
    xmlText = normalizeTextPlaceholders(xmlText);

    if (xmlText !== original) {
      zip.file(partName, xmlText);
    }
  }
}

/**
 * Normalize complex MERGEFIELD patterns:
 * <w:fldChar w:fldCharType="begin"/> ... <w:instrText> MERGEFIELD Name </w:instrText>
 * ... <w:fldChar w:fldCharType="separate"/> ... display text ... <w:fldChar w:fldCharType="end"/>
 *
 * Replaces the entire structure with a single run containing {{FIELD_NAME}}.
 */
function normalizeComplexMergeFields(xmlText: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');

  // Check for parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) return xmlText;

  let modified = false;

  // Find all fldChar elements with begin type
  const allRuns = getAllElements(doc, 'r');
  let i = 0;

  while (i < allRuns.length) {
    const run = allRuns[i];
    const fldChar = getChildElement(run, 'fldChar');

    if (!fldChar || getWAttr(fldChar, 'fldCharType') !== 'begin') {
      i++;
      continue;
    }

    // Found a begin fldChar — collect all runs until end
    const fieldRuns: Element[] = [run];
    let instrText = '';
    let separateIdx = -1;
    let endFound = false;
    let depth = 1;

    for (let j = i + 1; j < allRuns.length && !endFound; j++) {
      const r = allRuns[j];
      fieldRuns.push(r);

      const fc = getChildElement(r, 'fldChar');
      if (fc) {
        const type = getWAttr(fc, 'fldCharType');
        if (type === 'begin') {
          depth++;
        } else if (type === 'separate') {
          if (depth === 1) separateIdx = fieldRuns.length - 1;
        } else if (type === 'end') {
          depth--;
          if (depth === 0) endFound = true;
        }
      }

      // Collect instrText from runs between begin and separate
      if (separateIdx < 0) {
        const instrEl = getChildElement(r, 'instrText');
        if (instrEl) instrText += instrEl.textContent || '';
      }
    }

    if (!endFound) {
      i++;
      continue;
    }

    // Parse the MERGEFIELD instruction
    const fieldName = extractMergeFieldName(instrText);
    if (!fieldName) {
      i++;
      continue;
    }

    // Try to preserve formatting from the display run (first run after separate)
    let rPrXml = '';
    if (separateIdx >= 0 && separateIdx + 1 < fieldRuns.length) {
      const displayRun = fieldRuns[separateIdx + 1];
      const rPr = getChildElement(displayRun, 'rPr');
      if (rPr) {
        rPrXml = new XMLSerializer().serializeToString(rPr);
      }
    }

    // Build replacement run
    const ns = run.namespaceURI || W_NS;
    const replacementRun = doc.createElementNS(ns, 'w:r');
    if (rPrXml) {
      const rPrFrag = parser.parseFromString(
        `<root xmlns:w="${ns}">${rPrXml}</root>`, 'text/xml'
      );
      const rPrEl = rPrFrag.documentElement.firstElementChild;
      if (rPrEl) replacementRun.appendChild(doc.importNode(rPrEl, true));
    }
    const tEl = doc.createElementNS(ns, 'w:t');
    tEl.setAttribute('xml:space', 'preserve');
    tEl.textContent = `{{${fieldName}}}`;
    replacementRun.appendChild(tEl);

    // Replace: insert replacement before first field run, remove all field runs
    const parent = fieldRuns[0].parentNode;
    if (parent) {
      parent.insertBefore(replacementRun, fieldRuns[0]);
      for (const fr of fieldRuns) {
        if (fr.parentNode === parent) parent.removeChild(fr);
      }
      modified = true;
    }

    // Re-scan from current position since DOM changed
    allRuns.splice(0, allRuns.length, ...getAllElements(doc, 'r'));
    // Don't increment i — re-check from current position
  }

  if (modified) {
    return new XMLSerializer().serializeToString(doc);
  }
  return xmlText;
}

/**
 * Normalize simple MERGEFIELD: <w:fldSimple w:instr="MERGEFIELD FieldName">...</w:fldSimple>
 * Replace with a run containing {{FIELD_NAME}}.
 */
function normalizeSimpleMergeFields(xmlText: string): string {
  // Match <w:fldSimple w:instr="...MERGEFIELD...">...</w:fldSimple>
  return xmlText.replace(
    /<w:fldSimple\s[^>]*w:instr="([^"]*MERGEFIELD[^"]*)"[^>]*>([\s\S]*?)<\/w:fldSimple>/gi,
    (_match, instr: string, _inner: string) => {
      const fieldName = extractMergeFieldName(instr);
      if (!fieldName) return _match;
      return `<w:r><w:t xml:space="preserve">{{${fieldName}}}</w:t></w:r>`;
    }
  );
}

/**
 * Normalize text-based placeholder formats within <w:t> elements:
 * - «FIELD_NAME» → {{FIELD_NAME}}
 * - ${FIELD_NAME} → {{FIELD_NAME}}
 * - <<FIELD_NAME>> → {{FIELD_NAME}}
 */
function normalizeTextPlaceholders(xmlText: string): string {
  return xmlText.replace(
    /(<w:t[^>]*>)([\s\S]*?)(<\/w:t>)/g,
    (_match, open: string, content: string, close: string) => {
      let updated = content;
      // «FIELD_NAME» → {{FIELD_NAME}}
      updated = updated.replace(/\u00AB([A-Za-z_][A-Za-z0-9_ ]*)\u00BB/g, '{{$1}}');
      // ${FIELD_NAME} → {{FIELD_NAME}}
      updated = updated.replace(/\$\{([A-Za-z_][A-Za-z0-9_ ]*)\}/g, '{{$1}}');
      // <<FIELD_NAME>> → {{FIELD_NAME}}
      updated = updated.replace(/<<([A-Za-z_][A-Za-z0-9_ ]*)>>/g, '{{$1}}');
      if (updated !== content) {
        return `${open}${updated}${close}`;
      }
      return _match;
    }
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractMergeFieldName(instrText: string): string | null {
  // instrText looks like: " MERGEFIELD FieldName " or " MERGEFIELD "FieldName" \* MERGEFORMAT"
  const match = instrText.match(/MERGEFIELD\s+"?([^"\\*]+)"?\s*/i);
  if (!match) return null;
  return match[1].trim();
}

function getAllElements(root: Document | Element, localName: string): Element[] {
  const ns = root instanceof Document
    ? root.getElementsByTagNameNS(W_NS, localName)
    : root.getElementsByTagNameNS(W_NS, localName);
  const result = Array.from(ns);
  if (result.length > 0) return result;
  // Fallback: prefixed tag name
  return Array.from(root.getElementsByTagName(`w:${localName}`));
}

function getChildElement(parent: Element, localName: string): Element | null {
  for (const ch of Array.from(parent.children)) {
    const ln = ch.localName || ch.nodeName.replace(/^[\w]+:/, '');
    if (ln === localName) return ch;
  }
  return null;
}

function getWAttr(el: Element, name: string): string | null {
  const v = el.getAttributeNS(W_NS, name);
  if (v !== null) return v;
  return el.getAttribute(`w:${name}`);
}
