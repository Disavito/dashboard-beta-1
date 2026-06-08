import { 
  Settings2, 
  RefreshCw, 
  Move, 
  Check,
  LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { WidgetLayoutItem } from '@/hooks/useDashboardLayout';
import { cn } from '@/lib/utils';

interface DashboardCustomizerProps {
  widgets: WidgetLayoutItem[];
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  onToggleVisibility: (widgetId: string) => void;
  onReset: () => void;
}

export function DashboardCustomizer({
  widgets,
  isEditMode,
  setIsEditMode,
  onToggleVisibility,
  onReset
}: DashboardCustomizerProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Edit Mode Toggle Button */}
      <Button
        variant={isEditMode ? "default" : "outline"}
        onClick={() => setIsEditMode(!isEditMode)}
        className={cn(
          "font-bold rounded-xl h-11 transition-all active:scale-95 shadow-sm",
          isEditMode 
            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20" 
            : "border-border hover:bg-accent text-foreground"
        )}
      >
        {isEditMode ? (
          <>
            <Check className="w-4 h-4 mr-2" /> Guardar Distribución
          </>
        ) : (
          <>
            <Move className="w-4 h-4 mr-2 text-primary" /> Reordenar Paneles
          </>
        )}
      </Button>

      {/* Customize Panels Settings Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            disabled={isEditMode}
            className="font-bold rounded-xl h-11 border-border hover:bg-accent text-foreground transition-all active:scale-95 shadow-sm"
          >
            <Settings2 className="w-4 h-4 mr-2 text-primary" /> Personalizar Vista
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[90vw] sm:max-w-md rounded-l-3xl border-l border-border bg-background/95 backdrop-blur-md">
          <SheetHeader className="pb-6 border-b border-border">
            <SheetTitle className="text-xl font-black flex items-center gap-2 text-foreground tracking-tight uppercase">
              <LayoutDashboard className="w-5 h-5 text-primary" />
              Personalizar Panel
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground font-medium">
              Activa o desactiva las secciones visibles del panel según tus necesidades diarias.
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-6 overflow-y-auto max-h-[calc(100vh-180px)]">
            <div className="space-y-4">
              {widgets.map((widget) => (
                <div 
                  key={widget.id}
                  className={cn(
                    "flex items-start justify-between gap-4 p-4 rounded-2xl border transition-all duration-300",
                    widget.visible 
                      ? "bg-card border-border hover:border-primary/30" 
                      : "bg-muted/30 border-dashed border-border opacity-70"
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        widget.visible ? "bg-primary" : "bg-muted-foreground"
                      )} />
                      <p className="font-bold text-sm text-foreground">{widget.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pr-2">{widget.description}</p>
                  </div>
                  
                  <div className="flex items-center pt-1">
                    <Switch
                      checked={widget.visible}
                      onCheckedChange={() => onToggleVisibility(widget.id)}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Reset Button */}
            <div className="pt-4 border-t border-border flex items-center justify-between gap-4">
              <Button
                variant="ghost"
                onClick={onReset}
                className="text-xs font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Restaurar valores por defecto
              </Button>

              <SheetClose asChild>
                <Button className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/95 transition-all">
                  Listo
                </Button>
              </SheetClose>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
