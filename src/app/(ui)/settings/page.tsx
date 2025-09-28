import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Monitor, 
  Palette, 
  Globe,
  Key,
  Database,
  Mail,
  Smartphone,
  Clock
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';

interface UserSettings {
  notifications: {
    emailDigest: boolean;
    projectUpdates: boolean;
    resourceConflicts: boolean;
    weeklyReports: boolean;
    mobileNotifications: boolean;
  };
  preferences: {
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    weekStart: string;
    theme: string;
    language: string;
  };
  privacy: {
    profileVisibility: string;
    shareWorkload: boolean;
    allowMentions: boolean;
  };
  integrations: {
    jiraEnabled: boolean;
    slackEnabled: boolean;
    calendarSync: boolean;
  };
}

const defaultSettings: UserSettings = {
  notifications: {
    emailDigest: true,
    projectUpdates: true,
    resourceConflicts: true,
    weeklyReports: false,
    mobileNotifications: true,
  },
  preferences: {
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    weekStart: 'monday',
    theme: 'light',
    language: 'en',
  },
  privacy: {
    profileVisibility: 'team',
    shareWorkload: true,
    allowMentions: true,
  },
  integrations: {
    jiraEnabled: false,
    slackEnabled: false,
    calendarSync: false,
  },
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const [jiraConfig, setJiraConfig] = useState({
    serverUrl: '',
    email: '',
    apiToken: '',
    projectKey: ''
  });

  const [profileData, setProfileData] = useState({
    displayName: user?.name || '',
    email: user?.email || '',
    title: '',
    department: user?.department || '',
    skills: user?.skills || '',
    hourlyRate: user?.hourlyRate?.toString() || '',
    bio: ''
  });

  useEffect(() => {
    // Load user settings from localStorage or API
    const savedSettings = localStorage.getItem(`user-settings-${user?.id}`);
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, [user]);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage (in a real app, this would go to the backend)
      localStorage.setItem(`user-settings-${user?.id}`, JSON.stringify(settings));
      
      // Update user profile in database
      if (user) {
        await blink.db.users.update(user.id, {
          name: profileData.displayName,
          department: profileData.department,
          skills: profileData.skills,
          hourlyRate: profileData.hourlyRate ? parseFloat(profileData.hourlyRate) : null
        });
      }

      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <T extends keyof UserSettings>(
    section: T,
    key: keyof UserSettings[T],
    value: any
  ) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const testJiraConnection = async () => {
    if (!jiraConfig.serverUrl || !jiraConfig.email || !jiraConfig.apiToken) {
      toast.error('Please fill in all Jira configuration fields');
      return;
    }

    try {
      // In a real implementation, this would test the Jira API connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Jira connection successful');
      updateSetting('integrations', 'jiraEnabled', true);
    } catch (error) {
      toast.error('Failed to connect to Jira');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8" />
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={profileData.displayName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    value={profileData.title}
                    onChange={(e) => setProfileData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Senior Consultant"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={profileData.department} onValueChange={(value) => setProfileData(prev => ({ ...prev, department: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skills">Skills</Label>
                  <Input
                    id="skills"
                    value={profileData.skills}
                    onChange={(e) => setProfileData(prev => ({ ...prev, skills: e.target.value }))}
                    placeholder="React, TypeScript, Node.js"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    value={profileData.hourlyRate}
                    onChange={(e) => setProfileData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                    placeholder="150"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profileData.bio}
                  onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={settings.preferences.timezone} onValueChange={(value) => updateSetting('preferences', 'timezone', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select value={settings.preferences.dateFormat} onValueChange={(value) => updateSetting('preferences', 'dateFormat', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time Format</Label>
                  <Select value={settings.preferences.timeFormat} onValueChange={(value) => updateSetting('preferences', 'timeFormat', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12 Hour</SelectItem>
                      <SelectItem value="24h">24 Hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Week Starts On</Label>
                  <Select value={settings.preferences.weekStart} onValueChange={(value) => updateSetting('preferences', 'weekStart', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunday">Sunday</SelectItem>
                      <SelectItem value="monday">Monday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Daily Email Digest</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a summary of daily activities
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.emailDigest}
                  onCheckedChange={(checked) => updateSetting('notifications', 'emailDigest', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Project Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when projects are updated
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.projectUpdates}
                  onCheckedChange={(checked) => updateSetting('notifications', 'projectUpdates', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Resource Conflicts</Label>
                  <p className="text-sm text-muted-foreground">
                    Alert when resource allocation conflicts occur
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.resourceConflicts}
                  onCheckedChange={(checked) => updateSetting('notifications', 'resourceConflicts', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive weekly performance reports
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.weeklyReports}
                  onCheckedChange={(checked) => updateSetting('notifications', 'weeklyReports', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Mobile Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications on your mobile device
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.mobileNotifications}
                  onCheckedChange={(checked) => updateSetting('notifications', 'mobileNotifications', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacy Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Profile Visibility</Label>
                <Select value={settings.privacy.profileVisibility} onValueChange={(value) => updateSetting('privacy', 'profileVisibility', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public - Visible to everyone</SelectItem>
                    <SelectItem value="team">Team - Visible to team members only</SelectItem>
                    <SelectItem value="private">Private - Only visible to managers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Share Workload Information</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow others to see your current workload and availability
                  </p>
                </div>
                <Switch
                  checked={settings.privacy.shareWorkload}
                  onCheckedChange={(checked) => updateSetting('privacy', 'shareWorkload', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Allow Mentions</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow team members to mention you in comments and discussions
                  </p>
                </div>
                <Switch
                  checked={settings.privacy.allowMentions}
                  onCheckedChange={(checked) => updateSetting('privacy', 'allowMentions', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Jira Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                  <Label>Enable Jira Integration</Label>
                  <p className="text-sm text-muted-foreground">
                    Connect with Jira to sync project data and time tracking
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={settings.integrations.jiraEnabled ? "default" : "secondary"}>
                    {settings.integrations.jiraEnabled ? "Connected" : "Disconnected"}
                  </Badge>
                  <Switch
                    checked={settings.integrations.jiraEnabled}
                    onCheckedChange={(checked) => updateSetting('integrations', 'jiraEnabled', checked)}
                  />
                </div>
              </div>

              {settings.integrations.jiraEnabled && (
                <div className="grid grid-cols-1 gap-4 p-4 border rounded-lg">
                  <Input
                    placeholder="Jira Server URL (e.g., https://yourcompany.atlassian.net)"
                    value={jiraConfig.serverUrl}
                    onChange={(e) => setJiraConfig(prev => ({ ...prev, serverUrl: e.target.value }))}
                  />
                  <Input
                    placeholder="Email Address"
                    type="email"
                    value={jiraConfig.email}
                    onChange={(e) => setJiraConfig(prev => ({ ...prev, email: e.target.value }))}
                  />
                  <Input
                    placeholder="API Token"
                    type="password"
                    value={jiraConfig.apiToken}
                    onChange={(e) => setJiraConfig(prev => ({ ...prev, apiToken: e.target.value }))}
                  />
                  <Input
                    placeholder="Project Key (optional)"
                    value={jiraConfig.projectKey}
                    onChange={(e) => setJiraConfig(prev => ({ ...prev, projectKey: e.target.value }))}
                  />
                  <Button onClick={testJiraConnection}>
                    Test Connection
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Other Integrations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Slack Integration</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notifications and updates in Slack
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Coming Soon</Badge>
                  <Switch disabled />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Calendar Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Sync your schedule with Google Calendar or Outlook
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Coming Soon</Badge>
                  <Switch disabled />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Generate API tokens to integrate Jira Insight with external systems.
                </p>
                <Button variant="outline">
                  Generate API Token
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-destructive/20 rounded-lg">
                <div className="space-y-2">
                  <Label className="text-destructive">Delete Account</Label>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-6 border-t">
        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}