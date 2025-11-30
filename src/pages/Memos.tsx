import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Eye, Edit, Save } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Memo {
  id: string;
  business_case_id: string;
  problem: string;
  solution: string;
  market: string;
  competition: string;
  gtm: string;
  finances: string;
  risks: string;
}

type MemoSection = "problem" | "solution" | "market" | "competition" | "gtm" | "finances" | "risks";

const sections: { key: MemoSection; label: string; description: string }[] = [
  { key: "problem", label: "Problem", description: "Welches Problem löst ihr?" },
  { key: "solution", label: "Lösung", description: "Wie löst ihr das Problem?" },
  { key: "market", label: "Markt", description: "Wie groß ist der Markt?" },
  { key: "competition", label: "Wettbewerb", description: "Wer sind eure Konkurrenten?" },
  { key: "gtm", label: "Go-to-Market", description: "Wie erreicht ihr eure Kunden?" },
  { key: "finances", label: "Finanzen", description: "Finanzielle Planung und Ziele" },
  { key: "risks", label: "Risiken", description: "Welche Risiken gibt es?" },
];

export default function Memos() {
  const { businessCaseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [memo, setMemo] = useState<Memo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<MemoSection>("problem");
  const [previewMode, setPreviewMode] = useState(false);
  const [businessCaseName, setBusinessCaseName] = useState("");

  useEffect(() => {
    if (businessCaseId) {
      fetchMemo();
      fetchBusinessCase();
    }
  }, [businessCaseId]);

  const fetchBusinessCase = async () => {
    const { data, error } = await supabase
      .from("business_cases")
      .select("name")
      .eq("id", businessCaseId!)
      .single();

    if (!error && data) {
      setBusinessCaseName(data.name);
    }
  };

  const fetchMemo = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("memos")
      .select("*")
      .eq("business_case_id", businessCaseId!)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      toast({
        title: "Fehler",
        description: "Memo konnte nicht geladen werden",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (data) {
      setMemo(data as Memo);
    } else {
      // Create new memo
      const { data: newMemo, error: createError } = await supabase
        .from("memos")
        .insert({
          business_case_id: businessCaseId!,
          problem: "",
          solution: "",
          market: "",
          competition: "",
          gtm: "",
          finances: "",
          risks: "",
        })
        .select()
        .single();

      if (createError) {
        toast({
          title: "Fehler",
          description: "Memo konnte nicht erstellt werden",
          variant: "destructive",
        });
      } else {
        setMemo(newMemo as Memo);
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!memo) return;

    setSaving(true);
    const { error } = await supabase
      .from("memos")
      .update({
        problem: memo.problem,
        solution: memo.solution,
        market: memo.market,
        competition: memo.competition,
        gtm: memo.gtm,
        finances: memo.finances,
        risks: memo.risks,
      })
      .eq("id", memo.id);

    setSaving(false);

    if (error) {
      toast({
        title: "Fehler",
        description: "Memo konnte nicht gespeichert werden",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Gespeichert",
        description: "Memo wurde erfolgreich gespeichert",
      });
    }
  };

  const updateSection = (section: MemoSection, value: string) => {
    if (!memo) return;
    setMemo({ ...memo, [section]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Lädt...</div>
      </div>
    );
  }

  if (!memo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Memo nicht gefunden</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/business-cases/${businessCaseId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Strategiedokument</h1>
            <p className="text-muted-foreground">{businessCaseName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Bearbeiten
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Vorschau
              </>
            )}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Speichert..." : "Speichern"}
          </Button>
        </div>
      </div>

      <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as MemoSection)}>
        <TabsList className="grid w-full grid-cols-7 mb-6">
          {sections.map((section) => (
            <TabsTrigger key={section.key} value={section.key}>
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {sections.map((section) => (
          <TabsContent key={section.key} value={section.key}>
            <Card>
              <CardHeader>
                <CardTitle>{section.label}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {previewMode ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {memo[section.key] || "*Noch kein Inhalt vorhanden*"}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <Textarea
                    value={memo[section.key]}
                    onChange={(e) => updateSection(section.key, e.target.value)}
                    placeholder={`${section.description}\n\nMarkdown wird unterstützt:\n- **fett**\n- *kursiv*\n- Listen\n- Links\n- etc.`}
                    className="min-h-[400px] font-mono"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
