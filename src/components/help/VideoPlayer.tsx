import { useState } from 'react';
import { Play, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoPlayerProps {
  url: string;
  type: 'youtube' | 'vimeo' | 'direct';
  title: string;
}

export const VideoPlayer = ({ url, type, title }: VideoPlayerProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  const getEmbedUrl = () => {
    switch (type) {
      case 'youtube':
        // Extract video ID from YouTube URL
        const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
        const youtubeId = youtubeMatch ? youtubeMatch[1] : '';
        return `https://www.youtube.com/embed/${youtubeId}?autoplay=0&rel=0`;
      
      case 'vimeo':
        // Extract video ID from Vimeo URL
        const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
        const vimeoId = vimeoMatch ? vimeoMatch[1] : '';
        return `https://player.vimeo.com/video/${vimeoId}`;
      
      case 'direct':
        return url;
      
      default:
        return url;
    }
  };

  const getThumbnailUrl = () => {
    switch (type) {
      case 'youtube':
        const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
        const youtubeId = youtubeMatch ? youtubeMatch[1] : '';
        return `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
      
      case 'vimeo':
        // For Vimeo, we'll use a generic thumbnail
        return null;
      
      case 'direct':
        return null;
      
      default:
        return null;
    }
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const thumbnailUrl = getThumbnailUrl();

  if (!isLoaded && thumbnailUrl) {
    return (
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <Button
            variant="secondary"
            size="lg"
            onClick={handleLoad}
            className="gap-2 bg-white/90 hover:bg-white text-black"
          >
            <Play className="h-5 w-5" />
            Play Video
          </Button>
        </div>
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="bg-black/50 text-white hover:bg-black/70"
          >
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
      {type === 'direct' ? (
        <video
          src={url}
          controls
          className="w-full h-full"
          title={title}
        >
          Your browser does not support the video tag.
        </video>
      ) : (
        <iframe
          src={getEmbedUrl()}
          title={title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
      
      <div className="absolute top-4 right-4">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="bg-black/50 text-white hover:bg-black/70"
        >
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
};