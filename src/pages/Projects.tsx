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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Trash2, Edit, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadProjects();
  }, [user]);

  async function loadProjects() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast.error('Fehler beim Laden der Projekte');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !formData.name) return;

    try {
      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update({
            name: formData.name,
            description: formData.description,
          })
          .eq('id', editingProject.id);

        if (error) throw error;
        toast.success('Projekt aktualisiert');
      } else {
        const { error } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            name: formData.name,
            description: formData.description,
          });

        if (error) throw error;
        toast.success('Projekt erstellt');
      }

      setDialogOpen(false);
      setFormData({ name: '', description: '' });
      setEditingProject(null);
      loadProjects();
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Speichern');
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Projekt gelöscht');
      loadProjects();
    } catch (error: any) {
      toast.error('Fehler beim Löschen');
    }
  }

  function openEditDialog(project: Project) {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
    });
    setDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingProject(null);
    setFormData({ name: '', description: '' });
    setDialogOpen(true);
  }

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
          <h1 className="text-4xl font-bold mb-2">Projekte</h1>
          <p className="text-muted-foreground">Verwalte deine Business-Projekte</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Neues Projekt
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingProject ? 'Projekt bearbeiten' : 'Neues Projekt'}
                </DialogTitle>
                <DialogDescription>
                  {editingProject
                    ? 'Bearbeite die Projektdetails'
                    : 'Erstelle ein neues Projekt für deine Business Cases'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Projektname</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="z.B. Mein SaaS Startup"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Beschreibung (optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Beschreibe dein Projekt..."
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingProject ? 'Speichern' : 'Erstellen'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Noch keine Projekte</h3>
            <p className="text-muted-foreground mb-4 text-center max-w-sm">
              Erstelle dein erstes Projekt, um mit der Planung zu starten
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Erstes Projekt erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription className="mt-2">
                      {project.description || 'Keine Beschreibung'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(project)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Projekt löschen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Dies löscht alle Business Cases und Cashpläne dieses Projekts. Diese Aktion kann nicht rückgängig gemacht werden.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(project.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Löschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p>Erstellt: {formatDate(project.created_at)}</p>
                  <p>Geändert: {formatDate(project.updated_at)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
