import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, GripVertical, X } from 'lucide-react';
import { PAGE_DEFINITIONS } from '@/lib/testimonialTemplates';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PageSequenceEditorProps {
  sequence: string[];
  onChange: (sequence: string[]) => void;
}

export function PageSequenceEditor({ sequence, onChange }: PageSequenceEditorProps) {
  const [selectedPage, setSelectedPage] = useState<string>('');

  const handleAddPage = () => {
    if (selectedPage && !sequence.includes(selectedPage)) {
      onChange([...sequence, selectedPage]);
      setSelectedPage('');
    }
  };

  const handleRemovePage = (index: number) => {
    const newSequence = sequence.filter((_, i) => i !== index);
    onChange(newSequence);
  };

  const handleMovePage = (fromIndex: number, toIndex: number) => {
    const newSequence = [...sequence];
    const [removed] = newSequence.splice(fromIndex, 1);
    newSequence.splice(toIndex, 0, removed);
    onChange(newSequence);
  };

  const availablePages = Object.keys(PAGE_DEFINITIONS).filter(
    (pageId) => !sequence.includes(pageId)
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Page Sequence</h3>
        <p className="text-xs text-muted-foreground">
          Drag to reorder pages in your form
        </p>
      </div>

      <div className="space-y-2">
        {sequence.map((pageId, index) => {
          const pageInfo = PAGE_DEFINITIONS[pageId] || {
            name: pageId,
            description: '',
            icon: '📝',
          };

          return (
            <Card key={`${pageId}-${index}`} className="p-3">
              <div className="flex items-center gap-3">
                <button
                  className="cursor-grab active:cursor-grabbing text-muted-foreground"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <GripVertical className="h-4 w-4" />
                </button>

                <div className="flex-1 flex items-center gap-2">
                  <span className="text-lg">{pageInfo.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{pageInfo.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pageInfo.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {index > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMovePage(index, index - 1)}
                    >
                      ↑
                    </Button>
                  )}
                  {index < sequence.length - 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMovePage(index, index + 1)}
                    >
                      ↓
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {availablePages.length > 0 && (
        <div className="flex gap-2">
          <Select value={selectedPage} onValueChange={setSelectedPage}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select page to add" />
            </SelectTrigger>
            <SelectContent>
              {availablePages.map((pageId) => {
                const pageInfo = PAGE_DEFINITIONS[pageId];
                return (
                  <SelectItem key={pageId} value={pageId}>
                    <span className="flex items-center gap-2">
                      <span>{pageInfo.icon}</span>
                      <span>{pageInfo.name}</span>
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button onClick={handleAddPage} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
