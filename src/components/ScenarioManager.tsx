import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Trash2, TrendingUp, TrendingDown, BarChart3, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Scenario {
  id: string;
  cash_plan_id: string;
  name: string;
  type: 'base' | 'best' | 'worst' | 'custom';
  parameters: {
    revenue_growth?: number;
    cost_growth?: number;
    headcount_growth?: number;
    initial_cash_adjustment?: number;
  };
}

interface ScenarioManagerProps {
  cashPlanId: string;
  scenarios: Scenario[];
  selectedScenarioId: string | null;
  onScenarioSelect: (scenarioId: string) => void;
  onScenarioCreate: (scenario: Omit<Scenario, 'id'>) => Promise<void>;
  onScenarioUpdate: (scenarioId: string, updates: Partial<Scenario>) => Promise<void>;
  onScenarioDelete: (scenarioId: string) => Promise<void>;
}

export default function ScenarioManager({
  cashPlanId,
  scenarios,
  selectedScenarioId,
  onScenarioSelect,
  onScenarioCreate,
  onScenarioUpdate,
  onScenarioDelete,
}: ScenarioManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [newScenario, setNewScenario] = useState({
    name: '',
    type: 'custom' as const,
    parameters: {
      revenue_growth: 0,
      cost_growth: 0,
      headcount_growth: 0,
      initial_cash_adjustment: 0,
    },
  });

  const scenarioTypeLabels = {
    base: 'Basis',
    best: 'Best Case',
    worst: 'Worst Case',
    custom: 'Benutzerdefiniert',
  };

  const scenarioTypeColors = {
    base: 'bg-primary/10 text-primary border-primary/20',
    best: 'bg-success/10 text-success border-success/20',
    worst: 'bg-destructive/10 text-destructive border-destructive/20',
    custom: 'bg-warning/10 text-warning border-warning/20',
  };

  const presetScenarios = {
    best: {
      name: 'Best Case',
      type: 'best' as const,
      parameters: {
        revenue_growth: 15,
        cost_growth: 5,
        headcount_growth: 0,
        initial_cash_adjustment: 20,
      },
    },
    worst: {
      name: 'Worst Case',
      type: 'worst' as const,
      parameters: {
        revenue_growth: -10,
        cost_growth: 15,
        headcount_growth: 0,
        initial_cash_adjustment: -20,
      },
    },
  };

  const handleCreate = async () => {
    if (!newScenario.name.trim()) return;

    await onScenarioCreate({
      cash_plan_id: cashPlanId,
      ...newScenario,
    });

    setNewScenario({
      name: '',
      type: 'custom',
      parameters: {
        revenue_growth: 0,
        cost_growth: 0,
        headcount_growth: 0,
        initial_cash_adjustment: 0,
      },
    });
    setIsCreateOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingScenario) return;

    await onScenarioUpdate(editingScenario.id, {
      name: editingScenario.name,
      parameters: editingScenario.parameters,
    });

    setEditingScenario(null);
    setIsEditOpen(false);
  };

  const handlePresetCreate = async (preset: 'best' | 'worst') => {
    await onScenarioCreate({
      cash_plan_id: cashPlanId,
      ...presetScenarios[preset],
    });
  };

  const openEditDialog = (scenario: Scenario) => {
    setEditingScenario(scenario);
    setIsEditOpen(true);
  };

  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);

  return (
    <div className="space-y-4">
      {/* Active Scenario Display */}
      {selectedScenario && (
        <Card className={cn("border-2", scenarioTypeColors[selectedScenario.type])}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                <CardTitle className="text-lg">Aktives Szenario</CardTitle>
              </div>
              <Badge variant="outline" className={scenarioTypeColors[selectedScenario.type]}>
                {scenarioTypeLabels[selectedScenario.type]}
              </Badge>
            </div>
            <CardDescription className="font-semibold text-base">
              {selectedScenario.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {selectedScenario.parameters.revenue_growth !== 0 && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="text-muted-foreground">Umsatzwachstum:</span>
                  <span className="font-medium">{selectedScenario.parameters.revenue_growth}%</span>
                </div>
              )}
              {selectedScenario.parameters.cost_growth !== 0 && (
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span className="text-muted-foreground">Kostenwachstum:</span>
                  <span className="font-medium">{selectedScenario.parameters.cost_growth}%</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scenario Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Szenarien verwalten</CardTitle>
              <CardDescription>Erstelle und vergleiche verschiedene Planungsszenarien</CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Neues Szenario
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Neues Szenario erstellen</DialogTitle>
                  <DialogDescription>
                    Definiere Parameter für ein neues Planungsszenario
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Schnellauswahl</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handlePresetCreate('best')}
                        className="flex-1"
                      >
                        <TrendingUp className="h-4 w-4 mr-2 text-success" />
                        Best Case erstellen
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handlePresetCreate('worst')}
                        className="flex-1"
                      >
                        <TrendingDown className="h-4 w-4 mr-2 text-destructive" />
                        Worst Case erstellen
                      </Button>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={newScenario.name}
                        onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
                        placeholder="z.B. Konservatives Wachstum"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Szenario-Typ</Label>
                      <Select
                        value={newScenario.type}
                        onValueChange={(value: any) => setNewScenario({ ...newScenario, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="base">Basis</SelectItem>
                          <SelectItem value="best">Best Case</SelectItem>
                          <SelectItem value="worst">Worst Case</SelectItem>
                          <SelectItem value="custom">Benutzerdefiniert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Umsatzwachstum (monatlich)</Label>
                          <span className="text-sm font-medium">{newScenario.parameters.revenue_growth}%</span>
                        </div>
                        <Slider
                          value={[newScenario.parameters.revenue_growth]}
                          onValueChange={([value]) => 
                            setNewScenario({
                              ...newScenario,
                              parameters: { ...newScenario.parameters, revenue_growth: value }
                            })
                          }
                          min={-50}
                          max={50}
                          step={1}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Kostenwachstum (monatlich)</Label>
                          <span className="text-sm font-medium">{newScenario.parameters.cost_growth}%</span>
                        </div>
                        <Slider
                          value={[newScenario.parameters.cost_growth]}
                          onValueChange={([value]) => 
                            setNewScenario({
                              ...newScenario,
                              parameters: { ...newScenario.parameters, cost_growth: value }
                            })
                          }
                          min={-50}
                          max={50}
                          step={1}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Start-Cash Anpassung</Label>
                          <span className="text-sm font-medium">{newScenario.parameters.initial_cash_adjustment}%</span>
                        </div>
                        <Slider
                          value={[newScenario.parameters.initial_cash_adjustment]}
                          onValueChange={([value]) => 
                            setNewScenario({
                              ...newScenario,
                              parameters: { ...newScenario.parameters, initial_cash_adjustment: value }
                            })
                          }
                          min={-100}
                          max={100}
                          step={5}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Abbrechen
                  </Button>
                  <Button onClick={handleCreate} disabled={!newScenario.name.trim()}>
                    Erstellen
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-sm",
                  selectedScenarioId === scenario.id
                    ? scenarioTypeColors[scenario.type]
                    : "border-border hover:border-primary/20"
                )}
                onClick={() => onScenarioSelect(scenario.id)}
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={scenarioTypeColors[scenario.type]}>
                    {scenarioTypeLabels[scenario.type]}
                  </Badge>
                  <span className="font-medium">{scenario.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(scenario);
                    }}
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  {scenario.type !== 'base' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Szenario löschen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Das Szenario "{scenario.name}" wird permanent gelöscht.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onScenarioDelete(scenario.id)}>
                            Löschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingScenario && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Szenario bearbeiten</DialogTitle>
              <DialogDescription>
                Passe die Parameter für "{editingScenario.name}" an
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editingScenario.name}
                  onChange={(e) => setEditingScenario({ ...editingScenario, name: e.target.value })}
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Umsatzwachstum (monatlich)</Label>
                    <span className="text-sm font-medium">{editingScenario.parameters.revenue_growth}%</span>
                  </div>
                  <Slider
                    value={[editingScenario.parameters.revenue_growth || 0]}
                    onValueChange={([value]) => 
                      setEditingScenario({
                        ...editingScenario,
                        parameters: { ...editingScenario.parameters, revenue_growth: value }
                      })
                    }
                    min={-50}
                    max={50}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Kostenwachstum (monatlich)</Label>
                    <span className="text-sm font-medium">{editingScenario.parameters.cost_growth}%</span>
                  </div>
                  <Slider
                    value={[editingScenario.parameters.cost_growth || 0]}
                    onValueChange={([value]) => 
                      setEditingScenario({
                        ...editingScenario,
                        parameters: { ...editingScenario.parameters, cost_growth: value }
                      })
                    }
                    min={-50}
                    max={50}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Start-Cash Anpassung</Label>
                    <span className="text-sm font-medium">{editingScenario.parameters.initial_cash_adjustment}%</span>
                  </div>
                  <Slider
                    value={[editingScenario.parameters.initial_cash_adjustment || 0]}
                    onValueChange={([value]) => 
                      setEditingScenario({
                        ...editingScenario,
                        parameters: { ...editingScenario.parameters, initial_cash_adjustment: value }
                      })
                    }
                    min={-100}
                    max={100}
                    step={5}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleUpdate}>
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
