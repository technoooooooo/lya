"use client";

import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Save,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  BookOpen,
  Shield,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import type { AIConfig, KnowledgeDocumentWithFiles, Guardrail } from "@/types/admin";
import FileUploader from "@/components/admin/FileUploader";

// ---------------------------------------------------------------------------
// Prompt principal (Story 5.1)
// ---------------------------------------------------------------------------

function PromptSection() {
  const [prompt, setPrompt] = useState("");
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchPrompt = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai-config");
      const json = await res.json();
      if (json.success) {
        const systemPrompt = (json.data as AIConfig[]).find(
          (c) => c.key === "system_prompt"
        );
        const value = systemPrompt?.value ?? "";
        setPrompt(value);
        setOriginalPrompt(value);
      } else {
        setError(json.error?.message ?? "Erreur inconnue");
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompt();
  }, [fetchPrompt]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/admin/ai-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "system_prompt", value: prompt }),
      });
      const json = await res.json();
      if (json.success) {
        setOriginalPrompt(prompt);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(json.error?.message ?? "Erreur inconnue");
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = prompt !== originalPrompt;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Prompt principal
        </CardTitle>
        <CardDescription>
          Ce prompt est envoyé comme instruction système à l&apos;IA pour chaque conversation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700">
            Prompt sauvegardé avec succès.
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="system-prompt">Contenu du prompt</Label>
          <Textarea
            id="system-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={16}
            placeholder="Entrez le prompt système..."
            className="font-mono text-sm"
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {prompt.length} caractères
          </p>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Sauvegarder
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Base de connaissances (Story 5.2)
// ---------------------------------------------------------------------------

function KnowledgeSection() {
  const [documents, setDocuments] = useState<KnowledgeDocumentWithFiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<KnowledgeDocumentWithFiles | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/knowledge");
      const json = await res.json();
      if (json.success) {
        setDocuments(json.data);
      } else {
        setError(json.error?.message ?? "Erreur inconnue");
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const openCreate = () => {
    setEditingDoc(null);
    setFormTitle("");
    setFormContent("");
    setDialogOpen(true);
  };

  const openEdit = (doc: KnowledgeDocumentWithFiles) => {
    setEditingDoc(doc);
    setFormTitle(doc.title);
    setFormContent(doc.content);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setFormSaving(true);
    setError(null);
    try {
      if (editingDoc) {
        const res = await fetch(`/api/admin/knowledge/${editingDoc.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: formTitle, content: formContent }),
        });
        const json = await res.json();
        if (json.success) {
          setDocuments((prev) =>
            prev.map((d) =>
              d.id === editingDoc.id
                ? { ...json.data, knowledge_files: d.knowledge_files }
                : d
            )
          );
          setDialogOpen(false);
        } else {
          setError(json.error?.message ?? "Erreur inconnue");
        }
      } else {
        const res = await fetch("/api/admin/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: formTitle, content: formContent }),
        });
        const json = await res.json();
        if (json.success) {
          setDocuments((prev) => [
            { ...json.data, knowledge_files: [] },
            ...prev,
          ]);
          setDialogOpen(false);
        } else {
          setError(json.error?.message ?? "Erreur inconnue");
        }
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setFormSaving(false);
    }
  };

  const handleToggleActive = async (doc: KnowledgeDocumentWithFiles) => {
    try {
      const res = await fetch(`/api/admin/knowledge/${doc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !doc.is_active }),
      });
      const json = await res.json();
      if (json.success) {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === doc.id
              ? { ...json.data, knowledge_files: d.knowledge_files }
              : d
          )
        );
      }
    } catch {
      setError("Erreur de connexion");
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/knowledge/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        setDeleteConfirmId(null);
      } else {
        setError(json.error?.message ?? "Erreur inconnue");
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Base de connaissances
              </CardTitle>
              <CardDescription>
                Documents utilisés comme contexte par l&apos;IA pour enrichir ses réponses.
              </CardDescription>
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          {documents.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Aucun document. Cliquez sur &quot;Ajouter&quot; pour créer le premier.
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{doc.title}</p>
                      {doc.knowledge_files.length > 0 && (
                        <Badge variant="outline">
                          {doc.knowledge_files.length} fichier
                          {doc.knowledge_files.length > 1 ? "s" : ""}
                        </Badge>
                      )}
                      {!doc.is_active && (
                        <Badge variant="secondary">Inactif</Badge>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {doc.content.substring(0, 120)}
                      {doc.content.length > 120 ? "..." : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${doc.id}`} className="text-xs text-muted-foreground">
                        Actif
                      </Label>
                      <Switch
                        id={`active-${doc.id}`}
                        checked={doc.is_active}
                        onCheckedChange={() => handleToggleActive(doc)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(doc)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirmId(doc.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog création / édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingDoc ? "Modifier le document" : "Nouveau document"}
            </DialogTitle>
            <DialogDescription>
              {editingDoc
                ? "Modifiez le titre et le contenu du document."
                : "Ajoutez un nouveau document à la base de connaissances."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-title">Titre</Label>
              <Input
                id="doc-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Titre du document"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-content">Contenu</Label>
              <Textarea
                id="doc-content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={12}
                placeholder="Contenu du document..."
                className="font-mono text-sm"
              />
            </div>
            {editingDoc && (
              <div className="space-y-2">
                <Label>Fichiers attachés</Label>
                <FileUploader
                  documentId={editingDoc.id}
                  files={editingDoc.knowledge_files}
                  onFilesChange={(updatedFiles) => {
                    const updated = {
                      ...editingDoc,
                      knowledge_files: updatedFiles,
                    };
                    setEditingDoc(updated);
                    setDocuments((prev) =>
                      prev.map((d) => (d.id === editingDoc.id ? { ...d, knowledge_files: updatedFiles } : d))
                    );
                  }}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={formSaving || !formTitle.trim() || !formContent.trim()}
            >
              {formSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {editingDoc ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmation suppression */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Le document et tous ses fichiers attachés seront définitivement supprimés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Garde-fous (Story 5.3)
// ---------------------------------------------------------------------------

function GuardrailsSection() {
  const [guardrails, setGuardrails] = useState<Guardrail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuardrail, setEditingGuardrail] = useState<Guardrail | null>(null);
  const [formType, setFormType] = useState<"forbidden" | "exception">("forbidden");
  const [formSubject, setFormSubject] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchGuardrails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/guardrails");
      const json = await res.json();
      if (json.success) {
        setGuardrails(json.data);
      } else {
        setError(json.error?.message ?? "Erreur inconnue");
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuardrails();
  }, [fetchGuardrails]);

  const openCreate = () => {
    setEditingGuardrail(null);
    setFormType("forbidden");
    setFormSubject("");
    setFormDescription("");
    setDialogOpen(true);
  };

  const openEdit = (g: Guardrail) => {
    setEditingGuardrail(g);
    setFormType(g.type);
    setFormSubject(g.subject);
    setFormDescription(g.description ?? "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setFormSaving(true);
    setError(null);
    try {
      if (editingGuardrail) {
        const res = await fetch(`/api/admin/guardrails/${editingGuardrail.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: formType,
            subject: formSubject,
            description: formDescription || null,
          }),
        });
        const json = await res.json();
        if (json.success) {
          setGuardrails((prev) =>
            prev.map((g) => (g.id === editingGuardrail.id ? json.data : g))
          );
          setDialogOpen(false);
        } else {
          setError(json.error?.message ?? "Erreur inconnue");
        }
      } else {
        const res = await fetch("/api/admin/guardrails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: formType,
            subject: formSubject,
            description: formDescription || null,
          }),
        });
        const json = await res.json();
        if (json.success) {
          setGuardrails((prev) => [json.data, ...prev]);
          setDialogOpen(false);
        } else {
          setError(json.error?.message ?? "Erreur inconnue");
        }
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setFormSaving(false);
    }
  };

  const handleToggleActive = async (g: Guardrail) => {
    try {
      const res = await fetch(`/api/admin/guardrails/${g.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !g.is_active }),
      });
      const json = await res.json();
      if (json.success) {
        setGuardrails((prev) =>
          prev.map((item) => (item.id === g.id ? json.data : item))
        );
      }
    } catch {
      setError("Erreur de connexion");
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/guardrails/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setGuardrails((prev) => prev.filter((g) => g.id !== id));
        setDeleteConfirmId(null);
      } else {
        setError(json.error?.message ?? "Erreur inconnue");
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Garde-fous
              </CardTitle>
              <CardDescription>
                Sujets interdits et exceptions pour encadrer les réponses de l&apos;IA.
              </CardDescription>
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          {guardrails.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Aucun garde-fou configuré. Cliquez sur &quot;Ajouter&quot; pour en créer un.
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {guardrails.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          g.type === "forbidden" ? "destructive" : "default"
                        }
                      >
                        {g.type === "forbidden" ? "Interdit" : "Exception"}
                      </Badge>
                      <p className="truncate font-medium">{g.subject}</p>
                      {!g.is_active && (
                        <Badge variant="secondary">Inactif</Badge>
                      )}
                    </div>
                    {g.description && (
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {g.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`guardrail-active-${g.id}`} className="text-xs text-muted-foreground">
                        Actif
                      </Label>
                      <Switch
                        id={`guardrail-active-${g.id}`}
                        checked={g.is_active}
                        onCheckedChange={() => handleToggleActive(g)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(g)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirmId(g.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog création / édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGuardrail ? "Modifier le garde-fou" : "Nouveau garde-fou"}
            </DialogTitle>
            <DialogDescription>
              {editingGuardrail
                ? "Modifiez les paramètres de ce garde-fou."
                : "Ajoutez un nouveau garde-fou pour encadrer l'IA."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formType === "forbidden" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormType("forbidden")}
                >
                  Interdit
                </Button>
                <Button
                  type="button"
                  variant={formType === "exception" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormType("exception")}
                >
                  Exception
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="guardrail-subject">Sujet</Label>
              <Input
                id="guardrail-subject"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="Ex: conseils médicaux, paris sportifs..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guardrail-description">
                Description <span className="text-muted-foreground">(optionnelle)</span>
              </Label>
              <Textarea
                id="guardrail-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                placeholder="Précisions sur ce garde-fou..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={formSaving || !formSubject.trim()}
            >
              {formSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {editingGuardrail ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmation suppression */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Le garde-fou sera définitivement supprimé.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

export default function AdminAIPage() {
  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Gestion de l&apos;IA</h2>
        <p className="mt-1 text-muted-foreground">
          Configurez le comportement de l&apos;assistant IA Lya.
        </p>
      </div>

      <Tabs defaultValue="prompt" className="space-y-6">
        <TabsList>
          <TabsTrigger value="prompt" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Prompt principal
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-1.5">
            <BookOpen className="h-4 w-4" />
            Base de connaissances
          </TabsTrigger>
          <TabsTrigger value="guardrails" className="gap-1.5">
            <Shield className="h-4 w-4" />
            Garde-fous
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prompt">
          <PromptSection />
        </TabsContent>

        <TabsContent value="knowledge">
          <KnowledgeSection />
        </TabsContent>

        <TabsContent value="guardrails">
          <GuardrailsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
