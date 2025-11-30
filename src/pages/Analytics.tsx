import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, BarChart3, DollarSign } from 'lucide-react';

export default function Analytics() {
  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold mb-2">Analytics & Kennzahlen</h1>
        <p className="text-muted-foreground">
          Überblick über deine wichtigsten KPIs und Metriken
        </p>
      </div>

      {/* Placeholder - will be implemented with real data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamtumsatz</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€0</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 text-success mr-1" />
              +0% zum Vormonat
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamtkosten</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€0</div>
            <p className="text-xs text-muted-foreground">
              <TrendingDown className="inline h-3 w-3 text-destructive mr-1" />
              +0% zum Vormonat
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cashflow</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€0</div>
            <p className="text-xs text-muted-foreground">
              Letzter Monat
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Runway</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">∞ Monate</div>
            <p className="text-xs text-muted-foreground">
              Bei aktuellem Burn Rate
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Analytics in Entwicklung</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            Detaillierte Charts und Metriken werden hier angezeigt, sobald du Cashpläne erstellt hast
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
