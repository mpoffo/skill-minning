import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { 
  Plus, 
  Trash2, 
  Search, 
  Sparkles, 
  Eye, 
  ChevronDown, 
  ChevronRight,
  Shield,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  FileText
} from "lucide-react";

// Mock data - cargos de exemplo
const MOCK_JOB_POSITIONS = [
  { id: 1, title: "Analista Financeiro CAS" },
  { id: 2, title: "Desenvolvedor Senior TOTVS" },
  { id: 3, title: "Gerente de Projetos - Divisão Alfa" },
  { id: 4, title: "Coordenador RH XYZ Corp" },
  { id: 5, title: "Analista de Sistemas SAP" },
  { id: 6, title: "Engenheiro de Software ABC Tech" },
  { id: 7, title: "Especialista em BI - Unidade Norte" },
  { id: 8, title: "Consultor ERP Senior" },
  { id: 9, title: "Arquiteto de Soluções CAS" },
  { id: 10, title: "Product Owner - Squad Pagamentos" },
  { id: 11, title: "Scrum Master ACME Inc" },
  { id: 12, title: "DevOps Engineer - Time Infra" },
  { id: 13, title: "Analista de Dados MegaCorp" },
  { id: 14, title: "Tech Lead Backend - Fintech" },
  { id: 15, title: "QA Engineer Sênior CAS" },
  { id: 16, title: "UX Designer - Startup Beta" },
  { id: 17, title: "Analista Contábil Senior LTDA" },
  { id: 18, title: "Gerente Comercial Regional Sul" },
  { id: 19, title: "Supervisor de Produção - Fábrica 2" },
  { id: 20, title: "Coordenador de Marketing Digital" },
  { id: 21, title: "Assistente Administrativo CAS" },
  { id: 22, title: "Analista de Compras - Divisão Beta" },
  { id: 23, title: "Especialista Tributário XYZ" },
  { id: 24, title: "Controller Financeiro ABC" },
  { id: 25, title: "Diretor de TI - Holding" },
];

interface AnonymizationRule {
  id: string;
  searchTerm: string;
  replacementValue: string;
  isActive: boolean;
}

interface SuggestedTerm {
  term: string;
  occurrences: number;
  reason: string;
  examples: string[];
}

export default function JobAnonymization() {
  const [rules, setRules] = useState<AnonymizationRule[]>([
    { id: "1", searchTerm: "CAS", replacementValue: "", isActive: true },
    { id: "2", searchTerm: "XYZ Corp", replacementValue: "Empresa", isActive: true },
  ]);
  
  const [newSearchTerm, setNewSearchTerm] = useState("");
  const [newReplacementValue, setNewReplacementValue] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedTerm[]>([]);

  // Função para encontrar cargos afetados por uma regra
  const getAffectedJobs = (searchTerm: string) => {
    if (!searchTerm) return [];
    const regex = new RegExp(searchTerm, "gi");
    return MOCK_JOB_POSITIONS.filter(job => regex.test(job.title));
  };

  // Aplicar anonimização em um título
  const applyAnonymization = (title: string) => {
    let result = title;
    rules.filter(r => r.isActive).forEach(rule => {
      const regex = new RegExp(rule.searchTerm, "gi");
      result = result.replace(regex, rule.replacementValue);
    });
    // Limpar espaços duplicados
    return result.replace(/\s+/g, " ").trim();
  };

  // Preview da anonimização
  const anonymizationPreview = useMemo(() => {
    return MOCK_JOB_POSITIONS.map(job => ({
      original: job.title,
      anonymized: applyAnonymization(job.title),
      hasChanges: job.title !== applyAnonymization(job.title)
    })).filter(item => item.hasChanges);
  }, [rules]);

  // Adicionar nova regra
  const handleAddRule = () => {
    if (!newSearchTerm.trim()) {
      toast.error("Informe o termo a ser substituído");
      return;
    }

    const newRule: AnonymizationRule = {
      id: Date.now().toString(),
      searchTerm: newSearchTerm.trim(),
      replacementValue: newReplacementValue,
      isActive: true
    };

    setRules(prev => [...prev, newRule]);
    setNewSearchTerm("");
    setNewReplacementValue("");
    setIsAddDialogOpen(false);
    toast.success("Regra adicionada com sucesso!");
  };

  // Remover regra
  const handleRemoveRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    toast.success("Regra removida");
  };

  // Toggle ativo/inativo
  const toggleRuleActive = (id: string) => {
    setRules(prev => prev.map(r => 
      r.id === id ? { ...r, isActive: !r.isActive } : r
    ));
  };

  // Toggle expandir regra
  const toggleExpand = (id: string) => {
    setExpandedRules(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Simular sugestões de IA
  const generateSuggestions = () => {
    setIsSuggestionsLoading(true);
    
    // Simular delay de IA
    setTimeout(() => {
      const existingTerms = new Set(rules.map(r => r.searchTerm.toLowerCase()));
      
      // Identificar padrões nos cargos
      const patterns: SuggestedTerm[] = [];
      
      // Detectar acrônimos (2-5 letras maiúsculas)
      const acronymRegex = /\b[A-Z]{2,5}\b/g;
      const acronyms = new Map<string, string[]>();
      
      MOCK_JOB_POSITIONS.forEach(job => {
        const matches = job.title.match(acronymRegex);
        matches?.forEach(match => {
          if (!existingTerms.has(match.toLowerCase())) {
            if (!acronyms.has(match)) {
              acronyms.set(match, []);
            }
            acronyms.get(match)!.push(job.title);
          }
        });
      });
      
      acronyms.forEach((examples, term) => {
        if (!["RH", "TI", "BI", "QA", "UX", "ERP", "SAP"].includes(term)) {
          patterns.push({
            term,
            occurrences: examples.length,
            reason: "Acrônimo que pode identificar departamento ou empresa",
            examples: examples.slice(0, 3)
          });
        }
      });

      // Detectar palavras que parecem nomes de empresa
      const companyPatterns = ["Corp", "Inc", "LTDA", "Tech", "Holding"];
      companyPatterns.forEach(pattern => {
        if (!existingTerms.has(pattern.toLowerCase())) {
          const matches = MOCK_JOB_POSITIONS.filter(j => 
            j.title.toLowerCase().includes(pattern.toLowerCase())
          );
          if (matches.length > 0) {
            patterns.push({
              term: pattern,
              occurrences: matches.length,
              reason: "Padrão comum em nomes de empresas",
              examples: matches.slice(0, 3).map(m => m.title)
            });
          }
        }
      });

      // Detectar divisões/unidades
      const divisionPatterns = ["Divisão", "Unidade", "Regional", "Fábrica", "Squad", "Time"];
      divisionPatterns.forEach(pattern => {
        const matches = MOCK_JOB_POSITIONS.filter(j => 
          j.title.includes(pattern)
        );
        if (matches.length > 0 && !existingTerms.has(pattern.toLowerCase())) {
          // Extrair o nome completo da divisão
          matches.forEach(match => {
            const regex = new RegExp(`${pattern}\\s+\\w+`, "i");
            const fullMatch = match.title.match(regex);
            if (fullMatch && !existingTerms.has(fullMatch[0].toLowerCase())) {
              const existing = patterns.find(p => p.term === fullMatch[0]);
              if (!existing) {
                patterns.push({
                  term: fullMatch[0],
                  occurrences: 1,
                  reason: "Nome de divisão/unidade que pode identificar a empresa",
                  examples: [match.title]
                });
              }
            }
          });
        }
      });

      setSuggestions(patterns.sort((a, b) => b.occurrences - a.occurrences));
      setIsSuggestionsLoading(false);
      toast.success(`${patterns.length} sugestões identificadas`);
    }, 1500);
  };

  // Adicionar sugestão como regra
  const addSuggestionAsRule = (term: string) => {
    const newRule: AnonymizationRule = {
      id: Date.now().toString(),
      searchTerm: term,
      replacementValue: "",
      isActive: true
    };
    setRules(prev => [...prev, newRule]);
    setSuggestions(prev => prev.filter(s => s.term !== term));
    toast.success(`Regra "${term}" adicionada`);
  };

  const filteredRules = rules.filter(r => 
    r.searchTerm.toLowerCase().includes(searchFilter.toLowerCase()) ||
    r.replacementValue.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Anonimização de Cargos</h1>
              <p className="text-sm text-slate-500">Proteja dados sensíveis antes da exportação para o Data Lake</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white/70 backdrop-blur border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{MOCK_JOB_POSITIONS.length}</p>
                  <p className="text-xs text-slate-500">Cargos na base</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Shield className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{rules.filter(r => r.isActive).length}</p>
                  <p className="text-xs text-slate-500">Regras ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{anonymizationPreview.length}</p>
                  <p className="text-xs text-slate-500">Cargos afetados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">
                    {MOCK_JOB_POSITIONS.length - anonymizationPreview.length}
                  </p>
                  <p className="text-xs text-slate-500">Cargos seguros</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Regras de Anonimização */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-white/80 backdrop-blur border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Regras de Substituição</CardTitle>
                    <CardDescription>
                      Defina termos para anonimizar nos títulos dos cargos
                    </CardDescription>
                  </div>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                        <Plus className="h-4 w-4" />
                        Nova Regra
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adicionar Regra de Anonimização</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">
                            Termo a substituir *
                          </label>
                          <Input
                            placeholder="Ex: CAS, XYZ Corp, Divisão Norte..."
                            value={newSearchTerm}
                            onChange={(e) => setNewSearchTerm(e.target.value)}
                          />
                          <p className="text-xs text-slate-500">
                            Este termo será buscado nos títulos dos cargos (case insensitive)
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">
                            Valor substituto
                          </label>
                          <Input
                            placeholder="Deixe vazio para remover o termo"
                            value={newReplacementValue}
                            onChange={(e) => setNewReplacementValue(e.target.value)}
                          />
                          <p className="text-xs text-slate-500">
                            Se vazio, o termo será removido. Se preenchido, será substituído.
                          </p>
                        </div>
                        {newSearchTerm && (
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-600 mb-2">
                              Preview: {getAffectedJobs(newSearchTerm).length} cargos serão afetados
                            </p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {getAffectedJobs(newSearchTerm).slice(0, 5).map(job => (
                                <p key={job.id} className="text-xs text-slate-500">
                                  • {job.title}
                                </p>
                              ))}
                              {getAffectedJobs(newSearchTerm).length > 5 && (
                                <p className="text-xs text-slate-400">
                                  +{getAffectedJobs(newSearchTerm).length - 5} mais...
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancelar</Button>
                        </DialogClose>
                        <Button onClick={handleAddRule}>Adicionar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Buscar regras..."
                      className="pl-9"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                    />
                  </div>
                </div>

                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredRules.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>Nenhuma regra cadastrada</p>
                        <p className="text-sm">Clique em "Nova Regra" para começar</p>
                      </div>
                    ) : (
                      filteredRules.map(rule => {
                        const affectedJobs = getAffectedJobs(rule.searchTerm);
                        const isExpanded = expandedRules.has(rule.id);

                        return (
                          <Collapsible key={rule.id} open={isExpanded} onOpenChange={() => toggleExpand(rule.id)}>
                            <div className={`border rounded-lg transition-colors ${
                              rule.isActive 
                                ? "border-slate-200 bg-white" 
                                : "border-slate-100 bg-slate-50 opacity-60"
                            }`}>
                              <div className="p-3 flex items-center gap-3">
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="secondary" className="bg-red-100 text-red-700 font-mono">
                                      {rule.searchTerm}
                                    </Badge>
                                    <span className="text-slate-400">→</span>
                                    <Badge variant="outline" className="font-mono">
                                      {rule.replacementValue || "(remover)"}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1">
                                    {affectedJobs.length} cargo{affectedJobs.length !== 1 ? "s" : ""} afetado{affectedJobs.length !== 1 ? "s" : ""}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleRuleActive(rule.id)}
                                    className={rule.isActive ? "text-green-600" : "text-slate-400"}
                                  >
                                    {rule.isActive ? "Ativa" : "Inativa"}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => handleRemoveRule(rule.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              <CollapsibleContent>
                                <div className="px-3 pb-3 pt-1 border-t border-slate-100">
                                  <p className="text-xs font-medium text-slate-600 mb-2">
                                    Cargos que serão modificados:
                                  </p>
                                  <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto">
                                    {affectedJobs.map(job => (
                                      <div key={job.id} className="text-xs bg-slate-50 rounded px-2 py-1">
                                        <span className="text-slate-600">{job.title}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Sugestões de IA */}
            <Card className="bg-white/80 backdrop-blur border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    <CardTitle className="text-lg">Sugestões Inteligentes</CardTitle>
                  </div>
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={generateSuggestions}
                    disabled={isSuggestionsLoading}
                  >
                    <Sparkles className={`h-4 w-4 ${isSuggestionsLoading ? "animate-spin" : ""}`} />
                    {isSuggestionsLoading ? "Analisando..." : "Analisar Cargos"}
                  </Button>
                </div>
                <CardDescription>
                  IA identifica termos que podem revelar a identidade da empresa
                </CardDescription>
              </CardHeader>
              <CardContent>
                {suggestions.length === 0 ? (
                  <div className="text-center py-6 text-slate-500">
                    <Sparkles className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Clique em "Analisar Cargos" para identificar termos suspeitos</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {suggestions.map((suggestion, idx) => (
                      <div 
                        key={idx} 
                        className="p-3 border border-amber-200 bg-amber-50/50 rounded-lg"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-amber-500 text-white font-mono">
                                {suggestion.term}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {suggestion.occurrences} ocorrência{suggestion.occurrences !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mb-2">{suggestion.reason}</p>
                            <div className="text-xs text-slate-500">
                              <span className="font-medium">Exemplos: </span>
                              {suggestion.examples.join(", ")}
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="shrink-0"
                            onClick={() => addSuggestionAsRule(suggestion.term)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <Card className="bg-white/80 backdrop-blur border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-indigo-500" />
                  <CardTitle className="text-lg">Preview da Anonimização</CardTitle>
                </div>
                <CardDescription>
                  Visualize como os cargos ficarão após aplicar as regras
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {anonymizationPreview.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500 opacity-50" />
                      <p className="text-sm">Nenhum cargo será modificado</p>
                      <p className="text-xs">Adicione regras para começar</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Original</TableHead>
                          <TableHead className="text-xs">Anonimizado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {anonymizationPreview.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs text-slate-600 py-2">
                              {item.original}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-green-700 py-2">
                              {item.anonymized || <span className="text-slate-400 italic">(vazio)</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Ações */}
            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">Pronto para exportar?</h3>
                <p className="text-sm text-blue-100 mb-4">
                  {anonymizationPreview.length} cargos serão anonimizados antes da exportação para o Data Lake.
                </p>
                <Button 
                  variant="secondary" 
                  className="w-full bg-white text-indigo-600 hover:bg-blue-50"
                  onClick={() => toast.success("Exportação iniciada! (protótipo)")}
                >
                  Exportar para Data Lake
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
