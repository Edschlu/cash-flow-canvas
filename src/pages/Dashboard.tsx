import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Folder, FileText, BarChart3, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatEuro } from '@/lib/formatters';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    projectsCount: 0,
    businessCasesCount: 0,
    cashPlansCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!user) return;
      
      try {
        const [projects, businessCases, cashPlans] = await Promise.all([
          supabase.from('projects').select('id', { count: 'exact', head: true }),
          supabase.from('business_cases').select('id', { count: 'exact', head: true }),
          supabase.from('cash_plans').select('id', { count: 'exact', head: true }),
        ]);

        setStats({
          projectsCount: projects.count || 0,
          businessCasesCount: businessCases.count || 0,
          cashPlansCount: cashPlans.count || 0,
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [user]);

  if (loading) {
    return (
      <div className="p-8 space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Willkommen zurück, {user?.user_metadata?.name || 'User'}!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projekte</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.projectsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aktive Projekte
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Business Cases</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.businessCasesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Erstellte Cases
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cashpläne</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.cashPlansCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aktive Pläne
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Schnellaktionen</CardTitle>
          <CardDescription>Starte schnell mit deiner Planung</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button asChild className="h-20 flex-col gap-2">
            <Link to="/projects">
              <Plus className="h-6 w-6" />
              <span>Neues Projekt</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-20 flex-col gap-2">
            <Link to="/business-cases">
              <FileText className="h-6 w-6" />
              <span>Business Case erstellen</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-20 flex-col gap-2">
            <Link to="/cashplan">
              <BarChart3 className="h-6 w-6" />
              <span>Cashplanung starten</span>
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Getting Started */}
      {stats.projectsCount === 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle>🚀 Los geht's!</CardTitle>
            <CardDescription>
              Erstelle dein erstes Projekt und starte mit der Planung
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              1. Erstelle ein Projekt für dein Vorhaben<br />
              2. Füge einen Business Case hinzu<br />
              3. Starte mit der Cashplanung
            </p>
            <Button asChild>
              <Link to="/projects">
                Erstes Projekt erstellen
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
