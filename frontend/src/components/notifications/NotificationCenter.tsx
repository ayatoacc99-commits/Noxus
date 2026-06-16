'use client';

import { useEffect, useState } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: number;
  created_at: string;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const load = () => api.notifications().then((d) => setNotifications(d.notifications || [])).catch(() => {});

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const unread = notifications.filter((n) => !n.is_read).length;

  const markRead = async (id: number) => {
    await api.markNotificationRead(id);
    load();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <BellIcon className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-noxus-primary text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-3 py-2 border-b border-noxus-border">
          <p className="font-semibold text-sm">Notifications</p>
        </div>
        {notifications.length === 0 ? (
          <div className="p-4 text-sm text-noxus-muted text-center">No notifications</div>
        ) : (
          notifications.slice(0, 8).map((n) => (
            <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 p-3 cursor-pointer" onClick={() => markRead(n.id)}>
              <div className="flex items-center gap-2 w-full">
                <span className="font-medium text-sm">{n.title}</span>
                <Badge variant="outline" className="text-[9px] ml-auto">{n.type}</Badge>
              </div>
              <p className="text-xs text-noxus-muted">{n.message}</p>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
