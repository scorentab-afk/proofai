import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Key, Plus, Copy, Trash2, User, Shield, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth, supabase } from '@/lib/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:54321/functions/v1';

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  plan: string;
  proofs_used: number;
  proofs_limit: number | null;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}


export default function Settings() {
  const { user, signOut } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load API keys
      const { data: keys } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });
      if (keys) setApiKeys(keys);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!user) return;
    setCreatingKey(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const res = await fetch(`${API_BASE}/create-api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newKeyName || 'Default' }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Failed to create key');
        return;
      }

      const data = await res.json();
      setNewKeyValue(data.apiKey);
      setNewKeyName('');
      toast.success('API key created! Copy it now — it won\'t be shown again.');
      loadData();
    } catch (err) {
      toast.error('Failed to create API key');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleCopyKey = () => {
    if (newKeyValue) {
      navigator.clipboard.writeText(newKeyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDeactivateKey = async (keyId: string) => {
    await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId);
    toast.success('Key deactivated');
    loadData();
  };

  return (
    <MainLayout title="Settings" subtitle="Manage your account, API keys, and billing">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="font-medium">{user?.email || 'Not signed in'}</p>
              </div>
              <Button variant="outline" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge className="bg-primary/10 text-primary">Private Beta</Badge>
              <p className="text-sm text-muted-foreground">
                Your proofAI access is free during the private beta period. You're
                in Bring Your Own Key mode — provide your own Anthropic API key and
                proofAI handles signature, anchoring, and the regulator portal at
                no cost.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              API Keys
            </CardTitle>
            <CardDescription>
              Use API keys to authenticate SDK and API requests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Create new key */}
            <div className="flex gap-3">
              <Input
                placeholder="Key name (e.g. Production, Staging)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleCreateKey} disabled={creatingKey}>
                {creatingKey ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Create Key
              </Button>
            </div>

            {/* New key display (shown once) */}
            {newKeyValue && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-700 text-sm">
                    New API key created — copy it now!
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-sidebar text-sidebar-foreground rounded p-2 text-sm font-mono break-all">
                    {newKeyValue}
                  </code>
                  <Button variant="outline" size="sm" onClick={handleCopyKey}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This key will not be shown again. Store it securely.
                </p>
              </div>
            )}

            {/* Key list */}
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading keys...</p>
            ) : apiKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No API keys yet. Create one to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${key.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{key.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {key.plan}
                        </Badge>
                        {!key.is_active && (
                          <Badge variant="destructive" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <code className="text-xs text-muted-foreground">{key.key_prefix}...</code>
                        <span className="text-xs text-muted-foreground">
                          {key.proofs_used} proofs used
                        </span>
                        {key.last_used_at && (
                          <span className="text-xs text-muted-foreground">
                            Last: {new Date(key.last_used_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {key.is_active && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeactivateKey(key.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage example */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <h4 className="font-semibold mb-2">Quick integration</h4>
            <pre className="bg-sidebar text-sidebar-foreground rounded-lg p-4 text-sm overflow-x-auto">
{`import { ProofAI } from '@proofai/sdk'

const proofai = new ProofAI({ apiKey: 'pk_live_xxx' })
const cert = await proofai.certify(prompt, { provider: 'anthropic' })`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
