import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  PageRule, 
  URGENCY_LEVELS, 
  UrgencyLevel,
  PAGE_PRESETS,
  getMessageSuggestions,
  getSuggestedIcon,
  detectPageType,
  generateRuleId,
  ICON_OPTIONS,
} from "@/lib/visitorsPulsePresets";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PageRulesEditorProps {
  rules: PageRule[];
  onChange: (rules: PageRule[]) => void;
  excludedPages: string[];
  onExcludedPagesChange: (pages: string[]) => void;
}

export function PageRulesEditor({ 
  rules, 
  onChange, 
  excludedPages, 
  onExcludedPagesChange 
}: PageRulesEditorProps) {
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [newExcludedPage, setNewExcludedPage] = useState("");

  const addRule = () => {
    const newRule: PageRule = {
      id: generateRuleId(),
      urlPattern: "",
      messageTemplate: "{{count}} people are viewing this page",
      icon: "👥",
      urgencyLevel: "social_proof",
      enabled: true,
    };
    onChange([...rules, newRule]);
    setExpandedRule(newRule.id);
  };

  const updateRule = (id: string, updates: Partial<PageRule>) => {
    onChange(rules.map(rule => 
      rule.id === id ? { ...rule, ...updates } : rule
    ));
  };

  const deleteRule = (id: string) => {
    onChange(rules.filter(rule => rule.id !== id));
    if (expandedRule === id) setExpandedRule(null);
  };

  const handleUrlPatternChange = (id: string, pattern: string) => {
    const pageType = detectPageType(pattern);
    const rule = rules.find(r => r.id === id);
    
    if (pageType && rule && !rule.messageTemplate.includes('{{count}}')) {
      // Auto-suggest a message based on detected page type
      const suggestions = getMessageSuggestions(rule.urgencyLevel, pageType);
      updateRule(id, { 
        urlPattern: pattern,
        messageTemplate: suggestions[0] || rule.messageTemplate
      });
    } else {
      updateRule(id, { urlPattern: pattern });
    }
  };

  const addExcludedPage = () => {
    if (newExcludedPage && !excludedPages.includes(newExcludedPage)) {
      onExcludedPagesChange([...excludedPages, newExcludedPage]);
      setNewExcludedPage("");
    }
  };

  const removeExcludedPage = (page: string) => {
    onExcludedPagesChange(excludedPages.filter(p => p !== page));
  };

  return (
    <div className="space-y-6">
      {/* Page-Specific Rules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Page-Specific Messages</Label>
            <p className="text-sm text-muted-foreground">
              Show different messages on specific pages for better conversions
            </p>
          </div>
          <Button onClick={addRule} variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Rule
          </Button>
        </div>

        {rules.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <div className="text-muted-foreground text-sm">
                No page rules yet. Add rules to show custom messages on specific pages.
              </div>
              <Button onClick={addRule} variant="outline" size="sm" className="mt-3 gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <Collapsible 
                key={rule.id} 
                open={expandedRule === rule.id}
                onOpenChange={(open) => setExpandedRule(open ? rule.id : null)}
              >
                <Card className={cn(
                  "transition-all",
                  !rule.enabled && "opacity-60"
                )}>
                  <CollapsibleTrigger asChild>
                    <div className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{rule.icon}</span>
                          <code className="text-sm bg-muted px-2 py-0.5 rounded">
                            {rule.urlPattern || "/path"}
                          </code>
                          <Badge variant="outline" className="text-xs">
                            {URGENCY_LEVELS.find(u => u.id === rule.urgencyLevel)?.name}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {rule.messageTemplate.replace('{{count}}', '12')}
                        </p>
                      </div>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) => updateRule(rule.id, { enabled: checked })}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {expandedRule === rule.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 px-4 space-y-4 border-t">
                      {/* URL Pattern */}
                      <div className="space-y-2">
                        <Label>URL Pattern</Label>
                        <Input
                          value={rule.urlPattern}
                          onChange={(e) => handleUrlPatternChange(rule.id, e.target.value)}
                          placeholder="/pricing, /checkout, /product/*"
                        />
                        <p className="text-xs text-muted-foreground">
                          Use * for wildcards (e.g., /product/* matches all product pages)
                        </p>
                      </div>

                      {/* Urgency Level */}
                      <div className="space-y-2">
                        <Label>Urgency Level</Label>
                        <Select
                          value={rule.urgencyLevel}
                          onValueChange={(value: UrgencyLevel) => {
                            const icon = getSuggestedIcon(value);
                            updateRule(rule.id, { urgencyLevel: value, icon });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {URGENCY_LEVELS.map((level) => (
                              <SelectItem key={level.id} value={level.id}>
                                <div className="flex items-center gap-2">
                                  <span>{level.icon}</span>
                                  <span>{level.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    - {level.description}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Message Template */}
                      <div className="space-y-2">
                        <Label>Message Template</Label>
                        <Input
                          value={rule.messageTemplate}
                          onChange={(e) => updateRule(rule.id, { messageTemplate: e.target.value })}
                          placeholder="{{count}} people are viewing this page"
                        />
                        
                        {/* Message Suggestions */}
                        <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg">
                          <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <div className="space-y-1">
                            <p className="text-xs font-medium">Suggestions:</p>
                            <div className="flex flex-wrap gap-1">
                              {getMessageSuggestions(rule.urgencyLevel, detectPageType(rule.urlPattern) || undefined)
                                .slice(0, 3)
                                .map((msg, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => updateRule(rule.id, { messageTemplate: msg })}
                                    className="text-xs bg-background px-2 py-1 rounded border hover:border-primary transition-colors"
                                  >
                                    {msg.replace('{{count}}', '12')}
                                  </button>
                                ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Icon */}
                      <div className="space-y-2">
                        <Label>Icon</Label>
                        <div className="flex flex-wrap gap-2">
                          {ICON_OPTIONS[rule.urgencyLevel].map((icon) => (
                            <button
                              key={icon}
                              type="button"
                              onClick={() => updateRule(rule.id, { icon })}
                              className={cn(
                                "w-9 h-9 rounded-lg border-2 flex items-center justify-center text-lg transition-all",
                                rule.icon === icon 
                                  ? "border-primary bg-primary/10" 
                                  : "border-border hover:border-primary/50"
                              )}
                            >
                              {icon}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Delete Button */}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Rule
                      </Button>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </div>

      {/* Excluded Pages */}
      <div className="space-y-3">
        <div>
          <Label className="text-base">Hide on Pages</Label>
          <p className="text-sm text-muted-foreground">
            Don't show visitor notifications on these pages
          </p>
        </div>
        
        <div className="flex gap-2">
          <Input
            placeholder="/contact, /support, /privacy"
            value={newExcludedPage}
            onChange={(e) => setNewExcludedPage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addExcludedPage()}
          />
          <Button onClick={addExcludedPage} variant="secondary">Add</Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {excludedPages.map((page) => (
            <Badge
              key={page}
              variant="secondary"
              className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => removeExcludedPage(page)}
            >
              {page} ×
            </Badge>
          ))}
          {excludedPages.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No excluded pages. Notifications will show everywhere.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
