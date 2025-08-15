import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, FileText, Sparkles, Users, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobilePlanningTabsProps {
  children: React.ReactNode;
  defaultTab?: string;
  className?: string;
}

interface TabConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export function MobilePlanningTabs({ children, defaultTab = 'timeline', className }: MobilePlanningTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Extract tab content from children
  const tabs: TabConfig[] = React.useMemo(() => {
    return React.Children.map(children, (child) => {
      if (React.isValidElement(child) && child.props.name) {
        const tabId = child.props.name.toLowerCase();
        const icons: Record<string, React.ReactNode> = {
          timeline: <Clock className="w-4 h-4" />,
          summary: <FileText className="w-4 h-4" />,
          ai: <Sparkles className="w-4 h-4" />,
          participants: <Users className="w-4 h-4" />,
          venues: <MapPin className="w-4 h-4" />
        };

        return {
          id: tabId,
          label: child.props.name,
          icon: icons[tabId] || <Clock className="w-4 h-4" />,
          content: child.props.children
        };
      }
      return null;
    }).filter(Boolean) || [];
  }, [children]);

  return (
    <div className={cn("md:hidden", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12 bg-card/50 backdrop-blur-sm border border-border/30 rounded-xl p-1">
          {tabs.slice(0, 3).map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
              )}
            >
              {tab.icon}
              <span className="text-xs font-medium hidden sm:inline">
                {tab.label}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            className="mt-4 space-y-4 focus:outline-none"
          >
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// Helper component for tab content
interface TabProps {
  name: string;
  children: React.ReactNode;
}

export function Tab({ name, children }: TabProps) {
  return <div data-tab-name={name}>{children}</div>;
}