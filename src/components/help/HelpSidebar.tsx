import React, { useState, useEffect } from 'react';
import { X, Search, Play, BookOpen, Lightbulb, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useHelp } from '@/contexts/HelpContext';
import { HelpContent } from '@/types/help';
import { supabase } from '@/integrations/supabase/client';

const SAMPLE_HELP_CONTENT: HelpContent[] = [
  {
    id: 'widget-creation',
    title: 'Creating Your First Widget',
    content: 'Learn how to create and customize social proof widgets to boost conversions on your website.',
    category: 'widgets',
    tags: ['beginner', 'setup', 'widgets'],
    videoUrl: '#',
    links: [
      { text: 'Widget Templates Guide', url: '/help/templates' },
      { text: 'Display Rules Setup', url: '/help/display-rules', external: false }
    ]
  },
  {
    id: 'integration-setup',
    title: 'Installing Widgets on Your Site',
    content: 'Step-by-step guide to install and configure widgets on your website using our embed codes.',
    category: 'installation',
    tags: ['installation', 'integration', 'embed'],
    videoUrl: '#',
    links: [
      { text: 'Installation Guide', url: '/help/installation' },
      { text: 'Troubleshooting', url: '/help/troubleshooting', external: false }
    ]
  },
  {
    id: 'analytics-reading',
    title: 'Understanding Your Analytics',
    content: 'Learn how to read and interpret your widget performance metrics to optimize conversions.',
    category: 'analytics',
    tags: ['analytics', 'metrics', 'optimization'],
    links: [
      { text: 'Analytics Dashboard', url: '/dashboard/analytics' },
      { text: 'A/B Testing Guide', url: '/help/ab-testing', external: false }
    ]
  }
];

const QUICK_ACTIONS = [
  {
    title: 'Take Dashboard Tour',
    description: 'Get oriented with all dashboard features',
    action: 'start-dashboard-tour',
    icon: Play
  },
  {
    title: 'Create First Widget',
    description: 'Step-by-step widget creation',
    action: 'start-widget-tour',
    icon: Lightbulb
  },
  {
    title: 'Setup Integration',
    description: 'Install widgets on your site',
    action: 'start-installation-tour',
    icon: BookOpen
  }
];

interface HelpContentCardProps {
  content: HelpContent;
  isExpanded: boolean;
  onToggle: () => void;
}

function HelpContentCard({ content, isExpanded, onToggle }: HelpContentCardProps) {
  return (
    <Card className="mb-3">
      <CardHeader className="pb-2 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-sm font-medium mb-1">{content.title}</CardTitle>
            <div className="flex gap-1 mb-2">
              {content.tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <ChevronRight 
            className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
          />
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-3">{content.content}</p>
          
          <div className="space-y-2">
            {content.videoUrl && (
              <Button size="sm" variant="outline" className="w-full justify-start">
                <Play className="h-3 w-3 mr-2" />
                Watch Video Tutorial
              </Button>
            )}
            
            {content.links?.map((link, index) => (
              <Button 
                key={index} 
                size="sm" 
                variant="ghost" 
                className="w-full justify-start text-xs"
                onClick={() => {
                  if (link.external) {
                    window.open(link.url, '_blank');
                  } else {
                    window.location.href = link.url;
                  }
                }}
              >
                {link.external ? (
                  <ExternalLink className="h-3 w-3 mr-2" />
                ) : (
                  <BookOpen className="h-3 w-3 mr-2" />
                )}
                {link.text}
              </Button>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function HelpSidebar() {
  const { isHelpSidebarOpen, toggleHelpSidebar, startTour, getHelpContent, searchHelpContent } = useHelp();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedContent, setExpandedContent] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [helpContent, setHelpContent] = useState<HelpContent[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch help content from Supabase
  useEffect(() => {
    const fetchHelpContent = async () => {
      setLoading(true);
      try {
        const { data: articles, error } = await supabase
          .from('help_articles')
          .select(`
            id,
            title,
            content,
            excerpt,
            tags,
            video_url,
            category_id,
            help_categories!help_articles_category_id_fkey(
              id,
              name
            )
          `)
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching help content:', error);
          // Fall back to sample content if there's an error
          setHelpContent(SAMPLE_HELP_CONTENT);
          return;
        }

        // Transform Supabase data to match HelpContent interface
        const transformedContent: HelpContent[] = articles?.map(article => ({
          id: article.id,
          title: article.title,
          content: article.excerpt || article.content,
          category: article.help_categories?.name || 'general',
          tags: article.tags || [],
          videoUrl: article.video_url,
          links: [] // Could be populated from a separate table if needed
        })) || [];

        setHelpContent(transformedContent.length > 0 ? transformedContent : SAMPLE_HELP_CONTENT);
      } catch (error) {
        console.error('Error fetching help content:', error);
        setHelpContent(SAMPLE_HELP_CONTENT);
      } finally {
        setLoading(false);
      }
    };

    if (isHelpSidebarOpen) {
      fetchHelpContent();
    }
  }, [isHelpSidebarOpen]);

  // Use search functionality from context when available
  const filteredContent = searchQuery 
    ? searchHelpContent(searchQuery).filter(content => 
        activeCategory === 'all' || content.category === activeCategory
      )
    : helpContent.filter(content => 
        activeCategory === 'all' || content.category === activeCategory
      );

  const categories = ['all', ...Array.from(new Set(helpContent.map(c => c.category)))];

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'start-dashboard-tour':
        startTour('dashboard-overview');
        break;
      case 'start-widget-tour':
        startTour('widget-creation');
        break;
      case 'start-installation-tour':
        startTour('installation-setup');
        break;
    }
  };

  if (!isHelpSidebarOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 bg-background border-l shadow-lg">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">Help Center</h2>
          <Button size="sm" variant="ghost" onClick={toggleHelpSidebar}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="font-medium text-sm mb-3">Quick Start</h3>
              <div className="space-y-2">
                {QUICK_ACTIONS.map((action) => (
                  <Button
                    key={action.action}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleQuickAction(action.action)}
                  >
                    <action.icon className="h-4 w-4 mr-2" />
                    <div className="text-left">
                      <div className="font-medium text-xs">{action.title}</div>
                      <div className="text-xs text-muted-foreground">{action.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Category Filter */}
            <div>
              <h3 className="font-medium text-sm mb-3">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    size="sm"
                    variant={activeCategory === category ? "default" : "outline"}
                    onClick={() => setActiveCategory(category)}
                    className="text-xs"
                  >
                    {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Help Content */}
            <div>
              <h3 className="font-medium text-sm mb-3">Help Articles</h3>
              {filteredContent.length > 0 ? (
                filteredContent.map((content) => (
                  <HelpContentCard
                    key={content.id}
                    content={content}
                    isExpanded={expandedContent === content.id}
                    onToggle={() => setExpandedContent(
                      expandedContent === content.id ? null : content.id
                    )}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No help articles found for "{searchQuery}"
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t">
          <Button variant="outline" size="sm" className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            Visit Full Documentation
          </Button>
        </div>
      </div>
    </div>
  );
}