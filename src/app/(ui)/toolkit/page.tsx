// Multi-Platform Integration System
// Supports Jira, Slack, and Google Workspace integrations

class PlatformIntegrator {
  constructor() {
    this.jira = new JiraIntegration();
    this.slack = new SlackIntegration();
    this.google = new GoogleWorkspaceIntegration();
  }

  // Cross-platform workflow example
  async createIssueAndNotify(issueData, slackChannel, meetingTitle) {
    try {
      // Create Jira issue
      const issue = await this.jira.createIssue(issueData);
      
      // Notify team in Slack
      await this.slack.sendMessage(slackChannel, {
        text: `New issue created: ${issue.key}`,
        attachments: [{
          color: 'warning',
          title: issue.summary,
          title_link: issue.url,
          text: issue.description,
          fields: [
            { title: 'Priority', value: issue.priority, short: true },
            { title: 'Assignee', value: issue.assignee, short: true }
          ]
        }]
      });

      // Schedule Google Meet for discussion
      const meeting = await this.google.calendar.createEvent({
        summary: meetingTitle || `Discussion: ${issue.key}`,
        description: `Meeting to discuss ${issue.key}: ${issue.summary}`,
        attendees: [issue.assignee, issue.reporter],
        conferenceData: { createRequest: { requestId: 'meet-' + Date.now() } }
      });

      return { issue, meeting };
    } catch (error) {
      console.error('Cross-platform workflow error:', error);
      throw error;
    }
  }
}

// JIRA INTEGRATION
class JiraIntegration {
  constructor(config = {}) {
    this.baseURL = config.baseURL || 'https://your-domain.atlassian.net';
    this.email = config.email;
    this.apiToken = config.apiToken;
    this.projectKey = config.projectKey || 'PROJ';
  }

  // Authentication header
  getAuthHeaders() {
    const auth = btoa(`${this.email}:${this.apiToken}`);
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    };
  }

  // Create issue
  async createIssue(issueData) {
    const payload = {
      fields: {
        project: { key: this.projectKey },
        summary: issueData.summary,
        description: {
          type: 'doc',
          version: 1,
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: issueData.description }]
          }]
        },
        issuetype: { name: issueData.issueType || 'Task' },
        priority: { name: issueData.priority || 'Medium' },
        assignee: issueData.assignee ? { accountId: issueData.assignee } : null,
        labels: issueData.labels || []
      }
    };

    const response = await fetch(`${this.baseURL}/rest/api/3/issue`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    return {
      id: result.id,
      key: result.key,
      url: `${this.baseURL}/browse/${result.key}`,
      ...issueData
    };
  }

  // Get issue
  async getIssue(issueKey) {
    const response = await fetch(
      `${this.baseURL}/rest/api/3/issue/${issueKey}`,
      { headers: this.getAuthHeaders() }
    );
    return await response.json();
  }

  // Update issue
  async updateIssue(issueKey, updates) {
    const payload = { fields: updates };
    
    const response = await fetch(
      `${this.baseURL}/rest/api/3/issue/${issueKey}`,
      {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload)
      }
    );
    
    return response.ok;
  }

  // Add comment
  async addComment(issueKey, comment) {
    const payload = {
      body: {
        type: 'doc',
        version: 1,
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: comment }]
        }]
      }
    };

    const response = await fetch(
      `${this.baseURL}/rest/api/3/issue/${issueKey}/comment`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload)
      }
    );

    return await response.json();
  }

  // Search issues
  async searchIssues(jql, fields = ['key', 'summary', 'status']) {
    const params = new URLSearchParams({
      jql: jql,
      fields: fields.join(',')
    });

    const response = await fetch(
      `${this.baseURL}/rest/api/3/search?${params}`,
      { headers: this.getAuthHeaders() }
    );

    return await response.json();
  }

  // Get transitions for issue
  async getTransitions(issueKey) {
    const response = await fetch(
      `${this.baseURL}/rest/api/3/issue/${issueKey}/transitions`,
      { headers: this.getAuthHeaders() }
    );
    return await response.json();
  }

  // Transition issue
  async transitionIssue(issueKey, transitionId) {
    const payload = {
      transition: { id: transitionId }
    };

    const response = await fetch(
      `${this.baseURL}/rest/api/3/issue/${issueKey}/transitions`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload)
      }
    );

    return response.ok;
  }
}

// SLACK INTEGRATION
class SlackIntegration {
  constructor(config = {}) {
    this.botToken = config.botToken;
    this.userToken = config.userToken;
    this.baseURL = 'https://slack.com/api';
  }

  // Get headers with bot token
  getBotHeaders() {
    return {
      'Authorization': `Bearer ${this.botToken}`,
      'Content-Type': 'application/json'
    };
  }

  // Send message
  async sendMessage(channel, message) {
    const payload = {
      channel: channel,
      ...message
    };

    const response = await fetch(`${this.baseURL}/chat.postMessage`, {
      method: 'POST',
      headers: this.getBotHeaders(),
      body: JSON.stringify(payload)
    });

    return await response.json();
  }

  // Send direct message
  async sendDirectMessage(userId, message) {
    // First open DM channel
    const dmResponse = await fetch(`${this.baseURL}/conversations.open`, {
      method: 'POST',
      headers: this.getBotHeaders(),
      body: JSON.stringify({ users: userId })
    });

    const dmData = await dmResponse.json();
    
    if (dmData.ok) {
      return await this.sendMessage(dmData.channel.id, message);
    }
    throw new Error('Failed to open DM channel');
  }

  // Update message
  async updateMessage(channel, timestamp, message) {
    const payload = {
      channel: channel,
      ts: timestamp,
      ...message
    };

    const response = await fetch(`${this.baseURL}/chat.update`, {
      method: 'POST',
      headers: this.getBotHeaders(),
      body: JSON.stringify(payload)
    });

    return await response.json();
  }

  // Get channel info
  async getChannelInfo(channel) {
    const response = await fetch(
      `${this.baseURL}/conversations.info?channel=${channel}`,
      { headers: this.getBotHeaders() }
    );
    return await response.json();
  }

  // Get user info
  async getUserInfo(userId) {
    const response = await fetch(
      `${this.baseURL}/users.info?user=${userId}`,
      { headers: this.getBotHeaders() }
    );
    return await response.json();
  }

  // List channels
  async listChannels() {
    const response = await fetch(`${this.baseURL}/conversations.list`, {
      headers: this.getBotHeaders()
    });
    return await response.json();
  }

  // Create reminder
  async createReminder(text, time, userId = null) {
    const payload = {
      text: text,
      time: time,
      user: userId
    };

    const response = await fetch(`${this.baseURL}/reminders.add`, {
      method: 'POST',
      headers: this.getBotHeaders(),
      body: JSON.stringify(payload)
    });

    return await response.json();
  }

  // Upload file
  async uploadFile(channels, file, filename, title = null) {
    const formData = new FormData();
    formData.append('channels', channels);
    formData.append('file', file);
    formData.append('filename', filename);
    if (title) formData.append('title', title);

    const response = await fetch(`${this.baseURL}/files.upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.botToken}` },
      body: formData
    });

    return await response.json();
  }
}

// GOOGLE WORKSPACE INTEGRATION
class GoogleWorkspaceIntegration {
  constructor(config = {}) {
    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    
    this.gmail = new GmailIntegration(this);
    this.calendar = new CalendarIntegration(this);
    this.drive = new DriveIntegration(this);
    this.meet = new MeetIntegration(this);
  }

  // Get headers with access token
  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  // Refresh access token
  async refreshAccessToken() {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token'
      })
    });

    const data = await response.json();
    this.accessToken = data.access_token;
    return this.accessToken;
  }
}

// GMAIL INTEGRATION
class GmailIntegration {
  constructor(googleIntegration) {
    this.google = googleIntegration;
    this.baseURL = 'https://gmail.googleapis.com/gmail/v1';
  }

  // Send email
  async sendEmail(to, subject, body, attachments = []) {
    const email = this.createEmailMessage(to, subject, body, attachments);
    
    const response = await fetch(`${this.baseURL}/users/me/messages/send`, {
      method: 'POST',
      headers: this.google.getAuthHeaders(),
      body: JSON.stringify({
        raw: btoa(email).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      })
    });

    return await response.json();
  }

  // Create email message
  createEmailMessage(to, subject, body, attachments = []) {
    const boundary = 'boundary_' + Date.now();
    
    let email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      '',
      body,
      ''
    ];

    // Add attachments
    attachments.forEach(attachment => {
      email.push(`--${boundary}`);
      email.push(`Content-Type: ${attachment.mimeType}`);
      email.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
      email.push('Content-Transfer-Encoding: base64');
      email.push('');
      email.push(attachment.data);
      email.push('');
    });

    email.push(`--${boundary}--`);
    return email.join('\r\n');
  }

  // Get messages
  async getMessages(query = '', maxResults = 10) {
    const params = new URLSearchParams({
      q: query,
      maxResults: maxResults.toString()
    });

    const response = await fetch(
      `${this.baseURL}/users/me/messages?${params}`,
      { headers: this.google.getAuthHeaders() }
    );

    return await response.json();
  }

  // Get message
  async getMessage(messageId) {
    const response = await fetch(
      `${this.baseURL}/users/me/messages/${messageId}`,
      { headers: this.google.getAuthHeaders() }
    );

    return await response.json();
  }

  // Create label
  async createLabel(name, color = '#000000') {
    const payload = {
      name: name,
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show',
      color: {
        backgroundColor: color,
        textColor: '#ffffff'
      }
    };

    const response = await fetch(`${this.baseURL}/users/me/labels`, {
      method: 'POST',
      headers: this.google.getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    return await response.json();
  }
}

// CALENDAR INTEGRATION
class CalendarIntegration {
  constructor(googleIntegration) {
    this.google = googleIntegration;
    this.baseURL = 'https://www.googleapis.com/calendar/v3';
  }

  // Create event
  async createEvent(eventData, calendarId = 'primary') {
    const event = {
      summary: eventData.summary,
      description: eventData.description,
      start: {
        dateTime: eventData.startTime || new Date(Date.now() + 3600000).toISOString(),
        timeZone: eventData.timeZone || 'UTC'
      },
      end: {
        dateTime: eventData.endTime || new Date(Date.now() + 7200000).toISOString(),
        timeZone: eventData.timeZone || 'UTC'
      },
      attendees: eventData.attendees?.map(email => ({ email })) || [],
      conferenceData: eventData.conferenceData || null
    };

    const params = eventData.conferenceData ? '?conferenceDataVersion=1' : '';

    const response = await fetch(
      `${this.baseURL}/calendars/${calendarId}/events${params}`,
      {
        method: 'POST',
        headers: this.google.getAuthHeaders(),
        body: JSON.stringify(event)
      }
    );

    return await response.json();
  }

  // List events
  async listEvents(calendarId = 'primary', timeMin = null, timeMax = null) {
    const params = new URLSearchParams();
    if (timeMin) params.append('timeMin', timeMin);
    if (timeMax) params.append('timeMax', timeMax);
    params.append('singleEvents', 'true');
    params.append('orderBy', 'startTime');

    const response = await fetch(
      `${this.baseURL}/calendars/${calendarId}/events?${params}`,
      { headers: this.google.getAuthHeaders() }
    );

    return await response.json();
  }

  // Update event
  async updateEvent(eventId, updates, calendarId = 'primary') {
    const response = await fetch(
      `${this.baseURL}/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'PUT',
        headers: this.google.getAuthHeaders(),
        body: JSON.stringify(updates)
      }
    );

    return await response.json();
  }

  // Delete event
  async deleteEvent(eventId, calendarId = 'primary') {
    const response = await fetch(
      `${this.baseURL}/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: this.google.getAuthHeaders()
      }
    );

    return response.ok;
  }
}

// DRIVE INTEGRATION
class DriveIntegration {
  constructor(googleIntegration) {
    this.google = googleIntegration;
    this.baseURL = 'https://www.googleapis.com/drive/v3';
  }

  // Upload file
  async uploadFile(file, name, parentFolderId = null) {
    const metadata = {
      name: name,
      parents: parentFolderId ? [parentFolderId] : undefined
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
    formData.append('file', file);

    const response = await fetch(
      `${this.baseURL}/files?uploadType=multipart`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.google.accessToken}` },
        body: formData
      }
    );

    return await response.json();
  }

  // Create folder
  async createFolder(name, parentFolderId = null) {
    const metadata = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined
    };

    const response = await fetch(`${this.baseURL}/files`, {
      method: 'POST',
      headers: this.google.getAuthHeaders(),
      body: JSON.stringify(metadata)
    });

    return await response.json();
  }

  // List files
  async listFiles(query = '', pageSize = 10) {
    const params = new URLSearchParams({
      q: query,
      pageSize: pageSize.toString()
    });

    const response = await fetch(
      `${this.baseURL}/files?${params}`,
      { headers: this.google.getAuthHeaders() }
    );

    return await response.json();
  }

  // Share file
  async shareFile(fileId, email, role = 'reader') {
    const permission = {
      role: role,
      type: 'user',
      emailAddress: email
    };

    const response = await fetch(
      `${this.baseURL}/files/${fileId}/permissions`,
      {
        method: 'POST',
        headers: this.google.getAuthHeaders(),
        body: JSON.stringify(permission)
      }
    );

    return await response.json();
  }
}

// MEET INTEGRATION
class MeetIntegration {
  constructor(googleIntegration) {
    this.google = googleIntegration;
  }

  // Create Meet link (via Calendar)
  async createMeetLink(title = 'Meeting') {
    const event = await this.google.calendar.createEvent({
      summary: title,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      conferenceData: {
        createRequest: {
          requestId: 'meet-' + Date.now()
        }
      }
    });

    return event.conferenceData?.entryPoints?.[0]?.uri || null;
  }
}

// USAGE EXAMPLES
class IntegrationExamples {
  constructor() {
    this.integrator = new PlatformIntegrator();
  }

  // Example: Project workflow
  async setupProjectWorkflow() {
    // Configure integrations
    const jira = new JiraIntegration({
      baseURL: 'https://mycompany.atlassian.net',
      email: 'user@company.com',
      apiToken: 'your-api-token',
      projectKey: 'PROJ'
    });

    const slack = new SlackIntegration({
      botToken: 'xoxb-your-bot-token'
    });

    const google = new GoogleWorkspaceIntegration({
      accessToken: 'your-access-token',
      refreshToken: 'your-refresh-token',
      clientId: 'your-client-id',
      clientSecret: 'your-client-secret'
    });

    // Create issue
    const issue = await jira.createIssue({
      summary: 'New feature request',
      description: 'Implement user dashboard',
      issueType: 'Story',
      priority: 'High',
      assignee: 'user-account-id',
      labels: ['frontend', 'dashboard']
    });

    // Notify team
    await slack.sendMessage('#development', {
      text: `New story created: ${issue.key}`,
      attachments: [{
        color: 'good',
        title: issue.summary,
        title_link: issue.url,
        text: issue.description
      }]
    });

    // Schedule planning meeting
    const meeting = await google.calendar.createEvent({
      summary: `Planning: ${issue.key}`,
      description: `Planning session for ${issue.summary}`,
      startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      endTime: new Date(Date.now() + 90000000).toISOString(), // 1 hour later
      attendees: ['team@company.com'],
      conferenceData: {
        createRequest: { requestId: 'planning-' + Date.now() }
      }
    });

    return { issue, meeting };
  }

  // Example: Daily standup automation
  async dailyStandupAutomation() {
    const jira = new JiraIntegration({/* config */});
    const slack = new SlackIntegration({/* config */});

    // Get today's completed issues
    const completedToday = await jira.searchIssues(
      `status changed to Done on startOfDay() AND assignee = currentUser()`
    );

    // Get in-progress issues
    const inProgress = await jira.searchIssues(
      `status = "In Progress" AND assignee = currentUser()`
    );

    // Send standup message
    const standupMessage = {
      text: "Daily Standup Update",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Yesterday's Completed Tasks:*"
          }
        },
        ...completedToday.issues.map(issue => ({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `• <${issue.self}|${issue.key}>: ${issue.fields.summary}`
          }
        })),
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Today's Focus:*"
          }
        },
        ...inProgress.issues.map(issue => ({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `• <${issue.self}|${issue.key}>: ${issue.fields.summary}`
          }
        }))
      ]
    };

    await slack.sendMessage('#standup', standupMessage);
  }
}

// Database Integration Layer
class DatabaseIntegrator {
  constructor(prisma) {
    this.prisma = prisma;
  }

  // Create project in external systems when created locally
  async syncProjectCreation(projectId) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        phases: true,
        consultants: { include: { user: true } },
        productManager: true
      }
    });

    if (!project) throw new Error('Project not found');

    // Create Jira project/epic
    const jira = new JiraIntegration();
    const jiraEpic = await jira.createIssue({
      summary: `Project: ${project.title}`,
      description: project.description || 'Project created from internal system',
      issueType: 'Epic',
      priority: 'High',
      labels: ['project', 'internal-sync']
    });

    // Create Slack channel for project
    const slack = new SlackIntegration();
    const channelName = `proj-${project.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    
    // Store integration references in database
    await this.prisma.projectIntegration.create({
      data: {
        projectId: project.id,
        jiraEpicKey: jiraEpic.key,
        slackChannelId: channelName,
        googleDriveFolder: null // Will be created on demand
      }
    });

    return { jiraEpic, channelName };
  }

  // Sync task creation with Jira
  async syncTaskToJira(taskData, projectId) {
    const integration = await this.prisma.projectIntegration.findUnique({
      where: { projectId }
    });

    if (!integration?.jiraEpicKey) {
      throw new Error('Project not integrated with Jira');
    }

    const jira = new JiraIntegration();
    const jiraIssue = await jira.createIssue({
      summary: taskData.title,
      description: taskData.description,
      issueType: 'Story',
      priority: 'Medium',
      parent: integration.jiraEpicKey, // Link to project epic
      labels: ['internal-sync']
    });

    // Store task integration
    await this.prisma.taskIntegration.create({
      data: {
        internalTaskId: taskData.id,
        jiraIssueKey: jiraIssue.key,
        projectId: projectId
      }
    });

    return jiraIssue;
  }

  // Sync hour change requests with approvals
  async notifyHourChangeRequest(requestId) {
    const request = await this.prisma.hourChangeRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: true,
        phaseAllocation: {
          include: {
            phase: {
              include: {
                project: {
                  include: {
                    productManager: true,
                    consultants: { include: { user: true } }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!request) throw new Error('Hour change request not found');

    const project = request.phaseAllocation?.phase.project;
    if (!project) throw new Error('Associated project not found');

    // Get project integration
    const integration = await this.prisma.projectIntegration.findUnique({
      where: { projectId: project.id }
    });

    if (integration?.slackChannelId) {
      const slack = new SlackIntegration();
      
      // Notify in project channel
      await slack.sendMessage(integration.slackChannelId, {
        text: `Hour Change Request - ${request.changeType}`,
        attachments: [{
          color: 'warning',
          title: `${request.requester.name} requested hour changes`,
          fields: [
            { title: 'Type', value: request.changeType, short: true },
            { title: 'Original Hours', value: request.originalHours.toString(), short: true },
            { title: 'Requested Hours', value: request.requestedHours.toString(), short: true },
            { title: 'Reason', value: request.reason, short: false }
          ],
          actions: [
            {
              name: 'approve',
              text: 'Approve',
              type: 'button',
              style: 'primary',
              url: `${process.env.NEXT_PUBLIC_URL}/dashboard/admin/hour-changes`
            },
            {
              name: 'review',
              text: 'Review',
              type: 'button',
              url: `${process.env.NEXT_PUBLIC_URL}/dashboard/admin/hour-changes`
            }
          ]
        }]
      });

      // DM the product manager
      if (project.productManager) {
        await slack.sendDirectMessage(project.productManager.id, {
          text: `You have a new hour change request for ${project.title}`,
          attachments: [{
            color: 'good',
            title: 'Review Required',
            text: `${request.requester.name} has requested changes to their hour allocation.`,
            actions: [{
              name: 'review',
              text: 'Review Request',
              type: 'button',
              url: `${process.env.NEXT_PUBLIC_URL}/dashboard/admin/hour-changes`
            }]
          }]
        });
      }
    }

    return true;
  }

  // Schedule Google Meet for phase kickoff
  async schedulePhaseKickoff(phaseId) {
    const phase = await this.prisma.phase.findUnique({
      where: { id: phaseId },
      include: {
        project: {
          include: {
            consultants: { include: { user: true } },
            productManager: true
          }
        },
        allocations: {
          include: { consultant: true }
        }
      }
    });

    if (!phase) throw new Error('Phase not found');

    const google = new GoogleWorkspaceIntegration();
    
    // Get all team members' emails
    const attendees = [
      ...(phase.project.productManager ? [phase.project.productManager.email] : []),
      ...phase.allocations.map(a => a.consultant.email).filter(Boolean)
    ];

    const meeting = await google.calendar.createEvent({
      summary: `${phase.project.title} - ${phase.name} Kickoff`,
      description: `Phase kickoff meeting for ${phase.name}\n\nPhase Description: ${phase.description || 'No description'}`,
      startTime: phase.startDate.toISOString(),
      endTime: new Date(new Date(phase.startDate).getTime() + 3600000).toISOString(), // 1 hour later
      attendees: attendees.filter(Boolean),
      conferenceData: {
        createRequest: { requestId: `phase-${phase.id}-${Date.now()}` }
      }
    });

    // Store meeting reference
    await this.prisma.phaseMeeting.create({
      data: {
        phaseId: phase.id,
        googleEventId: meeting.id,
        meetingUrl: meeting.conferenceData?.entryPoints?.[0]?.uri,
        scheduledFor: phase.startDate
      }
    });

    return meeting;
  }

  // Send weekly allocation reports
  async sendWeeklyReport(userId) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        weeklyAllocations: {
          where: {
            weekStartDate: {
              gte: new Date(),
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
            }
          },
          include: {
            phaseAllocation: {
              include: {
                phase: {
                  include: { project: true }
                }
              }
            }
          }
        }
      }
    });

    if (!user) throw new Error('User not found');

    const gmail = new GoogleWorkspaceIntegration().gmail;
    
    const reportHtml = `
      <h2>Weekly Allocation Report</h2>
      <p>Hello ${user.name},</p>
      <p>Here's your allocation for the upcoming week:</p>
      <table border="1" style="border-collapse: collapse; width: 100%;">
        <tr>
          <th>Project</th>
          <th>Phase</th>
          <th>Hours</th>
          <th>Week</th>
        </tr>
        ${user.weeklyAllocations.map(allocation => `
          <tr>
            <td>${allocation.phaseAllocation.phase.project.title}</td>
            <td>${allocation.phaseAllocation.phase.name}</td>
            <td>${allocation.plannedHours}</td>
            <td>Week ${allocation.weekNumber}, ${allocation.year}</td>
          </tr>
        `).join('')}
      </table>
      <p>Total Hours: ${user.weeklyAllocations.reduce((sum, a) => sum + a.plannedHours, 0)}</p>
    `;

    await gmail.sendEmail(
      user.email,
      'Weekly Allocation Report',
      reportHtml
    );

    return true;
  }
}

// Webhook handlers for external integrations
class WebhookHandler {
  constructor(prisma) {
    this.prisma = prisma;
    this.dbIntegrator = new DatabaseIntegrator(prisma);
  }

  // Handle Jira webhook updates
  async handleJiraWebhook(payload) {
    if (payload.issue) {
      const issueKey = payload.issue.key;
      
      // Find corresponding task
      const taskIntegration = await this.prisma.taskIntegration.findUnique({
        where: { jiraIssueKey: issueKey }
      });

      if (taskIntegration) {
        // Update internal task status based on Jira status
        const statusMapping = {
          'To Do': 'TODO',
          'In Progress': 'IN_PROGRESS', 
          'Done': 'DONE'
        };

        const newStatus = statusMapping[payload.issue.fields.status.name];
        if (newStatus) {
          await this.prisma.task.update({
            where: { id: taskIntegration.internalTaskId },
            data: { status: newStatus }
          });
        }
      }
    }

    return { success: true };
  }

  // Handle Slack interactive components
  async handleSlackInteraction(payload) {
    if (payload.actions && payload.actions[0]) {
      const action = payload.actions[0];
      
      if (action.name === 'approve' && action.value) {
        const requestId = action.value;
        
        await this.prisma.hourChangeRequest.update({
          where: { id: requestId },
          data: { 
            status: 'APPROVED',
            approverId: payload.user.id // Map Slack user to system user
          }
        });

        return { 
          response_type: 'ephemeral',
          text: 'Hour change request approved!'
        };
      }
    }

    return { success: true };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PlatformIntegrator,
    JiraIntegration,
    SlackIntegration,
    GoogleWorkspaceIntegration,
    DatabaseIntegrator,
    WebhookHandler,
    IntegrationExamples
  };
}
/* Option A: Direct API Integration (Recommended)
Use the Jira REST API or Atlassian Cloud API to fetch and update issues, projects, and sprints.
Authenticate using OAuth 2.0 (preferred) or API tokens.
Store Jira → AgileRS mappings (e.g., JiraIssueID ↔ AgileRSTaskID) in your DB.
Pros: Full control, no dependency on third-party services.
Cons: You need to handle syncing, rate limits, and errors.

Jira REST API Essentials
Endpoints you’ll likely need:
Issues: /rest/api/3/issue/{issueIdOrKey}
Projects: /rest/api/3/project
Sprints (Agile): /rest/agile/1.0/sprint/{sprintId}
Boards: /rest/agile/1.0/board
Search (JQL): /rest/api/3/search*/