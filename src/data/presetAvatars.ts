// Preset avatars for form capture notifications
export interface AvatarPreset {
  id: string;
  type: 'emoji' | 'meme' | 'abstract';
  value: string;
  label: string;
  category?: string;
}

export const emojiAvatars: AvatarPreset[] = [
  { id: 'emoji-newsletter', type: 'emoji', value: '📧', label: 'Newsletter', category: 'Activity' },
  { id: 'emoji-celebration', type: 'emoji', value: '🎉', label: 'Celebration', category: 'Activity' },
  { id: 'emoji-calendar', type: 'emoji', value: '📅', label: 'Calendar', category: 'Activity' },
  { id: 'emoji-chat', type: 'emoji', value: '💬', label: 'Chat', category: 'Activity' },
  { id: 'emoji-clipboard', type: 'emoji', value: '📋', label: 'Clipboard', category: 'Activity' },
  { id: 'emoji-cart', type: 'emoji', value: '🛒', label: 'Cart', category: 'Activity' },
  { id: 'emoji-check', type: 'emoji', value: '✅', label: 'Checkmark', category: 'Activity' },
  { id: 'emoji-fire', type: 'emoji', value: '🔥', label: 'Fire', category: 'Trending' },
  { id: 'emoji-rocket', type: 'emoji', value: '🚀', label: 'Rocket', category: 'Trending' },
  { id: 'emoji-star', type: 'emoji', value: '⭐', label: 'Star', category: 'Trending' },
  { id: 'emoji-sparkles', type: 'emoji', value: '✨', label: 'Sparkles', category: 'Trending' },
  { id: 'emoji-trophy', type: 'emoji', value: '🏆', label: 'Trophy', category: 'Trending' },
  { id: 'emoji-wave', type: 'emoji', value: '👋', label: 'Wave', category: 'People' },
  { id: 'emoji-thumbsup', type: 'emoji', value: '👍', label: 'Thumbs Up', category: 'People' },
  { id: 'emoji-clap', type: 'emoji', value: '👏', label: 'Clapping', category: 'People' },
  { id: 'emoji-heart', type: 'emoji', value: '❤️', label: 'Heart', category: 'People' },
  { id: 'emoji-smile', type: 'emoji', value: '😊', label: 'Smile', category: 'People' },
  { id: 'emoji-sunglasses', type: 'emoji', value: '😎', label: 'Cool', category: 'People' },
];

export const memeAvatars: AvatarPreset[] = [
  // These would be URLs to hosted meme images - using placeholder emojis for now
  // In production, replace with actual image URLs from Supabase storage
  { id: 'meme-excited', type: 'meme', value: '🤩', label: 'Excited', category: 'Reactions' },
  { id: 'meme-mindblown', type: 'meme', value: '🤯', label: 'Mind Blown', category: 'Reactions' },
  { id: 'meme-success', type: 'meme', value: '💪', label: 'Success', category: 'Reactions' },
  { id: 'meme-wow', type: 'meme', value: '😲', label: 'Wow', category: 'Reactions' },
  { id: 'meme-party', type: 'meme', value: '🥳', label: 'Party', category: 'Reactions' },
  { id: 'meme-money', type: 'meme', value: '🤑', label: 'Money', category: 'Reactions' },
];

export const abstractAvatars: AvatarPreset[] = [
  { id: 'abstract-blue', type: 'abstract', value: '🔵', label: 'Blue Circle', category: 'Shapes' },
  { id: 'abstract-green', type: 'abstract', value: '🟢', label: 'Green Circle', category: 'Shapes' },
  { id: 'abstract-purple', type: 'abstract', value: '🟣', label: 'Purple Circle', category: 'Shapes' },
  { id: 'abstract-orange', type: 'abstract', value: '🟠', label: 'Orange Circle', category: 'Shapes' },
  { id: 'abstract-red', type: 'abstract', value: '🔴', label: 'Red Circle', category: 'Shapes' },
  { id: 'abstract-diamond', type: 'abstract', value: '💎', label: 'Diamond', category: 'Shapes' },
];

export const allPresetAvatars = [...emojiAvatars, ...memeAvatars, ...abstractAvatars];

// Form type to recommended avatar mapping
export const formTypeAvatarDefaults: Record<string, string> = {
  newsletter: '📧',
  registration: '🎉',
  book_demo: '📅',
  contact: '💬',
  rfp: '📋',
  checkout: '🛒',
  custom: '✅',
};

// Form types with their default configurations
export interface FormTypeConfig {
  id: string;
  label: string;
  icon: string;
  defaultAvatar: string;
  defaultMessage: string;
  suggestedFields: string[];
}

export const formTypes: FormTypeConfig[] = [
  {
    id: 'newsletter',
    label: 'Newsletter Signup',
    icon: '📧',
    defaultAvatar: '📧',
    defaultMessage: '{{name}} just subscribed to our newsletter! 📧',
    suggestedFields: ['name', 'email'],
  },
  {
    id: 'registration',
    label: 'Registration / Signup',
    icon: '🎉',
    defaultAvatar: '🎉',
    defaultMessage: '{{name}} from {{location}} just signed up! 🎉',
    suggestedFields: ['name', 'email', 'location'],
  },
  {
    id: 'book_demo',
    label: 'Book Demo',
    icon: '📅',
    defaultAvatar: '📅',
    defaultMessage: '{{name}} from {{company}} just booked a demo! 📅',
    suggestedFields: ['name', 'email', 'company'],
  },
  {
    id: 'contact',
    label: 'Contact Form',
    icon: '💬',
    defaultAvatar: '💬',
    defaultMessage: '{{name}} just reached out to us 💬',
    suggestedFields: ['name', 'email', 'message'],
  },
  {
    id: 'rfp',
    label: 'Request Proposal',
    icon: '📋',
    defaultAvatar: '📋',
    defaultMessage: '{{name}} from {{company}} requested a proposal! 📋',
    suggestedFields: ['name', 'email', 'company'],
  },
  {
    id: 'checkout',
    label: 'Checkout / Order',
    icon: '🛒',
    defaultAvatar: '🛒',
    defaultMessage: '{{name}} from {{location}} just placed an order! 🛒',
    suggestedFields: ['name', 'location', 'product'],
  },
  {
    id: 'custom',
    label: 'Custom Form',
    icon: '✨',
    defaultAvatar: '✅',
    defaultMessage: '{{name}} just submitted a form ✅',
    suggestedFields: ['name', 'email'],
  },
];
