import { CAMPAIGN_TEMPLATES, CampaignTemplate } from "@/lib/campaignTemplates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo } from "react";
import { Search, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FullTemplateLibraryProps {
  onSelectTemplate: (template: CampaignTemplate) => void;
  selectedTemplateId?: string;
}

export function FullTemplateLibrary({ 
  onSelectTemplate, 
  selectedTemplateId 
}: FullTemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return CAMPAIGN_TEMPLATES.filter(template => {
      const matchesSearch = 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.messageTemplate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.example.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = 
        selectedCategory === "all" || template.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  // Group by category for counts
  const categoryCounts = useMemo(() => ({
    all: CAMPAIGN_TEMPLATES.length,
    ecommerce: CAMPAIGN_TEMPLATES.filter(t => t.category === 'ecommerce').length,
    saas: CAMPAIGN_TEMPLATES.filter(t => t.category === 'saas').length,
    services: CAMPAIGN_TEMPLATES.filter(t => t.category === 'services').length,
    content: CAMPAIGN_TEMPLATES.filter(t => t.category === 'content').length,
    social: CAMPAIGN_TEMPLATES.filter(t => t.category === 'social').length,
  }), []);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Browse All Templates</h2>
        <p className="text-muted-foreground">
          Choose from {CAMPAIGN_TEMPLATES.length} pre-built notification messages
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">
            All ({categoryCounts.all})
          </TabsTrigger>
          <TabsTrigger value="ecommerce">
            E-commerce ({categoryCounts.ecommerce})
          </TabsTrigger>
          <TabsTrigger value="saas">
            SaaS ({categoryCounts.saas})
          </TabsTrigger>
          <TabsTrigger value="services">
            Services ({categoryCounts.services})
          </TabsTrigger>
          <TabsTrigger value="content">
            Content ({categoryCounts.content})
          </TabsTrigger>
          <TabsTrigger value="social">
            Social ({categoryCounts.social})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          <ScrollArea className="h-[500px] pr-4">
            <div className="grid gap-3 md:grid-cols-2">
              {filteredTemplates.map((template) => {
                const isSelected = selectedTemplateId === template.id;
                
                return (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all hover:border-primary/50 ${
                      isSelected 
                        ? 'border-primary shadow-sm bg-primary/5' 
                        : ''
                    }`}
                    onClick={() => onSelectTemplate(template)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">
                          {template.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {template.category}
                          </Badge>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* Template */}
                        <div className="bg-muted p-3 rounded-md">
                          <p className="text-xs font-mono text-muted-foreground mb-1">
                            Template:
                          </p>
                          <p className="text-sm font-medium">
                            {template.messageTemplate}
                          </p>
                        </div>

                        {/* Example */}
                        <div className="bg-primary/5 p-3 rounded-md border border-primary/20">
                          <p className="text-xs text-muted-foreground mb-1">
                            Example:
                          </p>
                          <p className="text-sm font-medium">
                            {template.example}
                          </p>
                        </div>

                        {/* Variables */}
                        <div className="flex flex-wrap gap-1">
                          {template.variables.slice(0, 3).map(v => (
                            <Badge 
                              key={v.name} 
                              variant="secondary" 
                              className="text-xs"
                            >
                              {`{{${v.name}}}`}
                            </Badge>
                          ))}
                          {template.variables.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.variables.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No templates found matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
}
