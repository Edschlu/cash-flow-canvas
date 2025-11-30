import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Package, ShoppingCart, Zap, Users, FileText, Layers, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const businessCaseTypes = [
  { value: 'saas', label: 'SaaS', icon: Layers, description: 'Software as a Service' },
  { value: 'marketplace', label: 'Marketplace', icon: ShoppingCart, description: 'Marktplatz' },
  { value: 'ecommerce', label: 'E-Commerce', icon: Package, description: 'Online Shop' },
  { value: 'ai', label: 'AI-Produkt', icon: Zap, description: 'KI-basiertes Produkt' },
  { value: 'service', label: 'Service', icon: Users, description: 'Dienstleistung' },
  { value: 'custom', label: 'Benutzerdefiniert', icon: FileText, description: 'Leere Vorlage' },
];

interface Project {
  id: string;
  name: string;
}

interface BusinessCase {
  id: string;
  project_id: string;
  name: string;
  type: string;
  description: string;
  status: string;
  created_at: string;
  projects: { name: string };
}

export default function BusinessCases() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [businessCases, setBusinessCases] = useState<BusinessCase[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    project_id: '',
    name: '',
    type: 'custom',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;

    try {
      const [projectsData, casesData] = await Promise.all([
        supabase.from('projects').select('id, name').order('name'),
        supabase
          .from('business_cases')
          .select('*, projects(name)')
          .order('created_at', { ascending: false }),
      ]);

      if (projectsData.error) throw projectsData.error;
      if (casesData.error) throw casesData.error;

      setProjects(projectsData.data || []);
      setBusinessCases(casesData.data || []);
    } catch (error: any) {
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !formData.name || !formData.project_id) return;

    try {
      const { error } = await supabase.from('business_cases').insert([{
        project_id: formData.project_id,
        name: formData.name,
        type: formData.type as any,
        description: formData.description,
        status: 'draft',
      }]);

      if (error) throw error;
      toast.success('Business Case erstellt');
      setDialogOpen(false);
      setFormData({ project_id: '', name: '', type: 'custom', description: '' });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Erstellen');
    }
  }

  const getTypeInfo = (type: string) => {
    return businessCaseTypes.find((t) => t.value === type) || businessCaseTypes[5];
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Business Cases</h1>
          <p className="text-muted-foreground">Erstelle und verwalte deine Business Cases</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={projects.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Neuer Business Case
        </Button>
      </div>

      {projects.length === 0 && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="pt-6">
            <p className="text-sm">
              ⚠️ Du musst zuerst ein Projekt erstellen, bevor du Business Cases hinzufügen kannst.
            </p>
          </CardContent>
        </Card>
      )}

      {businessCases.length === 0 && projects.length > 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Noch keine Business Cases</h3>
            <p className="text-muted-foreground mb-4 text-center max-w-sm">
              Erstelle deinen ersten Business Case und wähle aus verschiedenen Vorlagen
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ersten Business Case erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {businessCases.map((businessCase) => {
            const typeInfo = getTypeInfo(businessCase.type);
            const Icon = typeInfo.icon;
            return (
              <Card key={businessCase.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <Badge variant="secondary">{typeInfo.label}</Badge>
                      </div>
                      <CardTitle>{businessCase.name}</CardTitle>
                      <CardDescription className="mt-2">
                        {businessCase.description || 'Keine Beschreibung'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-4">
                    <p>Projekt: {businessCase.projects.name}</p>
                    <Badge variant="outline" className="mt-2">
                      {businessCase.status === 'draft' ? 'Entwurf' : businessCase.status}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/memos/${businessCase.id}`)}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Strategiedokument
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Neuer Business Case</DialogTitle>
              <DialogDescription>
                Wähle eine Vorlage und erstelle einen neuen Business Case
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="project">Projekt</Label>
                <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Projekt wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Vorlage wählen</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {businessCaseTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = formData.type === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type.value })}
                        className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Icon className={`h-6 w-6 mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="font-medium text-sm">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. Q1 2025 SaaS Launch"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Beschreibe deinen Business Case..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Business Case erstellen</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
