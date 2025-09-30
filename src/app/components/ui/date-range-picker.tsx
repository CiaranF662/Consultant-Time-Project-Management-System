import React from 'react';
import { Button } from '@/app/components/ui/button';
import { Calendar } from '@/app/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DatePickerWithRangeProps {
  date?: DateRange;
  onSelect?: (date: DateRange | undefined) => void;
  className?: string;
}

export function DatePickerWithRange({
  className,
  date,
  onSelect
}: DatePickerWithRangeProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'dd/MM/yyyy')} -{' '}
                  {format(date.to, 'dd/MM/yyyy')}
                </>
              ) : (
                format(date.from, 'dd/MM/yyyy')
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}