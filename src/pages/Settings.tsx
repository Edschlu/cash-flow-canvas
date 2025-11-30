import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  async function loadProfile() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      setProfile({
        name: data.name || '',
        email: data.email || user.email || '',
      });
    } catch (error: any) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Profil aktualisiert');
    } catch (error: any) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!user) return;

    try {
      // Delete all user data first (RLS will handle cascade)
      await supabase.from('profiles').delete().eq('id', user.id);
      
      toast.success('Account wird gelöscht...');
      // Note: Actual user deletion requires admin API or edge function
      // For now we just log out
      await supabase.auth.signOut();
    } catch (error: any) {
      toast.error('Fehler beim Löschen des Accounts');
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-4xl font-bold mb-2">Einstellungen</h1>
        <p className="text-muted-foreground">Verwalte dein Profil und deine Präferenzen</p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>
            Aktualisiere deine persönlichen Informationen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Dein Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email kann momentan nicht geändert werden
              </p>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? 'Wird gespeichert...' : 'Profil speichern'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Präferenzen</CardTitle>
          <CardDescription>
            Passe deine Standard-Einstellungen an
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Standardwährung</Label>
            <Input value="EUR (€)" disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              Währungseinstellungen sind aktuell auf Euro festgelegt
            </p>
          </div>

          <div className="space-y-2">
            <Label>Standard-Planungshorizont</Label>
            <Input value="24 Monate" disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              Anzahl der Monate für neue Cashpläne
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible Aktionen – sei vorsichtig!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                Account löschen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Account wirklich löschen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Diese Aktion kann nicht rückgängig gemacht werden. Dies wird permanent deinen Account
                  und alle deine Projekte, Business Cases und Cashpläne löschen.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Permanent löschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
