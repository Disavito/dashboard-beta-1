import React, { useState } from 'react';
import { Bell, FileText, ExternalLink, Clock, ShieldAlert, Check, Wallet, Info, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import usePendingRequests from '@/hooks/usePendingRequests';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const NotificationBell: React.FC = () => {
    const { pendingRequests, pendingCount, canManageRequests } = usePendingRequests();
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const { isSupported, isSubscribed, permission, subscribeToPush } = usePushNotifications();
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    if (!canManageRequests) return null; // Or keep it for all users, but right now tied to permissions

    const totalUnread = pendingCount + unreadCount;
    const hasPending = totalUnread > 0;

    const filteredNotifications = filter === 'unread' 
        ? notifications.filter(n => !n.is_read)
        : notifications;

    const getIconForType = (type: string) => {
        switch (type) {
            case 'finance': return <Wallet size={16} className="text-emerald-500" />;
            case 'success': return <Check size={16} className="text-emerald-500" />;
            case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
            case 'error': return <ShieldAlert size={16} className="text-red-500" />;
            case 'system': return <Info size={16} className="text-[#4892CC]" />;
            default: return <Bell size={16} className="text-gray-400" />;
        }
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button 
                    className={cn(
                        "relative p-2.5 rounded-full transition-all duration-300 outline-none group",
                        "bg-white/5 hover:bg-primary/10 border border-white/10 shadow-lg",
                        "focus:ring-2 focus:ring-primary/50 active:scale-95"
                    )}
                >
                    <Bell className={cn(
                        "w-5 h-5 transition-all duration-300", 
                        hasPending 
                            ? 'text-primary fill-primary/20 animate-ring' 
                            : 'text-gray-400 group-hover:text-primary'
                    )} />
                    
                    {hasPending && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-5 w-5 bg-red-600 border-2 border-[#373435] text-[10px] font-black text-white items-center justify-center shadow-sm">
                                {totalUnread > 99 ? '99+' : totalUnread}
                            </span>
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            
            <PopoverContent className="w-96 p-0 bg-white border-gray-200 shadow-premium z-[100]" align="end">
                <Tabs defaultValue="notifications" className="w-full">
                    <div className="p-4 flex items-center justify-between bg-white/5">
                        <TabsList className="bg-black/20">
                            <TabsTrigger value="notifications" className="text-xs">Notificaciones {unreadCount > 0 && `(${unreadCount})`}</TabsTrigger>
                            <TabsTrigger value="requests" className="text-xs">Solicitudes {pendingCount > 0 && `(${pendingCount})`}</TabsTrigger>
                        </TabsList>
                        
                        <Button variant="ghost" size="sm" onClick={() => markAllAsRead()} className="text-[10px] text-gray-400 hover:text-white px-2 h-6">
                            Marcar leídas
                        </Button>
                    </div>
                    
                    <Separator className="bg-white/5" />
                    
                    <TabsContent value="notifications" className="m-0 border-none outline-none">
                        <div className="flex gap-2 p-2 px-4 bg-white/5">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className={cn("text-[10px] h-6 rounded-full px-3", filter === 'all' ? "bg-primary text-white" : "text-gray-400")}
                                onClick={() => setFilter('all')}
                            >
                                Todas
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className={cn("text-[10px] h-6 rounded-full px-3", filter === 'unread' ? "bg-primary text-white" : "text-gray-400")}
                                onClick={() => setFilter('unread')}
                            >
                                No leídas
                            </Button>
                        </div>
                        <ScrollArea className="h-[350px]">
                            {filteredNotifications.length > 0 ? (
                                <div className="flex flex-col">
                                    {filteredNotifications.map((notif: Notification) => (
                                        <div 
                                            key={notif.id} 
                                            className={cn(
                                                "p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group cursor-pointer",
                                                !notif.is_read ? "bg-white/[0.02]" : ""
                                            )}
                                            onClick={() => !notif.is_read && markAsRead(notif.id)}
                                        >
                                            <div className="flex gap-3">
                                                <div className="mt-1 p-2 rounded-lg bg-white/5">
                                                    {getIconForType(notif.type)}
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex justify-between items-start">
                                                        <p className={cn("text-[13px] leading-tight", !notif.is_read ? "font-black text-black" : "font-bold text-gray-700")}>
                                                            {notif.title}
                                                        </p>
                                                        {!notif.is_read && <span className="w-2 h-2 rounded-full bg-primary mt-1" />}
                                                    </div>
                                                    <p className="text-[11px] text-gray-400 font-medium leading-snug">
                                                        {notif.message}
                                                    </p>
                                                    <div className="flex items-center justify-between pt-1">
                                                        <span className="text-[10px] text-gray-500 flex items-center font-mono">
                                                            <Clock size={10} className="mr-1" />
                                                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: es })}
                                                        </span>
                                                        {notif.link && (
                                                            <Button variant="link" size="sm" className="h-4 p-0 text-[10px] text-primary" asChild>
                                                                <Link to={notif.link}>Ver detalle →</Link>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[300px] text-center p-6">
                                    <div className="p-4 rounded-full bg-white/5 mb-4">
                                        <Check className="w-8 h-8 text-emerald-500" />
                                    </div>
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Todo al día</p>
                                    <p className="text-xs text-gray-500 mt-1">No hay notificaciones {filter === 'unread' ? 'nuevas' : ''}</p>
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="requests" className="m-0 border-none outline-none">
                        <ScrollArea className="h-[390px]">
                            {pendingRequests.length > 0 ? (
                                <div className="flex flex-col">
                                    {pendingRequests.map((req) => (
                                        <div 
                                            key={req.id} 
                                            className="p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group"
                                        >
                                            <div className="flex gap-3">
                                                <div className="mt-1 p-2 rounded-lg bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all duration-300">
                                                    <FileText size={16} />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <p className="text-[13px] font-bold text-white leading-tight">
                                                        Eliminación de Documento
                                                    </p>
                                                    <p className="text-[11px] text-gray-400 line-clamp-1 font-medium">
                                                        {req.document_type} • {req.socio_details?.nombres}
                                                    </p>
                                                    <div className="flex items-center gap-2 pt-2">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="h-7 px-2 text-[10px] font-bold border-white/10 hover:bg-primary hover:text-white transition-colors"
                                                            asChild
                                                        >
                                                            <a href={req.document_link} target="_blank" rel="noopener noreferrer">
                                                                <ExternalLink size={12} className="mr-1" /> REVISAR DOC
                                                            </a>
                                                        </Button>
                                                        <span className="text-[10px] text-gray-500 flex items-center ml-auto font-mono">
                                                            <Clock size={10} className="mr-1" />
                                                            {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: es })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="p-2">
                                        <Button 
                                            variant="ghost" 
                                            className="w-full text-[11px] font-black text-primary hover:bg-primary/10 uppercase tracking-tighter" 
                                            asChild
                                        >
                                            <Link to="/partner-documents?tab=requests">
                                                Gestionar todas las solicitudes
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[300px] text-center p-6">
                                    <div className="p-4 rounded-full bg-white/5 mb-4">
                                        <ShieldAlert className="w-8 h-8 text-gray-600" />
                                    </div>
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Sin Solicitudes</p>
                                    <p className="text-xs text-gray-500 mt-1">No hay solicitudes pendientes de aprobación.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>
                </Tabs>

                {isSupported && !isSubscribed && permission !== 'denied' && (
                    <div className="p-3 bg-white/5 border-t border-white/10 text-center">
                        <Button 
                            variant="default" 
                            size="sm" 
                            className="w-full text-xs font-bold shadow-md bg-emerald-600 hover:bg-emerald-500 text-white" 
                            onClick={subscribeToPush}
                        >
                            Activar Notificaciones de Escritorio
                        </Button>
                    </div>
                )}
                
                <div className="p-2 bg-[#141414] border-t border-white/5 text-center">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[10px] text-gray-500 hover:text-white underline"
                        onClick={async () => {
                            import('sonner').then(async ({ toast }) => {
                                const { supabase } = await import('@/lib/supabaseClient');
                                const { data: { session } } = await supabase.auth.getSession();
                                if (!session) return toast.error("No session");
                                try {
                                    const res = await fetch('/api/send-push', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ user_id: session.user.id, title: 'Diagnóstico Push', message: '¡Si lees esto, el servidor funciona!' })
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                        toast.success(`Push enviado a ${data.count} dispositivo(s).`);
                                        if (data.count === 0) toast.error("No tienes suscripciones activas (0 dispositivos).");
                                    } else {
                                        toast.error(`Error del servidor: ${data.error || JSON.stringify(data)}`);
                                    }
                                } catch (e: any) {
                                    toast.error(`Fallo de red: ${e.message}`);
                                }
                            });
                        }}
                    >
                        Diagnóstico Push (Probar conexión)
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default NotificationBell;
