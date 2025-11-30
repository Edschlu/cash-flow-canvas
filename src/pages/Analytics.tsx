import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, Activity, Target, Flame } from 'lucide-react';
import { formatCurrency, getMonthName } from '@/lib/formatters';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BusinessCase {
  id: string;
  name: string;
}

interface CashPlan {
  id: string;
  business_case_id: string;
  start_month: string;
  months: number;
  initial_cash: number;
}

interface CashPlanRow {
  id: string;
  cash_plan_id: string;
  category: 'revenue' | 'cost' | 'headcount' | 'other';
  name: string;
  monthly_values: number[];
}

interface ChartDataPoint {
  month: string;
  [key: string]: number | string;
}

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [businessCases, setBusinessCases] = useState<BusinessCase[]>([]);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [cashPlansData, setCashPlansData] = useState<Map<string, { plan: CashPlan; rows: CashPlanRow[] }>>(new Map());

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;

    try {
      // Load business cases
      const { data: cases, error: casesError } = await supabase
        .from('business_cases')
        .select('id, name')
        .order('created_at', { ascending: false });

      if (casesError) throw casesError;
      setBusinessCases(cases || []);

      // Auto-select first 3 business cases
      const initialSelection = (cases || []).slice(0, 3).map(c => c.id);
      setSelectedCaseIds(initialSelection);

      // Load cash plans and rows for all business cases
      if (cases && cases.length > 0) {
        const plansMap = new Map();

        for (const businessCase of cases) {
          const { data: plan, error: planError } = await supabase
            .from('cash_plans')
            .select('*')
            .eq('business_case_id', businessCase.id)
            .single();

          if (planError && planError.code !== 'PGRST116') continue;
          if (!plan) continue;

          const { data: rows, error: rowsError } = await supabase
            .from('cash_plan_rows')
            .select('*')
            .eq('cash_plan_id', plan.id);

          if (rowsError) continue;

          plansMap.set(businessCase.id, {
            plan,
            rows: (rows || []).map(row => ({
              ...row,
              monthly_values: Array.isArray(row.monthly_values) ? row.monthly_values as number[] : []
            }))
          });
        }

        setCashPlansData(plansMap);
      }
    } catch (error: any) {
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }

  function toggleBusinessCase(caseId: string) {
    setSelectedCaseIds(prev =>
      prev.includes(caseId)
        ? prev.filter(id => id !== caseId)
        : [...prev, caseId]
    );
  }

  function calculateMetrics(caseId: string) {
    const data = cashPlansData.get(caseId);
    if (!data) return null;

    const revenues = data.rows
      .filter(r => r.category === 'revenue')
      .reduce((acc, row) => {
        row.monthly_values.forEach((val, idx) => {
          acc[idx] = (acc[idx] || 0) + val;
        });
        return acc;
      }, [] as number[]);

    const costs = data.rows
      .filter(r => r.category !== 'revenue')
      .reduce((acc, row) => {
        row.monthly_values.forEach((val, idx) => {
          acc[idx] = (acc[idx] || 0) + val;
        });
        return acc;
      }, [] as number[]);

    const netCashflow = revenues.map((rev, idx) => rev - (costs[idx] || 0));
    
    const cashBalance = [data.plan.initial_cash];
    for (let i = 0; i < netCashflow.length; i++) {
      cashBalance.push(cashBalance[i] + netCashflow[i]);
    }

    const totalRevenue = revenues.reduce((sum, val) => sum + val, 0);
    const totalCosts = costs.reduce((sum, val) => sum + val, 0);
    const avgMonthlyBurn = costs.reduce((sum, val) => sum + val, 0) / costs.length;

    // Calculate break-even month
    let breakEvenMonth = -1;
    for (let i = 0; i < netCashflow.length; i++) {
      if (netCashflow[i] >= 0) {
        breakEvenMonth = i;
        break;
      }
    }

    // Calculate runway
    const currentBalance = cashBalance[cashBalance.length - 1];
    const runway = avgMonthlyBurn > 0 ? Math.floor(currentBalance / avgMonthlyBurn) : Infinity;

    return {
      revenues,
      costs,
      netCashflow,
      cashBalance: cashBalance.slice(1),
      totalRevenue,
      totalCosts,
      avgMonthlyBurn,
      breakEvenMonth,
      runway,
      startMonth: new Date(data.plan.start_month)
    };
  }

  function prepareCashflowChart(): ChartDataPoint[] {
    if (selectedCaseIds.length === 0) return [];

    const maxMonths = Math.max(
      ...selectedCaseIds.map(id => cashPlansData.get(id)?.plan.months || 0)
    );

    const chartData: ChartDataPoint[] = [];

    for (let i = 0; i < maxMonths; i++) {
      const dataPoint: ChartDataPoint = { month: '' };

      selectedCaseIds.forEach(caseId => {
        const metrics = calculateMetrics(caseId);
        const businessCase = businessCases.find(bc => bc.id === caseId);
        
        if (metrics && businessCase) {
          const date = new Date(metrics.startMonth);
          date.setMonth(date.getMonth() + i);
          dataPoint.month = `${getMonthName(date.getMonth())} ${date.getFullYear()}`;
          dataPoint[businessCase.name] = metrics.netCashflow[i] || 0;
        }
      });

      if (dataPoint.month) chartData.push(dataPoint);
    }

    return chartData;
  }

  function prepareRevenueVsCostChart(): ChartDataPoint[] {
    if (selectedCaseIds.length === 0) return [];

    const maxMonths = Math.max(
      ...selectedCaseIds.map(id => cashPlansData.get(id)?.plan.months || 0)
    );

    const chartData: ChartDataPoint[] = [];

    for (let i = 0; i < maxMonths; i++) {
      const dataPoint: ChartDataPoint = { month: '' };

      selectedCaseIds.forEach(caseId => {
        const metrics = calculateMetrics(caseId);
        const businessCase = businessCases.find(bc => bc.id === caseId);
        
        if (metrics && businessCase) {
          const date = new Date(metrics.startMonth);
          date.setMonth(date.getMonth() + i);
          dataPoint.month = `${getMonthName(date.getMonth())} ${date.getFullYear()}`;
          dataPoint[`${businessCase.name} Umsatz`] = metrics.revenues[i] || 0;
          dataPoint[`${businessCase.name} Kosten`] = metrics.costs[i] || 0;
        }
      });

      if (dataPoint.month) chartData.push(dataPoint);
    }

    return chartData;
  }

  function prepareCashBalanceChart(): ChartDataPoint[] {
    if (selectedCaseIds.length === 0) return [];

    const maxMonths = Math.max(
      ...selectedCaseIds.map(id => cashPlansData.get(id)?.plan.months || 0)
    );

    const chartData: ChartDataPoint[] = [];

    for (let i = 0; i < maxMonths; i++) {
      const dataPoint: ChartDataPoint = { month: '' };

      selectedCaseIds.forEach(caseId => {
        const metrics = calculateMetrics(caseId);
        const businessCase = businessCases.find(bc => bc.id === caseId);
        
        if (metrics && businessCase) {
          const date = new Date(metrics.startMonth);
          date.setMonth(date.getMonth() + i);
          dataPoint.month = `${getMonthName(date.getMonth())} ${date.getFullYear()}`;
          dataPoint[businessCase.name] = metrics.cashBalance[i] || 0;
        }
      });

      if (dataPoint.month) chartData.push(dataPoint);
    }

    return chartData;
  }

  function prepareBurnRateChart(): ChartDataPoint[] {
    if (selectedCaseIds.length === 0) return [];

    const maxMonths = Math.max(
      ...selectedCaseIds.map(id => cashPlansData.get(id)?.plan.months || 0)
    );

    const chartData: ChartDataPoint[] = [];

    for (let i = 0; i < maxMonths; i++) {
      const dataPoint: ChartDataPoint = { month: '' };

      selectedCaseIds.forEach(caseId => {
        const metrics = calculateMetrics(caseId);
        const businessCase = businessCases.find(bc => bc.id === caseId);
        
        if (metrics && businessCase) {
          const date = new Date(metrics.startMonth);
          date.setMonth(date.getMonth() + i);
          dataPoint.month = `${getMonthName(date.getMonth())} ${date.getFullYear()}`;
          dataPoint[businessCase.name] = metrics.costs[i] || 0;
        }
      });

      if (dataPoint.month) chartData.push(dataPoint);
    }

    return chartData;
  }

  const colors = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (businessCases.length === 0) {
    return (
      <div className="p-8 space-y-6 animate-fade-in">
        <h1 className="text-4xl font-bold">Analytics & Kennzahlen</h1>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Keine Daten vorhanden</h3>
            <p className="text-muted-foreground">
              Erstelle Business Cases und Cashpläne, um Analytics zu sehen
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate aggregate metrics
  const aggregateMetrics = selectedCaseIds.map(id => calculateMetrics(id)).filter(m => m !== null);
  const totalRevenue = aggregateMetrics.reduce((sum, m) => sum + (m?.totalRevenue || 0), 0);
  const totalCosts = aggregateMetrics.reduce((sum, m) => sum + (m?.totalCosts || 0), 0);
  const avgBurnRate = aggregateMetrics.length > 0 
    ? aggregateMetrics.reduce((sum, m) => sum + (m?.avgMonthlyBurn || 0), 0) / aggregateMetrics.length 
    : 0;

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Analytics & Kennzahlen</h1>
          <p className="text-muted-foreground">
            Vergleiche und analysiere deine Business Cases
          </p>
        </div>
      </div>

      {/* Business Case Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Business Cases auswählen</CardTitle>
          <CardDescription>Wähle bis zu 6 Business Cases zum Vergleichen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {businessCases.map((bc, idx) => (
              <div key={bc.id} className="flex items-center space-x-2">
                <Checkbox
                  id={bc.id}
                  checked={selectedCaseIds.includes(bc.id)}
                  onCheckedChange={() => toggleBusinessCase(bc.id)}
                  disabled={!selectedCaseIds.includes(bc.id) && selectedCaseIds.length >= 6}
                />
                <Label
                  htmlFor={bc.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colors[idx % colors.length] }}
                  />
                  <span className="text-sm font-medium">{bc.name}</span>
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedCaseIds.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Wähle Business Cases aus</h3>
            <p className="text-muted-foreground">
              Wähle mindestens einen Business Case aus, um Analytics zu sehen
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gesamtumsatz</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  Über alle ausgewählten Cases
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gesamtkosten</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalCosts)}</div>
                <p className="text-xs text-muted-foreground">
                  Über alle ausgewählten Cases
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Cashflow</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-2xl font-bold",
                  (totalRevenue - totalCosts) >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(totalRevenue - totalCosts)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Über alle ausgewählten Cases
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ø Burn Rate</CardTitle>
                <Flame className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(avgBurnRate)}/M
                </div>
                <p className="text-xs text-muted-foreground">
                  Durchschnittlich pro Monat
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <Tabs defaultValue="cashflow" className="space-y-4">
            <TabsList>
              <TabsTrigger value="cashflow">Cashflow-Entwicklung</TabsTrigger>
              <TabsTrigger value="revenue-cost">Umsatz vs. Kosten</TabsTrigger>
              <TabsTrigger value="balance">Cash-Bestand</TabsTrigger>
              <TabsTrigger value="burn">Burn Rate</TabsTrigger>
              <TabsTrigger value="breakeven">Break-Even</TabsTrigger>
            </TabsList>

            <TabsContent value="cashflow" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cashflow-Entwicklung</CardTitle>
                  <CardDescription>
                    Monatlicher Net-Cashflow im Vergleich
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={prepareCashflowChart()}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="month" 
                        className="text-xs"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        className="text-xs"
                        tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                      <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                      {selectedCaseIds.map((caseId, idx) => {
                        const businessCase = businessCases.find(bc => bc.id === caseId);
                        return (
                          <Line
                            key={caseId}
                            type="monotone"
                            dataKey={businessCase?.name || ''}
                            stroke={colors[idx % colors.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="revenue-cost" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Umsatz vs. Kosten</CardTitle>
                  <CardDescription>
                    Vergleich der monatlichen Umsätze und Kosten
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={prepareRevenueVsCostChart()}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="month" 
                        className="text-xs"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        className="text-xs"
                        tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                      {selectedCaseIds.map((caseId, idx) => {
                        const businessCase = businessCases.find(bc => bc.id === caseId);
                        return (
                          <Bar
                            key={`${caseId}-revenue`}
                            dataKey={`${businessCase?.name} Umsatz`}
                            fill={colors[idx % colors.length]}
                            opacity={0.8}
                          />
                        );
                      })}
                      {selectedCaseIds.map((caseId, idx) => {
                        const businessCase = businessCases.find(bc => bc.id === caseId);
                        return (
                          <Bar
                            key={`${caseId}-cost`}
                            dataKey={`${businessCase?.name} Kosten`}
                            fill={colors[idx % colors.length]}
                            opacity={0.4}
                          />
                        );
                      })}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="balance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cash-Bestand</CardTitle>
                  <CardDescription>
                    Kumulierter Bargeldbestand über die Zeit
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={prepareCashBalanceChart()}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="month" 
                        className="text-xs"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        className="text-xs"
                        tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                      <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                      {selectedCaseIds.map((caseId, idx) => {
                        const businessCase = businessCases.find(bc => bc.id === caseId);
                        return (
                          <Area
                            key={caseId}
                            type="monotone"
                            dataKey={businessCase?.name || ''}
                            stroke={colors[idx % colors.length]}
                            fill={colors[idx % colors.length]}
                            fillOpacity={0.2}
                            strokeWidth={2}
                          />
                        );
                      })}
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="burn" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Burn Rate Analyse</CardTitle>
                  <CardDescription>
                    Monatliche Ausgaben (Kosten + Personal + Sonstiges)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={prepareBurnRateChart()}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="month" 
                        className="text-xs"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        className="text-xs"
                        tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                      {selectedCaseIds.map((caseId, idx) => {
                        const businessCase = businessCases.find(bc => bc.id === caseId);
                        return (
                          <Area
                            key={caseId}
                            type="monotone"
                            dataKey={businessCase?.name || ''}
                            stroke={colors[idx % colors.length]}
                            fill={colors[idx % colors.length]}
                            fillOpacity={0.3}
                            strokeWidth={2}
                          />
                        );
                      })}
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="breakeven" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Break-Even Analyse</CardTitle>
                  <CardDescription>
                    Wann erreicht jeder Business Case die Profitabilität?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedCaseIds.map((caseId, idx) => {
                      const businessCase = businessCases.find(bc => bc.id === caseId);
                      const metrics = calculateMetrics(caseId);
                      
                      if (!businessCase || !metrics) return null;

                      const breakEvenMonth = metrics.breakEvenMonth;
                      const hasBreakEven = breakEvenMonth >= 0;

                      return (
                        <div key={caseId} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: colors[idx % colors.length] }}
                            />
                            <div>
                              <h4 className="font-semibold">{businessCase.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {hasBreakEven
                                  ? `Break-Even in Monat ${breakEvenMonth + 1}`
                                  : 'Kein Break-Even in Planungszeitraum'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {hasBreakEven ? (
                              <Target className="h-8 w-8 text-green-500" />
                            ) : (
                              <Target className="h-8 w-8 text-muted-foreground" />
                            )}
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Runway</div>
                              <div className="text-lg font-bold">
                                {metrics.runway === Infinity ? '∞' : `${metrics.runway}M`}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
