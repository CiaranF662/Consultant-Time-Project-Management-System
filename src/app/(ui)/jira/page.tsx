'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'react-hot-toast';
import { Settings, RefreshCw, Download, CheckCircle, AlertCircle } from 'lucide-react';

export default function JiraPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState([]);

  const testConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/jira-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-connection' })
      });
      const data = await response.json();
      
      if (data.success) {
        setIsConnected(true);
        toast.success('Connected to Jira successfully!');
      } else {
        toast.error(data.error || 'Connection failed');
      }
    } catch (error) {
      toast.error('Failed to connect to Jira');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/jira-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-projects' })
      });
      const data = await response.json();
      
      if (data.success) {
        setProjects(data.projects);
        toast.success(`Found ${data.projects.length} projects`);
      } else {
        toast.error(data.error || 'Failed to fetch projects');
      }
    } catch (error) {
      toast.error('Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  };

  const syncData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/jira-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync-data' })
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Data synced successfully!');
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch (error) {
      toast.error('Failed to sync data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jira Integration</h1>
          <p className="text-muted-foreground">Sync projects and time tracking data from Jira</p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Not Connected
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Jira Base URL</Label>
              <Input placeholder="https://your-domain.atlassian.net" disabled />
            </div>
            <div>
              <Label>API Token</Label>
              <Input type="password" placeholder="Your Jira API token" disabled />
            </div>
            <Button onClick={testConnection} disabled={isLoading} className="w-full">
              {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
              Test Connection
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Sync Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={fetchProjects} disabled={!isConnected || isLoading} className="w-full">
              Fetch Projects
            </Button>
            <Button onClick={syncData} disabled={!isConnected || isLoading} className="w-full">
              Sync Time Data
            </Button>
            <p className="text-sm text-muted-foreground">
              Configure JIRA_API_TOKEN and JIRA_BASE_URL in environment variables
            </p>
          </CardContent>
        </Card>
      </div>

      {projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Jira Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project: any) => (
                <div key={project.id} className="p-4 border rounded-lg">
                  <h3 className="font-medium">{project.name}</h3>
                  <p className="text-sm text-muted-foreground">Key: {project.key}</p>
                  {project.category && (
                    <Badge variant="outline" className="mt-2">
                      {project.category}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}