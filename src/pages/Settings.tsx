import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, FileArchive, Trash2, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  status: 'pending' | 'ready' | 'error';
  isDefault?: boolean;
}

const STORAGE_KEY = 'cogni-evidence-files';

const defaultFile: UploadedFile = {
  id: 'default-files-zip',
  name: 'files.zip',
  size: 1024 * 50,
  uploadedAt: new Date().toISOString(),
  status: 'ready',
  isDefault: true,
};

const loadFilesFromStorage = (): UploadedFile[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading files from localStorage:', e);
  }
  return [defaultFile];
};

const saveFilesToStorage = (files: UploadedFile[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch (e) {
    console.error('Error saving files to localStorage:', e);
  }
};

export default function Settings() {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  useEffect(() => {
    setFiles(loadFilesFromStorage());
  }, []);

  useEffect(() => {
    if (files.length > 0) {
      saveFilesToStorage(files);
    }
  }, [files]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    const newFiles: UploadedFile[] = Array.from(uploadedFiles).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      status: 'pending' as const,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    toast.success(`${newFiles.length} fichier(s) ajouté(s)`);

    // Simulate processing
    setTimeout(() => {
      setFiles((prev) =>
        prev.map((f) =>
          newFiles.find((nf) => nf.id === f.id) ? { ...f, status: 'ready' as const } : f
        )
      );
      toast.success('Fichiers prêts pour la production');
    }, 1500);
  };

  const handleDeleteFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    toast.success('Fichier supprimé');
  };

  const handleDownloadFile = (file: UploadedFile) => {
    if (file.isDefault) {
      // Download from public folder
      const link = document.createElement('a');
      link.href = '/uploads/files.zip';
      link.download = file.name;
      link.click();
      toast.success(`Téléchargement de ${file.name}`);
    } else {
      toast.info(`Téléchargement de ${file.name}... (métadonnées uniquement en mode démo)`);
    }
  };

  return (
    <MainLayout title="Settings" subtitle="Gérer les fichiers de configuration pour la production">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Fichiers de Configuration
            </CardTitle>
            <CardDescription>
              Uploadez vos fichiers de configuration avant le déploiement en production.
              Ces fichiers seront stockés de manière sécurisée.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upload Zone */}
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <Input
                type="file"
                multiple
                accept=".zip,.json,.pem,.key,.cert,.env"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <Label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileArchive className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    Glissez vos fichiers ici ou cliquez pour sélectionner
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Formats supportés: .zip, .json, .pem, .key, .cert, .env
                  </p>
                </div>
                <Button variant="outline" size="sm" className="mt-2">
                  Sélectionner des fichiers
                </Button>
              </Label>
            </div>

            <Separator />

            {/* Files List */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Fichiers stockés ({files.length})
              </h3>

              {files.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileArchive className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>Aucun fichier uploadé</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileArchive className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                                            {formatFileSize(file.size)} • Uploadé le{' '}
                                            {new Date(file.uploadedAt).toLocaleDateString('fr-FR')}
                                            {file.isDefault && ' • Fichier système'}
                                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          variant={file.status === 'ready' ? 'default' : 'secondary'}
                          className={
                            file.status === 'ready'
                              ? 'bg-green-500/10 text-green-500 border-green-500/20'
                              : file.status === 'error'
                              ? 'bg-red-500/10 text-red-500 border-red-500/20'
                              : ''
                          }
                        >
                          {file.status === 'ready' && (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          )}
                          {file.status === 'error' && (
                            <AlertCircle className="h-3 w-3 mr-1" />
                          )}
                          {file.status === 'ready'
                            ? 'Prêt'
                            : file.status === 'pending'
                            ? 'En cours...'
                            : 'Erreur'}
                        </Badge>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadFile(file)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteFile(file.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Production Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Checklist Production</CardTitle>
            <CardDescription>
              Vérifiez ces éléments avant le déploiement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Fichiers de configuration uploadés', done: files.length > 0 },
                { label: 'Clés de signature configurées', done: true },
                { label: 'Connexion blockchain testée', done: false },
                { label: 'Certificats SSL valides', done: false },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/20"
                >
                  {item.done ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  <span
                    className={item.done ? 'text-foreground' : 'text-muted-foreground'}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
