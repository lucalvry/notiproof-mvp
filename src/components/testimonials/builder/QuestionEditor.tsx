import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, X, GripVertical } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface Question {
  id: string;
  text: string;
  type: 'text' | 'textarea' | 'rating' | 'multiple_choice';
  is_required: boolean;
  options?: string[];
}

interface QuestionEditorProps {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}

export function QuestionEditor({ questions, onChange }: QuestionEditorProps) {
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: `q${questions.length + 1}`,
      text: '',
      type: 'textarea',
      is_required: true,
      options: [],
    };
    setEditingQuestion(newQuestion);
    setIsDialogOpen(true);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setIsDialogOpen(true);
  };

  const handleSaveQuestion = () => {
    if (!editingQuestion || !editingQuestion.text.trim()) {
      return;
    }

    const existingIndex = questions.findIndex((q) => q.id === editingQuestion.id);
    if (existingIndex >= 0) {
      const updated = [...questions];
      updated[existingIndex] = editingQuestion;
      onChange(updated);
    } else {
      onChange([...questions, editingQuestion]);
    }

    setIsDialogOpen(false);
    setEditingQuestion(null);
  };

  const handleRemoveQuestion = (id: string) => {
    onChange(questions.filter((q) => q.id !== id));
  };

  const handleMoveQuestion = (fromIndex: number, toIndex: number) => {
    const updated = [...questions];
    const [removed] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, removed);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Custom Questions</h3>
        <p className="text-xs text-muted-foreground">
          Add custom questions to your form (Max 5)
        </p>
      </div>

      <div className="space-y-2">
        {questions.map((question, index) => (
          <Card key={question.id} className="p-3">
            <div className="flex items-start gap-3">
              <button
                className="cursor-grab active:cursor-grabbing text-muted-foreground mt-1"
                onMouseDown={(e) => e.preventDefault()}
              >
                <GripVertical className="h-4 w-4" />
              </button>

              <div className="flex-1">
                <p className="text-sm font-medium">{question.text}</p>
                <p className="text-xs text-muted-foreground">
                  Type: {question.type}
                  {question.is_required && ' • Required'}
                </p>
              </div>

              <div className="flex items-center gap-1">
                {index > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveQuestion(index, index - 1)}
                  >
                    ↑
                  </Button>
                )}
                {index < questions.length - 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveQuestion(index, index + 1)}
                  >
                    ↓
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditQuestion(question)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveQuestion(question.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {questions.length < 5 && (
        <Button onClick={handleAddQuestion} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingQuestion?.id.startsWith('q') && questions.find(q => q.id === editingQuestion.id)
                ? 'Edit Question'
                : 'Add Question'}
            </DialogTitle>
            <DialogDescription>
              Configure your custom question
            </DialogDescription>
          </DialogHeader>

          {editingQuestion && (
            <div className="space-y-4">
              <div>
                <Label>Question Text</Label>
                <Textarea
                  value={editingQuestion.text}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, text: e.target.value })
                  }
                  placeholder="Enter your question..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Question Type</Label>
                <Select
                  value={editingQuestion.type}
                  onValueChange={(value: any) =>
                    setEditingQuestion({ ...editingQuestion, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Short Text</SelectItem>
                    <SelectItem value="textarea">Long Text</SelectItem>
                    <SelectItem value="rating">Rating (1-5 stars)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Required Question</Label>
                <Switch
                  checked={editingQuestion.is_required}
                  onCheckedChange={(checked) =>
                    setEditingQuestion({ ...editingQuestion, is_required: checked })
                  }
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveQuestion}>Save Question</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
