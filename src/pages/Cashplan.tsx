import { useEffect, useState, useRef, KeyboardEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Trash2, BarChart3, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { formatCurrency, getMonthName } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface BusinessCase {
  id: string;
  name: string;
  project_id: string;
}

interface CashPlan {
  id: string;
  business_case_id: string;
  currency: string;
  start_month: string;
  months: number;
  initial_cash: number;
}

interface CashPlanRow {
  id: string;
  cash_plan_id: string;
  category: 'revenue' | 'cost' | 'headcount' | 'other';
  name: string;
  sort_order: number;
  monthly_values: number[];
}

export default function Cashplan() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [businessCases, setBusinessCases] = useState<BusinessCase[]>([]);
  const [selectedBusinessCaseId, setSelectedBusinessCaseId] = useState<string>('');
  const [cashPlan, setCashPlan] = useState<CashPlan | null>(null);
  const [rows, setRows] = useState<CashPlanRow[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [editingCell, setEditingCell] = useState<{ rowId: string; monthIndex: number } | null>(null);
  const cellRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    loadBusinessCases();
  }, [user]);

  useEffect(() => {
    if (selectedBusinessCaseId) {
      loadCashPlan();
    }
  }, [selectedBusinessCaseId]);

  async function loadBusinessCases() {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('business_cases')
        .select('id, name, project_id')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBusinessCases(data || []);
      
      if (data && data.length > 0) {
        setSelectedBusinessCaseId(data[0].id);
      }
    } catch (error: any) {
      toast.error('Fehler beim Laden der Business Cases');
    } finally {
      setLoading(false);
    }
  }

  async function loadCashPlan() {
    if (!selectedBusinessCaseId) return;

    try {
      // Load existing cash plan
      const { data: planData, error: planError } = await supabase
        .from('cash_plans')
        .select('*')
        .eq('business_case_id', selectedBusinessCaseId)
        .single();

      if (planError && planError.code !== 'PGRST116') throw planError;

      if (!planData) {
        // Create new cash plan if none exists
        const { data: newPlan, error: createError } = await supabase
          .from('cash_plans')
          .insert({
            business_case_id: selectedBusinessCaseId,
            currency: 'EUR',
            months: 24,
            initial_cash: 0,
          })
          .select()
          .single();

        if (createError) throw createError;
        setCashPlan(newPlan);
        setRows([]);
        return;
      }

      setCashPlan(planData);

      // Load rows
      const { data: rowsData, error: rowsError } = await supabase
        .from('cash_plan_rows')
        .select('*')
        .eq('cash_plan_id', planData.id)
        .order('sort_order', { ascending: true });

      if (rowsError) throw rowsError;
      setRows((rowsData || []).map(row => ({
        ...row,
        monthly_values: Array.isArray(row.monthly_values) ? row.monthly_values as number[] : []
      })));
    } catch (error: any) {
      toast.error('Fehler beim Laden des Cashplans');
    }
  }

  async function addRow(category: 'revenue' | 'cost' | 'headcount' | 'other') {
    if (!cashPlan) return;

    const categoryLabels = {
      revenue: 'Neue Umsatzzeile',
      cost: 'Neue Kostenzeile',
      headcount: 'Neue Personalzeile',
      other: 'Neue Zeile',
    };

    const maxSortOrder = Math.max(...rows.filter(r => r.category === category).map(r => r.sort_order), -1);

    try {
      const { data, error } = await supabase
        .from('cash_plan_rows')
        .insert({
          cash_plan_id: cashPlan.id,
          category,
          name: categoryLabels[category],
          sort_order: maxSortOrder + 1,
          monthly_values: Array(24).fill(0),
        })
        .select()
        .single();

      if (error) throw error;
      setRows([...rows, {
        ...data,
        monthly_values: Array.isArray(data.monthly_values) ? data.monthly_values as number[] : []
      }]);
      toast.success('Zeile hinzugefügt');
    } catch (error: any) {
      toast.error('Fehler beim Hinzufügen der Zeile');
    }
  }

  async function deleteRow(rowId: string) {
    try {
      const { error } = await supabase
        .from('cash_plan_rows')
        .delete()
        .eq('id', rowId);

      if (error) throw error;
      setRows(rows.filter(r => r.id !== rowId));
      toast.success('Zeile gelöscht');
    } catch (error: any) {
      toast.error('Fehler beim Löschen der Zeile');
    }
  }

  async function updateRowName(rowId: string, newName: string) {
    try {
      const { error } = await supabase
        .from('cash_plan_rows')
        .update({ name: newName })
        .eq('id', rowId);

      if (error) throw error;
      setRows(rows.map(r => r.id === rowId ? { ...r, name: newName } : r));
    } catch (error: any) {
      toast.error('Fehler beim Speichern');
    }
  }

  async function updateCellValue(rowId: string, monthIndex: number, value: number) {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;

    const newValues = [...row.monthly_values];
    newValues[monthIndex] = value;

    try {
      const { error } = await supabase
        .from('cash_plan_rows')
        .update({ monthly_values: newValues })
        .eq('id', rowId);

      if (error) throw error;
      setRows(rows.map(r => r.id === rowId ? { ...r, monthly_values: newValues } : r));
    } catch (error: any) {
      toast.error('Fehler beim Speichern');
    }
  }

  function handleCellKeyDown(e: KeyboardEvent<HTMLDivElement>, rowId: string, monthIndex: number) {
    const currentRowIndex = rows.findIndex(r => r.id === rowId);
    
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        const value = parseFloat(e.currentTarget.textContent || '0');
        updateCellValue(rowId, monthIndex, value);
        setEditingCell(null);
        break;
      
      case 'Escape':
        e.preventDefault();
        setEditingCell(null);
        break;
      
      case 'ArrowRight':
        if (monthIndex < 23) {
          e.preventDefault();
          const nextKey = `${rowId}-${monthIndex + 1}`;
          cellRefs.current[nextKey]?.focus();
        }
        break;
      
      case 'ArrowLeft':
        if (monthIndex > 0) {
          e.preventDefault();
          const prevKey = `${rowId}-${monthIndex - 1}`;
          cellRefs.current[prevKey]?.focus();
        }
        break;
      
      case 'ArrowDown':
        if (currentRowIndex < rows.length - 1) {
          e.preventDefault();
          const nextRowId = rows[currentRowIndex + 1].id;
          const nextKey = `${nextRowId}-${monthIndex}`;
          cellRefs.current[nextKey]?.focus();
        }
        break;
      
      case 'ArrowUp':
        if (currentRowIndex > 0) {
          e.preventDefault();
          const prevRowId = rows[currentRowIndex - 1].id;
          const prevKey = `${prevRowId}-${monthIndex}`;
          cellRefs.current[prevKey]?.focus();
        }
        break;
      
      case 'Tab':
        e.preventDefault();
        if (monthIndex < 23) {
          const nextKey = `${rowId}-${monthIndex + 1}`;
          cellRefs.current[nextKey]?.focus();
        } else if (currentRowIndex < rows.length - 1) {
          const nextRowId = rows[currentRowIndex + 1].id;
          const nextKey = `${nextRowId}-0`;
          cellRefs.current[nextKey]?.focus();
        }
        break;
    }
  }

  function calculateTotals(category: 'revenue' | 'cost' | 'headcount' | 'other'): number[] {
    return rows
      .filter(r => r.category === category)
      .reduce((acc, row) => {
        row.monthly_values.forEach((val, idx) => {
          acc[idx] = (acc[idx] || 0) + val;
        });
        return acc;
      }, Array(24).fill(0));
  }

  function calculateNetCashflow(): number[] {
    const revenues = calculateTotals('revenue');
    const costs = calculateTotals('cost');
    const headcount = calculateTotals('headcount');
    const other = calculateTotals('other');
    
    return revenues.map((rev, idx) => rev - costs[idx] - headcount[idx] - other[idx]);
  }

  function calculateCashBalance(): number[] {
    const netCashflow = calculateNetCashflow();
    const balances = [cashPlan?.initial_cash || 0];
    
    for (let i = 0; i < netCashflow.length; i++) {
      balances.push(balances[i] + netCashflow[i]);
    }
    
    return balances.slice(1);
  }

  function calculateRunway(): number {
    const cashBalance = calculateCashBalance();
    const netCashflow = calculateNetCashflow();
    
    const currentBalance = cashBalance[selectedMonth];
    if (currentBalance <= 0) return 0;
    
    const avgMonthlyBurn = netCashflow.slice(selectedMonth).reduce((sum, val) => sum + val, 0) / (24 - selectedMonth);
    
    if (avgMonthlyBurn >= 0) return Infinity;
    
    return Math.floor(currentBalance / Math.abs(avgMonthlyBurn));
  }

  const getMonthDate = (monthOffset: number) => {
    if (!cashPlan) return new Date();
    const startDate = new Date(cashPlan.start_month);
    return new Date(startDate.getFullYear(), startDate.getMonth() + monthOffset, 1);
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (businessCases.length === 0) {
    return (
      <div className="p-8 space-y-6 animate-fade-in">
        <h1 className="text-4xl font-bold">Cashplanung</h1>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Kein Business Case vorhanden</h3>
            <p className="text-muted-foreground">
              Erstelle zuerst einen Business Case, um mit der Cashplanung zu starten
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const revenueTotals = calculateTotals('revenue');
  const costTotals = calculateTotals('cost');
  const headcountTotals = calculateTotals('headcount');
  const otherTotals = calculateTotals('other');
  const netCashflow = calculateNetCashflow();
  const cashBalance = calculateCashBalance();
  const runway = calculateRunway();

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b bg-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Cashplanung</h1>
            <p className="text-muted-foreground">24-Monats-Finanzplanung mit Live-KPIs</p>
          </div>
          <div className="w-72">
            <Label>Business Case</Label>
            <Select value={selectedBusinessCaseId} onValueChange={setSelectedBusinessCaseId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {businessCases.map(bc => (
                  <SelectItem key={bc.id} value={bc.id}>{bc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Bar */}
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Umsatz</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(revenueTotals[selectedMonth] || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Kosten</span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency((costTotals[selectedMonth] || 0) + (headcountTotals[selectedMonth] || 0) + (otherTotals[selectedMonth] || 0))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Net-Cashflow</span>
              </div>
              <div className={cn(
                "text-2xl font-bold",
                (netCashflow[selectedMonth] || 0) >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(netCashflow[selectedMonth] || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Cash-Bestand</span>
              </div>
              <div className={cn(
                "text-2xl font-bold",
                (cashBalance[selectedMonth] || 0) >= 0 ? "text-blue-600" : "text-red-600"
              )}>
                {formatCurrency(cashBalance[selectedMonth] || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">Runway</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {runway === Infinity ? '∞' : `${runway}M`}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="inline-block min-w-full">
          <div className="overflow-x-auto border rounded-lg bg-card">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-20 bg-muted/50 backdrop-blur">
                <tr>
                  <th className="sticky left-0 z-30 bg-muted/50 backdrop-blur px-4 py-3 text-left font-semibold border-b border-r">
                    Kategorie / Zeile
                  </th>
                  {Array.from({ length: 24 }, (_, i) => {
                    const date = getMonthDate(i);
                    return (
                      <th
                        key={i}
                        onClick={() => setSelectedMonth(i)}
                        className={cn(
                          "px-4 py-3 text-center font-semibold border-b cursor-pointer transition-colors min-w-[100px]",
                          selectedMonth === i ? "bg-primary/10" : "hover:bg-muted"
                        )}
                      >
                        <div className="text-xs text-muted-foreground">{date.getFullYear()}</div>
                        <div>{getMonthName(date.getMonth())}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {/* Revenue Section */}
                <tr className="bg-green-50/50 dark:bg-green-950/20">
                  <td className="sticky left-0 z-10 bg-green-50/50 dark:bg-green-950/20 px-4 py-3 font-semibold border-r">
                    <div className="flex items-center justify-between">
                      <span>Umsätze</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => addRow('revenue')}
                        className="h-7"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                  {Array.from({ length: 24 }, (_, i) => (
                    <td key={i} className="border-l"></td>
                  ))}
                </tr>

                {rows.filter(r => r.category === 'revenue').map((row, idx) => (
                  <tr key={row.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-2 border-r">
                      <div className="flex items-center gap-2">
                        <Input
                          value={row.name}
                          onChange={(e) => updateRowName(row.id, e.target.value)}
                          className="h-8 text-sm"
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Zeile löschen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Diese Aktion kann nicht rückgängig gemacht werden.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteRow(row.id)}>
                                Löschen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                    {row.monthly_values.map((value, monthIdx) => (
                      <td key={monthIdx} className="border-l p-0">
                        <div
                          ref={el => cellRefs.current[`${row.id}-${monthIdx}`] = el}
                          contentEditable
                          suppressContentEditableWarning
                          onFocus={() => setEditingCell({ rowId: row.id, monthIndex: monthIdx })}
                          onBlur={(e) => {
                            const newValue = parseFloat(e.currentTarget.textContent || '0');
                            updateCellValue(row.id, monthIdx, newValue);
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, row.id, monthIdx)}
                          className="px-4 py-2 text-right cursor-text hover:bg-muted/50 focus:bg-primary/5 focus:outline-none min-h-[40px] flex items-center justify-end"
                        >
                          {value.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}

                <tr className="bg-green-100/50 dark:bg-green-900/20 font-semibold">
                  <td className="sticky left-0 z-10 bg-green-100/50 dark:bg-green-900/20 px-4 py-2 border-r border-t">
                    Gesamt Umsatz
                  </td>
                  {revenueTotals.map((total, idx) => (
                    <td key={idx} className="px-4 py-2 text-right border-l border-t text-green-700 dark:text-green-400">
                      {formatCurrency(total)}
                    </td>
                  ))}
                </tr>

                {/* Cost Section */}
                <tr className="bg-red-50/50 dark:bg-red-950/20">
                  <td className="sticky left-0 z-10 bg-red-50/50 dark:bg-red-950/20 px-4 py-3 font-semibold border-r border-t">
                    <div className="flex items-center justify-between">
                      <span>Kosten</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => addRow('cost')}
                        className="h-7"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                  {Array.from({ length: 24 }, (_, i) => (
                    <td key={i} className="border-l border-t"></td>
                  ))}
                </tr>

                {rows.filter(r => r.category === 'cost').map((row, idx) => (
                  <tr key={row.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-2 border-r">
                      <div className="flex items-center gap-2">
                        <Input
                          value={row.name}
                          onChange={(e) => updateRowName(row.id, e.target.value)}
                          className="h-8 text-sm"
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Zeile löschen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Diese Aktion kann nicht rückgängig gemacht werden.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteRow(row.id)}>
                                Löschen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                    {row.monthly_values.map((value, monthIdx) => (
                      <td key={monthIdx} className="border-l p-0">
                        <div
                          ref={el => cellRefs.current[`${row.id}-${monthIdx}`] = el}
                          contentEditable
                          suppressContentEditableWarning
                          onFocus={() => setEditingCell({ rowId: row.id, monthIndex: monthIdx })}
                          onBlur={(e) => {
                            const newValue = parseFloat(e.currentTarget.textContent || '0');
                            updateCellValue(row.id, monthIdx, newValue);
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, row.id, monthIdx)}
                          className="px-4 py-2 text-right cursor-text hover:bg-muted/50 focus:bg-primary/5 focus:outline-none min-h-[40px] flex items-center justify-end"
                        >
                          {value.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}

                <tr className="bg-red-100/50 dark:bg-red-900/20 font-semibold">
                  <td className="sticky left-0 z-10 bg-red-100/50 dark:bg-red-900/20 px-4 py-2 border-r border-t">
                    Gesamt Kosten
                  </td>
                  {costTotals.map((total, idx) => (
                    <td key={idx} className="px-4 py-2 text-right border-l border-t text-red-700 dark:text-red-400">
                      {formatCurrency(total)}
                    </td>
                  ))}
                </tr>

                {/* Headcount Section */}
                <tr className="bg-blue-50/50 dark:bg-blue-950/20">
                  <td className="sticky left-0 z-10 bg-blue-50/50 dark:bg-blue-950/20 px-4 py-3 font-semibold border-r border-t">
                    <div className="flex items-center justify-between">
                      <span>Personal</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => addRow('headcount')}
                        className="h-7"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                  {Array.from({ length: 24 }, (_, i) => (
                    <td key={i} className="border-l border-t"></td>
                  ))}
                </tr>

                {rows.filter(r => r.category === 'headcount').map((row, idx) => (
                  <tr key={row.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-2 border-r">
                      <div className="flex items-center gap-2">
                        <Input
                          value={row.name}
                          onChange={(e) => updateRowName(row.id, e.target.value)}
                          className="h-8 text-sm"
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Zeile löschen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Diese Aktion kann nicht rückgängig gemacht werden.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteRow(row.id)}>
                                Löschen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                    {row.monthly_values.map((value, monthIdx) => (
                      <td key={monthIdx} className="border-l p-0">
                        <div
                          ref={el => cellRefs.current[`${row.id}-${monthIdx}`] = el}
                          contentEditable
                          suppressContentEditableWarning
                          onFocus={() => setEditingCell({ rowId: row.id, monthIndex: monthIdx })}
                          onBlur={(e) => {
                            const newValue = parseFloat(e.currentTarget.textContent || '0');
                            updateCellValue(row.id, monthIdx, newValue);
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, row.id, monthIdx)}
                          className="px-4 py-2 text-right cursor-text hover:bg-muted/50 focus:bg-primary/5 focus:outline-none min-h-[40px] flex items-center justify-end"
                        >
                          {value.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}

                <tr className="bg-blue-100/50 dark:bg-blue-900/20 font-semibold">
                  <td className="sticky left-0 z-10 bg-blue-100/50 dark:bg-blue-900/20 px-4 py-2 border-r border-t">
                    Gesamt Personal
                  </td>
                  {headcountTotals.map((total, idx) => (
                    <td key={idx} className="px-4 py-2 text-right border-l border-t text-blue-700 dark:text-blue-400">
                      {formatCurrency(total)}
                    </td>
                  ))}
                </tr>

                {/* Other Section */}
                <tr className="bg-gray-50/50 dark:bg-gray-950/20">
                  <td className="sticky left-0 z-10 bg-gray-50/50 dark:bg-gray-950/20 px-4 py-3 font-semibold border-r border-t">
                    <div className="flex items-center justify-between">
                      <span>Sonstiges</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => addRow('other')}
                        className="h-7"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                  {Array.from({ length: 24 }, (_, i) => (
                    <td key={i} className="border-l border-t"></td>
                  ))}
                </tr>

                {rows.filter(r => r.category === 'other').map((row, idx) => (
                  <tr key={row.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-2 border-r">
                      <div className="flex items-center gap-2">
                        <Input
                          value={row.name}
                          onChange={(e) => updateRowName(row.id, e.target.value)}
                          className="h-8 text-sm"
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Zeile löschen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Diese Aktion kann nicht rückgängig gemacht werden.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteRow(row.id)}>
                                Löschen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                    {row.monthly_values.map((value, monthIdx) => (
                      <td key={monthIdx} className="border-l p-0">
                        <div
                          ref={el => cellRefs.current[`${row.id}-${monthIdx}`] = el}
                          contentEditable
                          suppressContentEditableWarning
                          onFocus={() => setEditingCell({ rowId: row.id, monthIndex: monthIdx })}
                          onBlur={(e) => {
                            const newValue = parseFloat(e.currentTarget.textContent || '0');
                            updateCellValue(row.id, monthIdx, newValue);
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, row.id, monthIdx)}
                          className="px-4 py-2 text-right cursor-text hover:bg-muted/50 focus:bg-primary/5 focus:outline-none min-h-[40px] flex items-center justify-end"
                        >
                          {value.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}

                {otherTotals.some(t => t > 0) && (
                  <tr className="bg-gray-100/50 dark:bg-gray-900/20 font-semibold">
                    <td className="sticky left-0 z-10 bg-gray-100/50 dark:bg-gray-900/20 px-4 py-2 border-r border-t">
                      Gesamt Sonstiges
                    </td>
                    {otherTotals.map((total, idx) => (
                      <td key={idx} className="px-4 py-2 text-right border-l border-t text-gray-700 dark:text-gray-400">
                        {formatCurrency(total)}
                      </td>
                    ))}
                  </tr>
                )}

                {/* Final Totals */}
                <tr className="bg-primary/10 font-bold text-lg border-t-2">
                  <td className="sticky left-0 z-10 bg-primary/10 px-4 py-3 border-r">
                    Net-Cashflow
                  </td>
                  {netCashflow.map((cf, idx) => (
                    <td key={idx} className={cn(
                      "px-4 py-3 text-right border-l",
                      cf >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                    )}>
                      {formatCurrency(cf)}
                    </td>
                  ))}
                </tr>

                <tr className="bg-primary/20 font-bold text-lg">
                  <td className="sticky left-0 z-10 bg-primary/20 px-4 py-3 border-r">
                    Cash-Bestand
                  </td>
                  {cashBalance.map((balance, idx) => (
                    <td key={idx} className={cn(
                      "px-4 py-3 text-right border-l",
                      balance >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-700 dark:text-red-400"
                    )}>
                      {formatCurrency(balance)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
