import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface COAAuditSchedule {
  id: string;
  semester: string;
  audit_type: string;
  month: number;
  month_name: string;
  description: string;
}

export function useCOAAuditSchedule() {
  const [schedule, setSchedule] = useState<COAAuditSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setIsLoading(true);
        const { data, error: fetchError } = await supabase
          .from('coa_audit_schedule')
          .select('*')
          .order('month', { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        setSchedule(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching COA audit schedule:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch schedule');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  const getAuditsByMonth = (month: number) => {
    return schedule.filter((item) => item.month === month);
  };

  const getUpcomingAudit = () => {
    const currentMonth = new Date().getMonth() + 1;
    const upcomingAudit = schedule.find((item) => item.month >= currentMonth);
    return upcomingAudit || schedule[0];
  };

  return {
    schedule,
    isLoading,
    error,
    getAuditsByMonth,
    getUpcomingAudit,
  };
}
