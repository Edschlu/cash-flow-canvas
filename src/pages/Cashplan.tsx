import { Card, CardContent } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function Cashplan() {
  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold mb-2">Cashplanung</h1>
        <p className="text-muted-foreground">
          Intuitive 24-Monats-Planung mit Live-KPIs
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Cashplan Editor</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            Der Cashplan-Editor wird hier implementiert mit Excel-ähnlicher Tabelle, 
            inline editing, keyboard navigation und Live-KPI-Bar
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
