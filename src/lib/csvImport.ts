import Papa from 'papaparse';

export interface ImportedRow {
  name: string;
  category: string;
  values: number[];
}

/**
 * Parse CSV data and return structured rows
 */
export function parseCSVForImport(csvText: string): ImportedRow[] {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  const rows: ImportedRow[] = [];

  parsed.data.forEach((row: any) => {
    const name = row['Name'] || row['name'] || '';
    const category = row['Kategorie'] || row['category'] || row['Category'] || 'other';
    
    // Extract all numeric columns as monthly values
    const values: number[] = [];
    Object.keys(row).forEach(key => {
      if (key.match(/^(Monat|Month|M)\s*\d+$/i) || key.match(/^\d+$/)) {
        const value = parseFloat(row[key]) || 0;
        values.push(value);
      }
    });

    if (name && values.length > 0) {
      rows.push({ name, category, values });
    }
  });

  return rows;
}
