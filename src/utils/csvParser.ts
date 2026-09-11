import { EHoldingsPackageMeta, EHoldingsTitleRow } from '../types/folio';

export function parseCSVLines(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n in CRLF
      }
      currentRow.push(currentField.trim());
      if (currentRow.some(col => col.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(col => col.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Computes the full EBSCO KBID reference for an eHoldings title.
 * Standard eHoldings format is ProviderId-PackageId-TitleId (e.g. "36-434-8776980").
 * In eHoldings CSV exports, Package Id is often "36-434" (already containing the provider prefix).
 * Appending the package ID before the title ID produces the exact KBID expected by mod-agreements.
 */
export function computeEkbReference(
  titleId: string,
  packageMeta: EHoldingsPackageMeta | null,
  explicitReference?: string
): string {
  if (explicitReference && explicitReference.trim()) {
    return explicitReference.trim();
  }
  const cleanTitleId = (titleId || '').trim();
  if (!cleanTitleId) return '';

  // If titleId already has 3 components (e.g. 36-434-8776980), return as-is
  if (cleanTitleId.split('-').length === 3) {
    return cleanTitleId;
  }

  if (packageMeta?.packageId) {
    const pkgId = packageMeta.packageId.trim();
    if (pkgId.includes('-')) {
      // packageId already has provider prefix like "36-434" -> "36-434-8776980"
      return `${pkgId}-${cleanTitleId}`;
    } else if (packageMeta.providerId && packageMeta.providerId.trim()) {
      // packageId is "434" and providerId is "36" -> "36-434-8776980"
      return `${packageMeta.providerId.trim()}-${pkgId}-${cleanTitleId}`;
    } else {
      return `${pkgId}-${cleanTitleId}`;
    }
  }

  return cleanTitleId;
}

export function parseEHoldingsCsv(csvText: string): {
  packageMeta: EHoldingsPackageMeta | null;
  titles: EHoldingsTitleRow[];
  headers: string[];
} {
  const rawRows = parseCSVLines(csvText);
  if (rawRows.length === 0) {
    return { packageMeta: null, titles: [], headers: [] };
  }

  let packageMeta: EHoldingsPackageMeta | null = null;
  let titleHeaderRowIdx = -1;

  // Check if first row is Package Header
  const firstRow = rawRows[0] || [];
  const hasPackageHeader = firstRow.some(h => h.toLowerCase().includes('package') || h.toLowerCase().includes('provider'));

  if (hasPackageHeader && rawRows.length >= 3) {
    // Row 0 is package header, Row 1 is package data
    const pkgHeader = rawRows[0];
    const pkgData = rawRows[1] || [];

    const getPkgField = (keywords: string[]): string => {
      const idx = pkgHeader.findIndex(h => keywords.some(k => h.toLowerCase().includes(k)));
      return idx >= 0 && pkgData[idx] ? pkgData[idx] : '';
    };

    packageMeta = {
      providerName: getPkgField(['provider name']),
      providerId: getPkgField(['provider id']),
      packageName: getPkgField(['package name']),
      packageId: getPkgField(['package id']),
      contentType: getPkgField(['content type', 'package content type']),
      holdingsStatus: getPkgField(['holdings status', 'package holdings status'])
    };

    // Find the Title Name header row
    for (let r = 2; r < Math.min(rawRows.length, 6); r++) {
      if (rawRows[r].some(cell => cell.toLowerCase().includes('title name') || cell.toLowerCase() === 'title')) {
        titleHeaderRowIdx = r;
        break;
      }
    }
  } else {
    // Might be single table where Row 0 is title headers
    titleHeaderRowIdx = 0;
  }

  if (titleHeaderRowIdx === -1) {
    // fallback to first row with at least 3 columns
    titleHeaderRowIdx = rawRows.findIndex(r => r.length >= 3);
  }

  if (titleHeaderRowIdx === -1 || titleHeaderRowIdx >= rawRows.length) {
    return { packageMeta, titles: [], headers: [] };
  }

  const titleHeaders = rawRows[titleHeaderRowIdx];
  const findColIdx = (keywords: string[]): number => {
    return titleHeaders.findIndex(h => {
      const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      return keywords.some(k => lower.includes(k.replace(/[^a-z0-9]/g, '')));
    });
  };

  const titleNameIdx = findColIdx(['titlename', 'title']);
  const titleIdIdx = findColIdx(['titleid', 'id']);
  const pubTypeIdx = findColIdx(['publicationtype', 'pubtype']);
  const issnPrintIdx = findColIdx(['issnprint', 'printissn', 'issn']);
  const issnOnlineIdx = findColIdx(['issnonline', 'onlineissn', 'eissn']);
  const isbnPrintIdx = findColIdx(['isbnprint', 'printisbn', 'isbn']);
  const isbnOnlineIdx = findColIdx(['isbnonline', 'onlineisbn', 'eisbn']);
  const publisherIdx = findColIdx(['publisher']);
  const subjectsIdx = findColIdx(['subjects', 'subject']);
  const coverageIdx = findColIdx(['customcoverage', 'managedcoverage', 'coverage']);
  const urlIdx = findColIdx(['url', 'link']);

  // Columns for user additions
  const poLineIdx = findColIdx(['poline', 'polinenumber', 'purchaseorderline', 'orderline', 'polineid']);
  const agreementUuidIdx = findColIdx(['agreementuuid', 'agreementid', 'agreementrecorduuid', 'agreement', 'titleagreements']);
  const referenceColIdx = findColIdx(['ekbreference', 'reference', 'ekbtitleid', 'packagetitleid']);

  const titles: EHoldingsTitleRow[] = [];

  for (let r = titleHeaderRowIdx + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const titleName = titleNameIdx >= 0 ? row[titleNameIdx] || '' : row[0] || '';
    if (!titleName) continue; // skip blank line

    const titleId = titleIdIdx >= 0 ? row[titleIdIdx] || '' : `title-${r}`;
    const publicationType = pubTypeIdx >= 0 ? row[pubTypeIdx] || 'Journal' : 'Journal';
    const issnPrint = issnPrintIdx >= 0 ? row[issnPrintIdx] : undefined;
    const issnOnline = issnOnlineIdx >= 0 ? row[issnOnlineIdx] : undefined;
    const isbnPrint = isbnPrintIdx >= 0 ? row[isbnPrintIdx] : undefined;
    const isbnOnline = isbnOnlineIdx >= 0 ? row[isbnOnlineIdx] : undefined;
    const publisher = publisherIdx >= 0 ? row[publisherIdx] : undefined;
    const subjects = subjectsIdx >= 0 ? row[subjectsIdx] : undefined;
    const coverage = coverageIdx >= 0 ? row[coverageIdx] : undefined;
    const url = urlIdx >= 0 ? row[urlIdx] : undefined;

    // Compute external reference for mod-agreements (e.g. "36-434-8776980")
    const reference = computeEkbReference(
      titleId,
      packageMeta,
      referenceColIdx >= 0 ? (row[referenceColIdx] || '').trim() : undefined
    );

    const poLine = poLineIdx >= 0 ? (row[poLineIdx] || '').trim() : '';
    let agreementUuid = agreementUuidIdx >= 0 ? (row[agreementUuidIdx] || '').trim() : '';
    // If it was extracted from eHoldings default "Title Agreements" column, it might be "-" or empty
    if (agreementUuid === '-' || agreementUuid === 'none') {
      agreementUuid = '';
    }

    titles.push({
      id: `row-${r}-${titleId}`,
      titleName,
      titleId,
      publicationType,
      issnPrint,
      issnOnline,
      isbnPrint,
      isbnOnline,
      publisher,
      subjects,
      coverage,
      url,
      reference,
      authority: 'ekb-title',
      type: 'external',
      poLine,
      agreementUuid,
      status: poLine && agreementUuid ? 'ready' : 'pending'
    });
  }

  return {
    packageMeta,
    titles,
    headers: titleHeaders
  };
}

export function exportEnrichedCsv(
  packageMeta: EHoldingsPackageMeta | null,
  titles: EHoldingsTitleRow[]
): string {
  const lines: string[] = [];

  // If package meta exists, prepend package header + row
  if (packageMeta) {
    lines.push('Provider Level Token,Package Level Token,Provider Name,Provider Id,Package Name,Package Id,Package Type,Package Content Type,Package Holdings Status,Package Custom Coverage,Package Show To Patrons,Package Automatically Select,Package Proxy,Package Access Status Type,Package Tags,Package Agreements,Package Note');
    lines.push(
      `,"",${escapeCsv(packageMeta.providerName)},${escapeCsv(packageMeta.providerId)},${escapeCsv(packageMeta.packageName)},${escapeCsv(packageMeta.packageId)},Variable,${escapeCsv(packageMeta.contentType || 'E-Journal')},${escapeCsv(packageMeta.holdingsStatus || 'Selected')},,No,No,ezproxy(inherited),-,,,`
    );
  }

  // Title header with added PO Line & Agreement UUID & Full KBID Reference
  const headers = [
    'Title Name',
    'Title Id',
    'EKB Reference (Full KBID)',
    'Publication Type',
    'Publisher',
    'ISSN Print',
    'ISSN Online',
    'ISBN Print',
    'ISBN Online',
    'Coverage',
    'PO Line',
    'Agreement UUID',
    'Agreement Line ID',
    'Link Status'
  ];
  lines.push(headers.map(escapeCsv).join(','));

  for (const t of titles) {
    const fullKbid = t.reference || computeEkbReference(t.titleId, packageMeta);
    const row = [
      t.titleName,
      t.titleId,
      fullKbid,
      t.publicationType,
      t.publisher || '',
      t.issnPrint || '',
      t.issnOnline || '',
      t.isbnPrint || '',
      t.isbnOnline || '',
      t.coverage || '',
      t.poLine || '',
      t.agreementUuid || '',
      t.agreementLineId || '',
      t.status
    ];
    lines.push(row.map(escapeCsv).join(','));
  }

  return lines.join('\n');
}

function escapeCsv(val: string): string {
  if (!val) return '';
  if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
