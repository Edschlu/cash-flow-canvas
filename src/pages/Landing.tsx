import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, BarChart3, TrendingUp, Zap, Shield, Users, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b">
        <div className="container mx-auto px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-6">
              <Sparkles className="h-4 w-4" />
              <span>KI-gestützte Finanzplanung</span>
            </div>
            
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl mb-6">
              Baue deinen Business Case in{' '}
              <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
                Minuten
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Intuitive Cashplanung und Business Case Management für Gründer und Finanzteams.
              Von der Idee bis zum Exit.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg">
                <Link to="/auth">
                  Jetzt starten <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg">
                <Link to="/auth">Demo ansehen</Link>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Decorative gradient */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 to-transparent" />
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl mb-4">
              Alles was du brauchst
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Von Cashflow-Planung bis KPI-Tracking – alle Tools in einer intuitiven Oberfläche
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: BarChart3,
                title: 'Intuitive Cashplanung',
                description: 'Excel-Power in einer modernen Oberfläche. Plane 24+ Monate im Voraus mit Live-Berechnungen.',
              },
              {
                icon: TrendingUp,
                title: 'Live KPI-Dashboard',
                description: 'Umsatz, Kosten, Cashflow und Runway – alle wichtigen Kennzahlen auf einen Blick.',
              },
              {
                icon: Zap,
                title: 'Business Case Templates',
                description: 'Starte mit bewährten Vorlagen für SaaS, Marketplace, E-Commerce und mehr.',
              },
              {
                icon: Shield,
                title: 'Sichere Datenhaltung',
                description: 'Deine Finanzdaten sind verschlüsselt und DSGVO-konform gespeichert.',
              },
              {
                icon: Users,
                title: 'Team-Collaboration',
                description: 'Arbeite gemeinsam mit deinem Team an Projekten und Business Cases.',
              },
              {
                icon: Sparkles,
                title: 'KI-Unterstützung',
                description: 'Intelligente Vorschläge und Automatisierungen für schnellere Ergebnisse.',
              },
            ].map((feature) => (
              <Card key={feature.title} className="p-6 hover:shadow-lg transition-shadow">
                <feature.icon className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl mb-4">
              Für wen ist das?
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                title: 'Gründer',
                description: 'Erstelle professionelle Business Cases für Investoren und Partner in Minuten statt Tagen.',
              },
              {
                title: 'Finance Teams',
                description: 'Behalte die finanzielle Gesundheit aller Projekte im Blick – von Seed bis Series A.',
              },
              {
                title: 'Startup Teams',
                description: 'Plane Ressourcen, Budget und Wachstum transparent und nachvollziehbar.',
              },
            ].map((audience) => (
              <div key={audience.title} className="text-center">
                <h3 className="text-2xl font-semibold mb-3">{audience.title}</h3>
                <p className="text-muted-foreground">{audience.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-12 text-center">
            <div className="relative z-10">
              <h2 className="text-3xl font-bold sm:text-4xl mb-4">
                Bereit durchzustarten?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Erstelle deinen ersten Business Case in weniger als 5 Minuten.
                Keine Kreditkarte erforderlich.
              </p>
              <Button asChild size="lg" className="text-lg">
                <Link to="/auth">
                  Kostenlos starten <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 Business Planner. Alle Rechte vorbehalten.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Impressum</a>
              <a href="#" className="hover:text-foreground transition-colors">Datenschutz</a>
              <a href="#" className="hover:text-foreground transition-colors">AGB</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
