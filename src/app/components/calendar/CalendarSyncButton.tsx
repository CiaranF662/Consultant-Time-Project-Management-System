'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Calendar, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CalendarSyncButtonProps {
  phaseId: string;
  phaseName: string;
  className?: string;
}

export default function CalendarSyncButton({ phaseId, phaseName, className }: CalendarSyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSynced, setIsSynced] = useState(false);

  const handleSync = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phaseId })
      });

      const data = await response.json();

      if (data.success) {
        setIsSynced(true);
        toast.success(`${phaseName} synced to Google Calendar`);
      } else {
        toast.error(data.error || 'Failed to sync to calendar');
      }
    } catch (error) {
      toast.error('Failed to sync to calendar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isLoading || isSynced}
      size="sm"
      variant={isSynced ? "default" : "outline"}
      className={className}
    >
      {isSynced ? (
        <CheckCircle className="w-4 h-4 mr-2" />
      ) : (
        <Calendar className="w-4 h-4 mr-2" />
      )}
      {isLoading ? 'Syncing...' : isSynced ? 'Synced' : 'Sync to Calendar'}
    </Button>
  );
}