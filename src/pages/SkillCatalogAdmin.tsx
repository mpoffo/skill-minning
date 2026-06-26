import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowDown, ArrowUp, Plus, Trash2, X, Pencil, Check } from "lucide-react";
import { SKILL_CATEGORIES } from "@/data/skillSuggestions";
import { toast } from "@/hooks/use-toast";

interface DraftCategory {
  id: string;
  name: string;
  skills: string[];
  isActive: boolean;
}

const seed = (): DraftCategory[] =>
  SKILL_CATEGORIES.map((c) => ({ ...c, skills: [...c.skills], isActive: true }));

export default function SkillCatalogAdmin() {
  const [categories, setCategories] = useState<DraftCategory[]>(seed);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newSkillByCat, setNewSkillByCat] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<DraftCategory | null>(null);

  const norm = (s: string) => s.trim().toLowerCase();

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categories.some((c) => norm(c.name) === norm(name))) {
      toast({ title: "Categoria já existe", variant: "destructive" });
      return;
    }
    setCategories((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, skills: [], isActive: true },
    ]);
    setNewCategoryName("");
  };

  const removeCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setConfirmDelete(null);
  };

  const move = (idx: number, dir: -1 | 1) => {
    setCategories((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const toggleActive = (id: string, value: boolean) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: value } : c))
    );
  };

  const saveRename = (id: string) => {
    const name = editingName.trim();
    if (!name) return;
    if (
      categories.some((c) => c.id !== id && norm(c.name) === norm(name))
    ) {
      toast({ title: "Nome já usado", variant: "destructive" });
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    setEditingId(null);
  };

  const addSkill = (catId: string) => {
    const value = (newSkillByCat[catId] || "").trim();
    if (!value) return;
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id !== catId) return c;
        if (c.skills.some((s) => norm(s) === norm(value))) {
          toast({ title: "Habilidade já existe nesta categoria", variant: "destructive" });
          return c;
        }
        return { ...c, skills: [...c.skills, value] };
      })
    );
    setNewSkillByCat((p) => ({ ...p, [catId]: "" }));
  };

  const removeSkill = (catId: string, skill: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId ? { ...c, skills: c.skills.filter((s) => s !== skill) } : c
      )
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Catálogo de Habilidades"
        actions={
          <Button
            onClick={() => toast({ title: "Protótipo — alterações não são persistidas" })}
          >
            Salvar alterações
          </Button>
        }
      />

      <main className="max-w-5xl mx-auto p-xmedium space-y-medium">
        <Card>
          <CardHeader>
            <CardTitle className="text-h3">Nova categoria</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-sml">
            <Input
              placeholder="Ex.: Dados e Analytics"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
            />
            <Button onClick={addCategory}>
              <Plus className="size-4" /> Adicionar
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-default">
          {categories.map((cat, idx) => (
            <Card key={cat.id} className={!cat.isActive ? "opacity-60" : ""}>
              <CardHeader className="flex flex-row items-center justify-between gap-sml space-y-0">
                <div className="flex items-center gap-sml flex-1 min-w-0">
                  <div className="flex flex-col">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0}
                    >
                      <ArrowUp className="size-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => move(idx, 1)}
                      disabled={idx === categories.length - 1}
                    >
                      <ArrowDown className="size-3" />
                    </Button>
                  </div>

                  {editingId === cat.id ? (
                    <div className="flex gap-sml flex-1">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveRename(cat.id)}
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" onClick={() => saveRename(cat.id)}>
                        <Check className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <CardTitle className="text-h3 truncate">{cat.name}</CardTitle>
                      <Badge variant="secondary">{cat.skills.length}</Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(cat.id);
                          setEditingName(cat.name);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-sml">
                  <div className="flex items-center gap-2 text-caption">
                    <Switch
                      checked={cat.isActive}
                      onCheckedChange={(v) => toggleActive(cat.id, v)}
                    />
                    <span>{cat.isActive ? "Ativa" : "Inativa"}</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setConfirmDelete(cat)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-sml">
                <div className="flex flex-wrap gap-2">
                  {cat.skills.length === 0 && (
                    <span className="text-caption text-muted-foreground">
                      Nenhuma habilidade ainda — adicione abaixo.
                    </span>
                  )}
                  {cat.skills.map((s) => (
                    <Badge
                      key={s}
                      variant="outline"
                      className="gap-1 pr-1 py-1 text-sm"
                    >
                      {s}
                      <button
                        onClick={() => removeSkill(cat.id, s)}
                        className="hover:bg-destructive/10 rounded-sm p-0.5"
                        aria-label={`Remover ${s}`}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-sml">
                  <Input
                    placeholder="Adicionar habilidade…"
                    value={newSkillByCat[cat.id] || ""}
                    onChange={(e) =>
                      setNewSkillByCat((p) => ({ ...p, [cat.id]: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && addSkill(cat.id)}
                  />
                  <Button variant="outline" onClick={() => addSkill(cat.id)}>
                    <Plus className="size-4" /> Adicionar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              A categoria <strong>{confirmDelete?.name}</strong> será removida do
              catálogo. Habilidades já cadastradas pelos colaboradores permanecem
              intactas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && removeCategory(confirmDelete.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
