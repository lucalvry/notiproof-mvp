import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { INDUSTRY_EVENT_TEMPLATES, EventTemplate, getTemplatesByIndustry } from "@/data/industryTemplates";

interface TemplateSelectorProps {
  selectedTemplate?: EventTemplate;
  onTemplateSelect: (template: EventTemplate) => void;
  businessType?: string;
}

export const TemplateSelector = ({ selectedTemplate, onTemplateSelect, businessType }: TemplateSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState(businessType || "all");

  const industries = Object.keys(INDUSTRY_EVENT_TEMPLATES);
  
  const filteredTemplates = (industry: string) => {
    const templates = industry === "all" 
      ? Object.values(INDUSTRY_EVENT_TEMPLATES).flat()
      : getTemplatesByIndustry(industry);
    
    return templates.filter(template =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getIndustryLabel = (industry: string) => {
    const labels: Record<string, string> = {
      ecommerce: "E-commerce",
      saas: "SaaS",
      services: "Services",
      real_estate: "Real Estate",
      education: "Education",
      events: "Events",
      retail: "Local Business",
      ngo: "Nonprofits",
      blog: "Content/Blogging"
    };
    return labels[industry] || industry;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          {industries.map((industry) => (
            <TabsTrigger key={industry} value={industry} className="text-xs">
              {getIndustryLabel(industry)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates("all").map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplate?.id === template.id}
                onSelect={() => onTemplateSelect(template)}
              />
            ))}
          </div>
        </TabsContent>

        {industries.map((industry) => (
          <TabsContent key={industry} value={industry} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates(industry).map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={selectedTemplate?.id === template.id}
                  onSelect={() => onTemplateSelect(template)}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

interface TemplateCardProps {
  template: EventTemplate;
  isSelected: boolean;
  onSelect: () => void;
}

const TemplateCard = ({ template, isSelected, onSelect }: TemplateCardProps) => {
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary border-primary' : ''
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{template.businessContext.icon}</span>
            <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
          </div>
          {isSelected && <Sparkles className="h-4 w-4 text-primary" />}
        </div>
        <CardDescription className="text-xs">{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <Badge variant="secondary" className="text-xs">
            {template.category}
          </Badge>
          
          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm font-mono text-muted-foreground">
              {template.messageTemplate}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {template.placeholders.map((placeholder) => (
              <Badge key={placeholder} variant="outline" className="text-xs">
                {placeholder}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};