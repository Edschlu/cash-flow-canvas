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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Trash2, BarChart3, TrendingUp, TrendingDown, Wallet, Copy, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const cellRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      const { data: planData, error: planError } = await supabase
        .from('cash_plans')
        .select('*')
        .eq('business_case_id', selectedBusinessCaseId)
        .single();

      if (planError && planError.code !== 'PGRST116') throw planError;

      if (!planData) {
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

  async function duplicateRow(rowId: string) {
    const row = rows.find(r => r.id === rowId);
    if (!row || !cashPlan) return;

    try {
      const { data, error } = await supabase
        .from('cash_plan_rows')
        .insert({
          cash_plan_id: cashPlan.id,
          category: row.category,
          name: `${row.name} (Kopie)`,
          sort_order: row.sort_order + 0.5,
          monthly_values: row.monthly_values,
        })
        .select()
        .single();

      if (error) throw error;
      setRows([...rows, {
        ...data,
        monthly_values: Array.isArray(data.monthly_values) ? data.monthly_values as number[] : []
      }]);
      toast.success('Zeile dupliziert');
    } catch (error: any) {
      toast.error('Fehler beim Duplizieren');
    }
  }

  function updateRowName(rowId: string, newName: string) {
    setRows(rows.map(r => r.id === rowId ? { ...r, name: newName } : r));
    debouncedSave(rowId, 'name', newName);
  }

  function updateCellValue(rowId: string, monthIndex: number, value: number) {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;

    const newValues = [...row.monthly_values];
    newValues[monthIndex] = value;

    setRows(rows.map(r => r.id === rowId ? { ...r, monthly_values: newValues } : r));
    debouncedSave(rowId, 'values', newValues);
  }

  function debouncedSave(rowId: string, field: 'name' | 'values', value: any) {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setIsSaving(true);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const updateData = field === 'name' 
          ? { name: value }
          : { monthly_values: value };

        const { error } = await supabase
          .from('cash_plan_rows')
          .update(updateData)
          .eq('id', rowId);

        if (error) throw error;
      } catch (error: any) {
        toast.error('Fehler beim Speichern');
      } finally {
        setIsSaving(false);
      }
    }, 800);
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

  function calculateYearTotal(values: number[]): number {
    return values.slice(0, 12).reduce((sum, val) => sum + val, 0);
  }

  function toggleCategory(category: string) {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category);
    } else {
      newCollapsed.add(category);
    }
    setCollapsedCategories(newCollapsed);
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

  const renderCategoryRows = (category: 'revenue' | 'cost' | 'headcount' | 'other', label: string, colorClass: string) => {
    const categoryRows = rows.filter(r => r.category === category);
    const isCollapsed = collapsedCategories.has(category);
    const totals = calculateTotals(category);
    const yearTotal = calculateYearTotal(totals);

    return (
      <>
        <tr className={cn("border-t-2", colorClass)}>
          <td className={cn("sticky left-0 z-10 px-4 py-3 font-semibold border-r", colorClass)}>
            <div className="flex items-center justify-between gap-2">
              <Collapsible open={!isCollapsed} onOpenChange={() => toggleCategory(category)}>
                <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                  {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span>{label}</span>
                </CollapsibleTrigger>
              </Collapsible>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => addRow(category)}
                      className="h-7 w-7 p-0"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zeile hinzufügen</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </td>
          {Array.from({ length: 24 }, (_, i) => (
            <td key={i} className="border-r border-border/40"></td>
          ))}
          <td className="border-l-2"></td>
        </tr>

        {!isCollapsed && categoryRows.map((row, idx) => (
          <tr key={row.id} className={cn("transition-colors hover:bg-muted/30", idx % 2 === 0 ? 'bg-background' : 'bg-muted/20')}>
            <td className="sticky left-0 z-10 bg-inherit px-2 py-1 border-r">
              <div className="flex items-center gap-1">
                <Input
                  value={row.name}
                  onChange={(e) => updateRowName(row.id, e.target.value)}
                  className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-primary/20"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => duplicateRow(row.id)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Duplizieren</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
              <td key={monthIdx} className="border-r border-border/40 p-0 group">
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
                  className="px-3 py-2 text-right text-sm cursor-text hover:bg-primary/5 focus:bg-primary/10 focus:outline-none focus:ring-1 focus:ring-primary/20 min-h-[36px] flex items-center justify-end transition-colors"
                >
                  {value.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </td>
            ))}
            <td className="px-3 py-2 text-right text-sm font-medium border-l-2 bg-muted/20">
              {formatCurrency(calculateYearTotal(row.monthly_values))}
            </td>
          </tr>
        ))}

        <tr className={cn("font-semibold border-t", colorClass)}>
          <td className={cn("sticky left-0 z-10 px-4 py-2 border-r", colorClass)}>
            Gesamt {label}
          </td>
          {totals.map((total, idx) => (
            <td key={idx} className="px-3 py-2 text-right text-sm border-r border-border/40">
              {formatCurrency(total)}
            </td>
          ))}
          <td className="px-3 py-2 text-right text-sm font-bold border-l-2 bg-muted/40">
            {formatCurrency(yearTotal)}
          </td>
        </tr>
      </>
    );
  };

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-background">
        {/* Sticky Header with KPI Bar */}
        <div className="sticky top-0 z-40 p-6 border-b bg-card/95 backdrop-blur-sm supports-[backdrop-filter]:bg-card/60 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Cashplanung</h1>
              <p className="text-muted-foreground flex items-center gap-2">
                24-Monats-Finanzplanung mit Live-KPIs
                {isSaving && (
                  <span className="text-xs text-primary animate-pulse">● Speichert...</span>
                )}
              </p>
            </div>
            <div className="w-72">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Business Case</Label>
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

          {/* KPI Cards */}
          <div className="grid grid-cols-5 gap-3">
            <Card className="border-l-4 border-l-success shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Umsatz</span>
                </div>
                <div className="text-2xl font-bold text-success">
                  {formatCurrency(revenueTotals[selectedMonth] || 0)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-destructive shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Kosten</span>
                </div>
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrency((costTotals[selectedMonth] || 0) + (headcountTotals[selectedMonth] || 0) + (otherTotals[selectedMonth] || 0))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-primary shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Net-Cashflow</span>
                </div>
                <div className={cn(
                  "text-2xl font-bold",
                  (netCashflow[selectedMonth] || 0) >= 0 ? "text-success" : "text-destructive"
                )}>
                  {formatCurrency(netCashflow[selectedMonth] || 0)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-primary-light shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="h-4 w-4 text-primary-light" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cash-Bestand</span>
                </div>
                <div className={cn(
                  "text-2xl font-bold",
                  (cashBalance[selectedMonth] || 0) >= 0 ? "text-primary-light" : "text-destructive"
                )}>
                  {formatCurrency(cashBalance[selectedMonth] || 0)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-warning shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-warning" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Runway</span>
                </div>
                <div className="text-2xl font-bold text-warning">
                  {runway === Infinity ? '∞' : `${runway}M`}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Scrollable Table Area */}
        <div className="flex-1 overflow-auto p-6">
          <div className="inline-block min-w-full">
            <div className="overflow-x-auto border rounded-lg bg-card shadow-sm">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-20 bg-muted/80 backdrop-blur-sm">
                  <tr>
                    <th className="sticky left-0 z-30 bg-muted/80 backdrop-blur-sm px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide border-b border-r text-muted-foreground">
                      Kategorie / Zeile
                    </th>
                    {Array.from({ length: 24 }, (_, i) => {
                      const date = getMonthDate(i);
                      return (
                        <th
                          key={i}
                          onClick={() => setSelectedMonth(i)}
                          className={cn(
                            "px-3 py-3 text-center font-medium border-b border-r border-border/40 cursor-pointer transition-all duration-200 min-w-[100px]",
                            selectedMonth === i 
                              ? "bg-primary/10 text-primary shadow-sm" 
                              : "hover:bg-muted/60"
                          )}
                        >
                          <div className="text-xs text-muted-foreground font-normal">{date.getFullYear()}</div>
                          <div className="text-sm">{getMonthName(date.getMonth())}</div>
                        </th>
                      );
                    })}
                    <th className="px-3 py-3 text-center font-medium border-b border-l-2 bg-muted/80 min-w-[120px]">
                      <div className="text-xs text-muted-foreground font-normal">Summe</div>
                      <div className="text-sm">Jahr 1</div>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {renderCategoryRows('revenue', 'Umsätze', 'bg-success/5')}
                  {renderCategoryRows('cost', 'Kosten', 'bg-destructive/5')}
                  {renderCategoryRows('headcount', 'Personal', 'bg-primary/5')}
                  {renderCategoryRows('other', 'Sonstiges', 'bg-muted/30')}

                  {/* Final Totals */}
                  <tr className="bg-primary/10 font-bold text-base border-t-2">
                    <td className="sticky left-0 z-10 bg-primary/10 px-4 py-3 border-r">
                      Net-Cashflow
                    </td>
                    {netCashflow.map((cf, idx) => (
                      <td key={idx} className={cn(
                        "px-3 py-3 text-right text-sm border-r border-border/40",
                        cf >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {formatCurrency(cf)}
                      </td>
                    ))}
                    <td className={cn(
                      "px-3 py-3 text-right text-sm font-bold border-l-2",
                      calculateYearTotal(netCashflow) >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {formatCurrency(calculateYearTotal(netCashflow))}
                    </td>
                  </tr>

                  <tr className="bg-primary/20 font-bold text-base border-t">
                    <td className="sticky left-0 z-10 bg-primary/20 px-4 py-3 border-r">
                      Cash-Bestand
                    </td>
                    {cashBalance.map((bal, idx) => (
                      <td key={idx} className={cn(
                        "px-3 py-3 text-right text-sm border-r border-border/40",
                        bal >= 0 ? "text-primary-light" : "text-destructive"
                      )}>
                        {formatCurrency(bal)}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-right text-sm font-bold border-l-2 text-muted-foreground">
                      -
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
