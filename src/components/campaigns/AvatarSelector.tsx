import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { emojiAvatars, memeAvatars, abstractAvatars, type AvatarPreset } from '@/data/presetAvatars';

interface AvatarSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function AvatarSelector({ value, onChange, className }: AvatarSelectorProps) {
  const [activeTab, setActiveTab] = useState<string>('emoji');
  const [customUrl, setCustomUrl] = useState('');

  const handleAvatarSelect = (avatar: AvatarPreset) => {
    onChange(avatar.value);
  };

  const handleCustomUrlChange = (url: string) => {
    setCustomUrl(url);
    if (url) {
      onChange(url);
    }
  };

  const renderAvatarGrid = (avatars: AvatarPreset[]) => {
    // Group avatars by category
    const grouped = avatars.reduce((acc, avatar) => {
      const category = avatar.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(avatar);
      return acc;
    }, {} as Record<string, AvatarPreset[]>);

    return (
      <div className="space-y-4">
        {Object.entries(grouped).map(([category, categoryAvatars]) => (
          <div key={category}>
            <p className="text-xs text-muted-foreground mb-2">{category}</p>
            <div className="grid grid-cols-6 gap-2">
              {categoryAvatars.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => handleAvatarSelect(avatar)}
                  className={cn(
                    'flex items-center justify-center w-12 h-12 rounded-lg border-2 transition-all hover:scale-110',
                    value === avatar.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 bg-card'
                  )}
                  title={avatar.label}
                >
                  <span className="text-2xl">{avatar.value}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      <Label className="text-sm font-medium">Choose Avatar</Label>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="emoji">Emoji</TabsTrigger>
          <TabsTrigger value="meme">Fun</TabsTrigger>
          <TabsTrigger value="abstract">Abstract</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>

        <TabsContent value="emoji" className="mt-4">
          {renderAvatarGrid(emojiAvatars)}
        </TabsContent>

        <TabsContent value="meme" className="mt-4">
          {renderAvatarGrid(memeAvatars)}
        </TabsContent>

        <TabsContent value="abstract" className="mt-4">
          {renderAvatarGrid(abstractAvatars)}
        </TabsContent>

        <TabsContent value="custom" className="mt-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="custom-url" className="text-xs text-muted-foreground">
                Image URL
              </Label>
              <Input
                id="custom-url"
                type="url"
                placeholder="https://example.com/avatar.png"
                value={customUrl}
                onChange={(e) => handleCustomUrlChange(e.target.value)}
                className="mt-1"
              />
            </div>
            
            {customUrl && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <img 
                  src={customUrl} 
                  alt="Custom avatar preview" 
                  className="w-12 h-12 rounded-lg object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect fill="%23ccc" width="48" height="48"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23666">?</text></svg>';
                  }}
                />
                <span className="text-sm text-muted-foreground">Preview</span>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Current selection preview */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-background border">
          {value.startsWith('http') ? (
            <img src={value} alt="Selected avatar" className="w-8 h-8 rounded object-cover" />
          ) : (
            <span className="text-xl">{value}</span>
          )}
        </div>
        <div className="text-sm">
          <p className="font-medium">Selected Avatar</p>
          <p className="text-muted-foreground text-xs truncate max-w-[200px]">
            {value.startsWith('http') ? value : `Emoji: ${value}`}
          </p>
        </div>
      </div>
    </div>
  );
}
