import * as XLSX from 'xlsx';

interface CashPlanRow {
  id: string;
  name: string;
  category: string;
  monthly_values: number[];
  sort_order: number;
}

interface CashPlan {
  id: string;
  months: number;
  currency: string;
  initial_cash: number;
  start_month: string;
}

const categoryLabels: Record<string, string> = {
  revenue: 'Umsatz',
  cost: 'Kosten',
  headcount: 'Headcount',
  other: 'Sonstige',
};

/**
 * Export cash plan to Excel
 */
export function exportToExcel(cashPlan: CashPlan, rows: CashPlanRow[], filename: string = 'cashflow.xlsx') {
  const worksheetData: any[] = [];
  
  // Header row
  const headerRow = ['Kategorie', 'Name'];
  for (let i = 0; i < cashPlan.months; i++) {
    headerRow.push(`Monat ${i + 1}`);
  }
  headerRow.push('Jahr 1 Total');
  worksheetData.push(headerRow);

  // Data rows grouped by category
  const categories = ['revenue', 'cost', 'headcount', 'other'];

  categories.forEach(category => {
    const categoryRows = rows.filter(r => r.category === category);
    
    categoryRows.forEach(row => {
      const dataRow = [categoryLabels[category], row.name];
      const values = row.monthly_values as number[];
      
      for (let i = 0; i < cashPlan.months; i++) {
        dataRow.push(values[i] || 0);
      }
      
      // Year 1 total
      const year1Total = values.slice(0, 12).reduce((sum, val) => sum + (val || 0), 0);
      dataRow.push(year1Total);
      
      worksheetData.push(dataRow);
    });

    // Category total row
    const totalRow = [categoryLabels[category], 'TOTAL'];
    for (let i = 0; i < cashPlan.months; i++) {
      const monthTotal = categoryRows.reduce((sum, row) => {
        const values = row.monthly_values as number[];
        return sum + (values[i] || 0);
      }, 0);
      totalRow.push(monthTotal);
    }
    
    const year1CategoryTotal = categoryRows.reduce((sum, row) => {
      const values = row.monthly_values as number[];
      return sum + values.slice(0, 12).reduce((s, v) => s + (v || 0), 0);
    }, 0);
    totalRow.push(year1CategoryTotal);
    
    worksheetData.push(totalRow);
    worksheetData.push([]); // Empty row between categories
  });

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cashflow');

  XLSX.writeFile(workbook, filename);
}
