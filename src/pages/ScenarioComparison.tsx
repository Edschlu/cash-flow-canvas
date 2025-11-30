import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, TrendingDown, Wallet, ArrowLeft } from 'lucide-react';
import { formatCurrency, getMonthName } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

interface BusinessCase {
  id: string;
  name: string;
}

interface CashPlan {
  id: string;
  business_case_id: string;
  initial_cash: number;
  start_month: string;
}

interface Scenario {
  id: string;
  cash_plan_id: string;
  name: string;
  type: 'base' | 'best' | 'worst' | 'custom';
  parameters: {
    revenue_growth?: number;
    cost_growth?: number;
    initial_cash_adjustment?: number;
  };
}

interface CashPlanRow {
  id: string;
  category: 'revenue' | 'cost' | 'headcount' | 'other';
  name: string;
  monthly_values: number[];
}

export default function ScenarioComparison() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [businessCases, setBusinessCases] = useState<BusinessCase[]>([]);
  const [selectedBusinessCaseId, setSelectedBusinessCaseId] = useState<string>('');
  const [cashPlan, setCashPlan] = useState<CashPlan | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<CashPlanRow[]>([]);

  useEffect(() => {
    loadBusinessCases();
  }, [user]);

  useEffect(() => {
    if (selectedBusinessCaseId) {
      loadData();
    }
  }, [selectedBusinessCaseId]);

  async function loadBusinessCases() {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('business_cases')
        .select('id, name')
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

  async function loadData() {
    if (!selectedBusinessCaseId) return;

    try {
      // Load cash plan
      const { data: planData, error: planError } = await supabase
        .from('cash_plans')
        .select('*')
        .eq('business_case_id', selectedBusinessCaseId)
        .maybeSingle();

      if (planError) throw planError;
      if (!planData) return;
      
      setCashPlan(planData);

      // Load scenarios
      const { data: scenariosData, error: scenariosError } = await supabase
        .from('scenarios')
        .select('*')
        .eq('cash_plan_id', planData.id)
        .order('created_at', { ascending: true });

      if (scenariosError) throw scenariosError;
      setScenarios((scenariosData || []) as Scenario[]);

      // Auto-select first 3 scenarios
      if (scenariosData && scenariosData.length > 0) {
        setSelectedScenarioIds(new Set(scenariosData.slice(0, 3).map(s => s.id)));
      }

      // Load base rows
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
      toast.error('Fehler beim Laden der Daten');
    }
  }

  function toggleScenario(scenarioId: string) {
    const newSelected = new Set(selectedScenarioIds);
    if (newSelected.has(scenarioId)) {
      newSelected.delete(scenarioId);
    } else {
      if (newSelected.size < 6) {
        newSelected.add(scenarioId);
      } else {
        toast.error('Maximal 6 Szenarien können verglichen werden');
        return;
      }
    }
    setSelectedScenarioIds(newSelected);
  }

  function calculateScenarioData(scenario: Scenario) {
    const revenueGrowth = (scenario.parameters.revenue_growth || 0) / 100;
    const costGrowth = (scenario.parameters.cost_growth || 0) / 100;
    const initialCashAdjustment = (scenario.parameters.initial_cash_adjustment || 0) / 100;

    const adjustedInitialCash = (cashPlan?.initial_cash || 0) * (1 + initialCashAdjustment);
    
    const revenues = rows.filter(r => r.category === 'revenue');
    const costs = rows.filter(r => r.category === 'cost');
    const headcount = rows.filter(r => r.category === 'headcount');
    const other = rows.filter(r => r.category === 'other');

    const monthlyData = Array.from({ length: 24 }, (_, month) => {
      const growthFactor = (1 + revenueGrowth) ** month;
      const costGrowthFactor = (1 + costGrowth) ** month;

      const revenue = revenues.reduce((sum, row) => 
        sum + (row.monthly_values[month] || 0) * growthFactor, 0
      );

      const cost = (
        costs.reduce((sum, row) => sum + (row.monthly_values[month] || 0), 0) +
        headcount.reduce((sum, row) => sum + (row.monthly_values[month] || 0), 0) +
        other.reduce((sum, row) => sum + (row.monthly_values[month] || 0), 0)
      ) * costGrowthFactor;

      return { revenue, cost, netCashflow: revenue - cost };
    });

    // Calculate cash balance
    let balance = adjustedInitialCash;
    const cashBalances = monthlyData.map(({ netCashflow }) => {
      balance += netCashflow;
      return balance;
    });

    // Calculate break-even
    const breakEvenMonth = cashBalances.findIndex((bal, idx) => idx > 0 && bal >= adjustedInitialCash && monthlyData[idx].netCashflow > 0);

    // Calculate runway
    let lastPositiveBalanceIndex = -1;
    for (let i = cashBalances.length - 1; i >= 0; i--) {
      if (cashBalances[i] > 0) {
        lastPositiveBalanceIndex = i;
        break;
      }
    }
    const runway = lastPositiveBalanceIndex >= 0 ? lastPositiveBalanceIndex + 1 : 0;

    return { monthlyData, cashBalances, breakEvenMonth, runway, adjustedInitialCash };
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
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const selectedScenarios = scenarios.filter(s => selectedScenarioIds.has(s.id));
  const scenarioData = selectedScenarios.map(scenario => ({
    scenario,
    data: calculateScenarioData(scenario),
  }));

  // Prepare chart data
  const chartData = Array.from({ length: 24 }, (_, month) => {
    const date = getMonthDate(month);
    const dataPoint: any = {
      month: getMonthName(date.getMonth()),
      monthIndex: month,
    };

    scenarioData.forEach(({ scenario, data }) => {
      dataPoint[`${scenario.name}_cashflow`] = data.monthlyData[month].netCashflow;
      dataPoint[`${scenario.name}_balance`] = data.cashBalances[month];
      dataPoint[`${scenario.name}_revenue`] = data.monthlyData[month].revenue;
      dataPoint[`${scenario.name}_cost`] = data.monthlyData[month].cost;
    });

    return dataPoint;
  });

  const scenarioColors = [
    'hsl(var(--primary))',
    'hsl(var(--success))',
    'hsl(var(--destructive))',
    'hsl(var(--warning))',
    'hsl(190, 95%, 55%)',
    'hsl(280, 70%, 50%)',
  ];

  return (
    <div className="h-full flex flex-col bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/cashplan')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Szenario-Vergleich</h1>
            <p className="text-muted-foreground">Vergleiche verschiedene Planungsszenarien</p>
          </div>
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

      {/* Scenario Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Szenarien auswählen</CardTitle>
          <CardDescription>Wähle bis zu 6 Szenarien zum Vergleichen (aktuell: {selectedScenarioIds.size})</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  selectedScenarioIds.has(scenario.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => toggleScenario(scenario.id)}
              >
                <Checkbox
                  checked={selectedScenarioIds.has(scenario.id)}
                  onCheckedChange={() => toggleScenario(scenario.id)}
                />
                <div className="flex-1">
                  <div className="font-medium">{scenario.name}</div>
                  <Badge variant="outline" className="text-xs mt-1">
                    {scenario.type === 'base' && 'Basis'}
                    {scenario.type === 'best' && 'Best Case'}
                    {scenario.type === 'worst' && 'Worst Case'}
                    {scenario.type === 'custom' && 'Custom'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Cards */}
      {selectedScenarios.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-4">
            {scenarioData.map(({ scenario, data }, idx) => (
              <Card key={scenario.id} className="border-l-4" style={{ borderLeftColor: scenarioColors[idx] }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">{scenario.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Break-Even:</span>
                    <span className="font-medium">
                      {data.breakEvenMonth >= 0 ? `Monat ${data.breakEvenMonth + 1}` : 'Nicht erreicht'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Runway:</span>
                    <span className="font-medium">{data.runway} Monate</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start-Cash:</span>
                    <span className="font-medium">{formatCurrency(data.adjustedInitialCash)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <Tabs defaultValue="cashflow" className="space-y-4">
            <TabsList>
              <TabsTrigger value="cashflow">Cashflow-Entwicklung</TabsTrigger>
              <TabsTrigger value="revenue-cost">Umsatz vs. Kosten</TabsTrigger>
              <TabsTrigger value="balance">Cash-Bestand</TabsTrigger>
            </TabsList>

            <TabsContent value="cashflow" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Net-Cashflow Vergleich</CardTitle>
                  <CardDescription>Monatlicher Cashflow über 24 Monate</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`} />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                      {scenarioData.map(({ scenario }, idx) => (
                        <Line
                          key={scenario.id}
                          type="monotone"
                          dataKey={`${scenario.name}_cashflow`}
                          stroke={scenarioColors[idx]}
                          strokeWidth={2}
                          name={scenario.name}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="revenue-cost" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Umsatz vs. Kosten</CardTitle>
                  <CardDescription>Vergleich der monatlichen Umsätze und Kosten</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`} />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                      {scenarioData.map(({ scenario }, idx) => (
                        <>
                          <Bar
                            key={`${scenario.id}_revenue`}
                            dataKey={`${scenario.name}_revenue`}
                            fill={scenarioColors[idx]}
                            name={`${scenario.name} (Umsatz)`}
                            opacity={0.8}
                          />
                          <Bar
                            key={`${scenario.id}_cost`}
                            dataKey={`${scenario.name}_cost`}
                            fill={scenarioColors[idx]}
                            name={`${scenario.name} (Kosten)`}
                            opacity={0.4}
                          />
                        </>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="balance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cash-Bestand Entwicklung</CardTitle>
                  <CardDescription>Kumulierter Cash-Bestand über 24 Monate</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`} />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                      {scenarioData.map(({ scenario }, idx) => (
                        <Area
                          key={scenario.id}
                          type="monotone"
                          dataKey={`${scenario.name}_balance`}
                          stroke={scenarioColors[idx]}
                          fill={scenarioColors[idx]}
                          fillOpacity={0.2}
                          name={scenario.name}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
