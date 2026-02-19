"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  X,
  FileText,
  ImageIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { KnowledgeFile } from "@/types/admin";

export interface KnowledgeFileWithUrl extends KnowledgeFile {
  url?: string | null;
}

interface FileUploaderProps {
  documentId: string;
  files: KnowledgeFileWithUrl[];
  onFilesChange: (files: KnowledgeFileWithUrl[]) => void;
}

const ACCEPTED_TYPES = ".png,.jpg,.jpeg,.pdf";
const MAX_SIZE_MB = 10;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function fileTypeLabel(mimeType: string): string {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "image/png") return "PNG";
  if (mimeType === "image/jpeg") return "JPG";
  return "Fichier";
}

export default function FileUploader({
  documentId,
  files,
  onFilesChange,
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      setError(null);
      setUploading(true);

      try {
        // Client-side validation
        for (const file of Array.from(fileList)) {
          if (
            !["image/png", "image/jpeg", "application/pdf"].includes(file.type)
          ) {
            setError(
              `${file.name} : type non supporté. Formats acceptés : PNG, JPG, PDF`
            );
            setUploading(false);
            return;
          }
          if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            setError(`${file.name} : fichier trop volumineux (max ${MAX_SIZE_MB} Mo)`);
            setUploading(false);
            return;
          }
        }

        const formData = new FormData();
        for (const file of Array.from(fileList)) {
          formData.append("files", file);
        }

        const res = await fetch(
          `/api/admin/knowledge/${documentId}/files`,
          { method: "POST", body: formData }
        );
        const json = await res.json();

        if (json.success) {
          onFilesChange([...json.data, ...files]);
        } else {
          setError(json.error?.message ?? "Erreur upload");
        }
      } catch {
        setError("Erreur de connexion");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [documentId, files, onFilesChange]
  );

  const handleDelete = useCallback(
    async (fileId: string) => {
      setError(null);
      setDeletingId(fileId);
      try {
        const res = await fetch(
          `/api/admin/knowledge/${documentId}/files/${fileId}`,
          { method: "DELETE" }
        );
        const json = await res.json();
        if (json.success) {
          onFilesChange(files.filter((f) => f.id !== fileId));
        } else {
          setError(json.error?.message ?? "Erreur suppression");
        }
      } catch {
        setError("Erreur de connexion");
      } finally {
        setDeletingId(null);
      }
    },
    [documentId, files, onFilesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleUpload(e.dataTransfer.files);
    },
    [handleUpload]
  );

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Upload en cours...
            </p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Glissez vos fichiers ici ou cliquez pour parcourir
            </p>
            <p className="text-xs text-muted-foreground/70">
              PNG, JPG ou PDF — max {MAX_SIZE_MB} Mo par fichier
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
          disabled={uploading}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="divide-y rounded-md border">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3"
            >
              {file.mime_type === "application/pdf" ? (
                <FileText className="h-5 w-5 shrink-0 text-red-500" />
              ) : (
                <ImageIcon className="h-5 w-5 shrink-0 text-blue-500" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {file.file_name}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {fileTypeLabel(file.mime_type)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(file.file_size)}
                  </span>
                  {file.mime_type === "application/pdf" &&
                    file.extracted_text && (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Texte extrait
                      </span>
                    )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => handleDelete(file.id)}
                disabled={deletingId === file.id}
              >
                {deletingId === file.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
