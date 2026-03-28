import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu,
  Zap,
  Brain,
  Package,
  Link2,
  Shield,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  FileSignature,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Prompt Compressor', href: '/compress', icon: Cpu },
  { name: 'AI Execution', href: '/execute', icon: Zap },
  { name: 'Cognitive Analysis', href: '/analyze', icon: Brain },
  { name: 'AI Signature', href: '/signature', icon: FileSignature },
  { name: 'Evidence Bundle', href: '/bundle', icon: Package },
  { name: 'Blockchain Anchor', href: '/anchor', icon: Link2 },
  { name: 'Audit & Verify', href: '/verify', icon: Shield },
];

interface SidebarProps {
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

function SidebarContent({ collapsed, setCollapsed, onNavigate }: { 
  collapsed: boolean; 
  setCollapsed: (v: boolean) => void;
  onNavigate?: () => void;
}) {
  const location = useLocation();

  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <span className="text-lg font-semibold text-sidebar-foreground whitespace-nowrap">
                CogniEvidence
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          const link = (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/25'
                  : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'animate-pulse')} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.name} delayDuration={0}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.name}
                </TooltipContent>
              </Tooltip>
            );
          }

          return link;
        })}
      </nav>

      {/* Collapse Toggle - desktop only */}
      {setCollapsed && (
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Version Badge */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-4"
          >
            <div className="rounded-lg bg-sidebar-accent/50 px-3 py-2 text-xs text-sidebar-muted">
              <span className="font-medium">v1.0.0</span> · Demo Mode
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function Sidebar({ isMobile, isOpen, onClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Mobile: use Sheet drawer
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
          <div className="flex h-full flex-col">
            <div className="absolute right-3 top-3 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 text-sidebar-muted hover:text-sidebar-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SidebarContent collapsed={false} setCollapsed={() => {}} onNavigate={onClose} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: collapsible sidebar
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="relative hidden md:flex h-screen flex-col bg-sidebar border-r border-sidebar-border"
    >
      <SidebarContent collapsed={collapsed} setCollapsed={setCollapsed} />
    </motion.aside>
  );
}
