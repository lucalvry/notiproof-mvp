import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Clock, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SearchResult {
  id: string;
  title: string;
  excerpt?: string;
  slug: string;
  category?: {
    name: string;
    slug: string;
  };
  tags?: string[];
  view_count: number;
  rank?: number;
}

interface HelpSearchProps {
  onResultClick: (slug: string) => void;
  placeholder?: string;
}

export const HelpSearch = ({ onResultClick, placeholder = "Search help articles..." }: HelpSearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchTimeout = useRef<NodeJS.Timeout>();
  const resultsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('help-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (query.trim().length >= 2) {
      // Debounce search
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
      
      searchTimeout.current = setTimeout(() => {
        performSearch(query.trim());
      }, 300);
    } else {
      setResults([]);
      setShowResults(false);
    }

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    setSelectedIndex(-1);

    try {
      // Use PostgreSQL full-text search with ranking
      const { data, error } = await supabase
        .from('help_articles')
        .select(`
          id,
          title,
          excerpt,
          slug,
          tags,
          view_count,
          help_categories (
            name,
            slug
          )
        `)
        .textSearch('title', searchQuery)
        .eq('is_published', true)
        .order('view_count', { ascending: false })
        .limit(10);

      if (error) throw error;

      const searchResults = data.map(item => ({
        ...item,
        category: item.help_categories
      }));

      setResults(searchResults);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to search articles. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveRecentSearch = (searchQuery: string) => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (trimmed.length < 2) return;

    const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('help-recent-searches', JSON.stringify(updated));
  };

  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(query);
    setShowResults(false);
    setQuery('');
    onResultClick(result.slug);
  };

  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
    performSearch(search);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-primary/20 text-primary">{part}</mark>
      ) : part
    );
  };

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim().length >= 2) {
              setShowResults(true);
            }
          }}
          className="pl-10 pr-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showResults && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-96 overflow-hidden">
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto" ref={resultsRef}>
              {results.length > 0 ? (
                <div className="divide-y">
                  {results.map((result, index) => (
                    <div
                      key={result.id}
                      className={`p-4 cursor-pointer transition-colors ${
                        index === selectedIndex 
                          ? 'bg-primary/5 border-l-2 border-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="flex items-start gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm mb-1">
                            {highlightMatch(result.title, query)}
                          </h4>
                          {result.excerpt && (
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {highlightMatch(result.excerpt, query)}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            {result.category && (
                              <Badge variant="secondary" className="text-xs">
                                {result.category.name}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {result.view_count} views
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : query.trim().length >= 2 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No articles found for "{query}"</p>
                  <p className="text-xs mt-1">Try different keywords or check spelling</p>
                </div>
              ) : (
                recentSearches.length > 0 && (
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Recent Searches</span>
                    </div>
                    <div className="space-y-1">
                      {recentSearches.map((search, index) => (
                        <button
                          key={index}
                          onClick={() => handleRecentSearchClick(search)}
                          className="block w-full text-left text-sm p-2 rounded hover:bg-muted/50 transition-colors"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};