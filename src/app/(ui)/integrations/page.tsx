'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { toast } from 'react-hot-toast';
import { formatDateTime } from '@/lib/formatDate';

export default function IntegrationsPage() {
  const [webhook, setWebhook] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<{ id?: string; name?: string; email?: string } | null>(null);

  useEffect(() => {
    // check admin
    fetch('/api/admin/check').then(r => r.json()).then(d => {
      if (d.success) {
        setIsAdmin(d.isAdmin);
        if (!d.isAdmin) {
          // non-admin: load public settings
          fetch('/api/integrations/slack/public').then(r => r.json()).then(pub => {
            if (pub.success && pub.settings) {
              setEnabled(!!pub.settings.enabled);
              setLastUpdated(pub.settings.lastUpdated || null);
              setLastUpdatedBy(pub.settings.lastUpdatedBy || null);
            }
          }).catch(() => {});
        } else {
          // admin: load editable settings
          fetch('/api/integrations/slack')
            .then(r => r.json())
            .then(data => {
              if (data.success && data.settings) {
                setWebhook(data.settings.webhook || '');
                setEnabled(!!data.settings.enabled);
              }
            }).catch(() => {});
        }
      } else setIsAdmin(false);
    }).catch(() => setIsAdmin(false));
  }, []);

  const testSlack = async () => {
    setIsTesting(true);
    try {
      const response = await fetch('/api/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Test message from Consultant-Time platform' })
      });
      const data = await response.json();
      if (data.success) toast.success('Slack test message sent');
      else toast.error(data.error || 'Slack test failed');
    } catch (err) {
      toast.error('Slack test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const saveSettings = async () => {
    try {
      const body = { webhook, enabled };
      const r = await fetch('/api/integrations/slack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await r.json();
      if (data.success) toast.success('Saved');
      else toast.error(data.error || 'Save failed');
    } catch (err) {
      toast.error('Save failed');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Integrations</h1>
      {isAdmin === false && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Slack Integration</CardTitle>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              { /* show last updated if available */ }
              <p className="text-sm text-muted-foreground">{enabled ? 'Slack notifications are enabled by your administrator.' : 'Slack integration is currently disabled.'}</p>
              <p className="text-xs text-muted-foreground">{lastUpdated ? `Last updated: ${formatDateTime(lastUpdated)}` : null}</p>
              {lastUpdatedBy && (
                <p className="text-xs text-muted-foreground">Updated by: {lastUpdatedBy.name || lastUpdatedBy.email}</p>
              )}
              <p className="text-sm text-muted-foreground">Contact an administrator to change integration settings.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin !== false && isAdmin !== null && (
      <Card>
        <CardHeader>
          <CardTitle>Slack</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Label>Slack Webhook URL (set as SLACK_WEBHOOK_URL env var)</Label>
              <Input value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="https://hooks.slack.com/services/..." />
            </div>
            <div className="flex gap-2">
              <Button onClick={testSlack} disabled={isTesting}>
                {isTesting ? 'Sending...' : 'Send Test Message'}
              </Button>
              <Button onClick={saveSettings}>
                Save Settings
              </Button>
              <Button variant="ghost" onClick={() => { setWebhook(''); setEnabled(false); }}>
                Clear
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Note: For security, set your production webhook in environment variables (SLACK_WEBHOOK_URL).</p>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
