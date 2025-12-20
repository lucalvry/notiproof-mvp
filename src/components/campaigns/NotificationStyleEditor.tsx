import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface NotificationStyleSettings {
  backgroundColor: string;
  textColor: string;
  primaryColor: string;
  borderRadius: number;
  shadow: string;
  fontSize: number;
  fontFamily: string;
}

interface NotificationStyleEditorProps {
  value: NotificationStyleSettings;
  onChange: (settings: NotificationStyleSettings) => void;
}

const FONT_FAMILIES = [
  { value: 'system', label: 'System Default' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Lato', label: 'Lato' },
];

const SHADOW_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra Large' },
];

export function NotificationStyleEditor({ value, onChange }: NotificationStyleEditorProps) {
  const updateSetting = <K extends keyof NotificationStyleSettings>(
    key: K,
    newValue: NotificationStyleSettings[K]
  ) => {
    onChange({ ...value, [key]: newValue });
  };

  return (
    <div className="space-y-6">
      {/* Colors Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-foreground">Colors</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="backgroundColor" className="text-xs text-muted-foreground">
              Background
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="backgroundColor"
                value={value.backgroundColor}
                onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                className="w-8 h-8 rounded border border-border cursor-pointer"
              />
              <span className="text-xs text-muted-foreground font-mono">
                {value.backgroundColor}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="textColor" className="text-xs text-muted-foreground">
              Text Color
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="textColor"
                value={value.textColor}
                onChange={(e) => updateSetting('textColor', e.target.value)}
                className="w-8 h-8 rounded border border-border cursor-pointer"
              />
              <span className="text-xs text-muted-foreground font-mono">
                {value.textColor}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="primaryColor" className="text-xs text-muted-foreground">
              Accent Color
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="primaryColor"
                value={value.primaryColor}
                onChange={(e) => updateSetting('primaryColor', e.target.value)}
                className="w-8 h-8 rounded border border-border cursor-pointer"
              />
              <span className="text-xs text-muted-foreground font-mono">
                {value.primaryColor}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Border Radius */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium">Border Radius</Label>
          <span className="text-xs text-muted-foreground">{value.borderRadius}px</span>
        </div>
        <Slider
          value={[value.borderRadius]}
          onValueChange={([val]) => updateSetting('borderRadius', val)}
          min={0}
          max={24}
          step={1}
          className="w-full"
        />
      </div>

      {/* Shadow */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Shadow</Label>
        <Select
          value={value.shadow}
          onValueChange={(val) => updateSetting('shadow', val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select shadow" />
          </SelectTrigger>
          <SelectContent>
            {SHADOW_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Size */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium">Font Size</Label>
          <span className="text-xs text-muted-foreground">{value.fontSize}px</span>
        </div>
        <Slider
          value={[value.fontSize]}
          onValueChange={([val]) => updateSetting('fontSize', val)}
          min={12}
          max={18}
          step={1}
          className="w-full"
        />
      </div>

      {/* Font Family */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Font Family</Label>
        <Select
          value={value.fontFamily}
          onValueChange={(val) => updateSetting('fontFamily', val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select font" />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Preview */}
      <div className="space-y-2 pt-4 border-t border-border">
        <Label className="text-sm font-medium">Preview</Label>
        <div
          className="p-4 transition-all"
          style={{
            backgroundColor: value.backgroundColor,
            color: value.textColor,
            borderRadius: `${value.borderRadius}px`,
            fontSize: `${value.fontSize}px`,
            fontFamily: value.fontFamily === 'system' 
              ? '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' 
              : value.fontFamily,
            boxShadow: value.shadow === 'none' ? 'none' 
              : value.shadow === 'sm' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              : value.shadow === 'md' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              : value.shadow === 'lg' ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              : '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ backgroundColor: `${value.primaryColor}20` }}
            >
              📧
            </div>
            <div>
              <p className="font-medium">John just signed up!</p>
              <p className="text-sm opacity-70">2 minutes ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
