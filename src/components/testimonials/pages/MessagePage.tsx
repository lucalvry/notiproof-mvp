import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ChevronRight, X, Image as ImageIcon, Video as VideoIcon, Camera } from 'lucide-react';
import { toast } from 'sonner';

interface MessagePageProps {
  message: string;
  onChange: (message: string) => void;
  avatarFile: File | null;
  videoFile: File | null;
  avatarPreview: string | null;
  videoPreview: string | null;
  onAvatarChange: (file: File | null, preview: string | null) => void;
  onVideoChange: (file: File | null, preview: string | null) => void;
  onNext: () => void;
  onBack: () => void;
}

export function MessagePage({
  message,
  onChange,
  avatarFile,
  videoFile,
  avatarPreview,
  videoPreview,
  onAvatarChange,
  onVideoChange,
  onNext,
  onBack,
}: MessagePageProps) {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Avatar must be less than 2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        onAvatarChange(file, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const file = new File([blob], 'recorded-video.webm', { type: 'video/webm' });
        const preview = URL.createObjectURL(blob);
        onVideoChange(file, preview);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (error) {
      toast.error('Failed to access camera. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
      setMediaRecorder(null);
    }
  };

  const handleNext = () => {
    if (message.trim().length < 10) {
      toast.error('Please write at least 10 characters');
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6 py-8">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold">Tell us about your experience</h3>
        <p className="text-muted-foreground">
          Share your thoughts, feedback, or story
        </p>
      </div>

      <div className="space-y-2">
        <Label>Your testimonial *</Label>
        <Textarea
          value={message}
          onChange={(e) => onChange(e.target.value)}
          placeholder="What did you love? What stood out to you? How has this helped you?"
          className="min-h-[150px]"
        />
        <p className="text-xs text-muted-foreground">
          Minimum 10 characters • {message.length} characters
        </p>
      </div>

      <div className="space-y-4 border-t pt-6">
        {/* Avatar Upload - Recommended */}
        <div className="space-y-2">
          <Label htmlFor="avatar-upload" className="text-sm flex items-center gap-2">
            Your Photo (appears with your testimonial)
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">⭐ Recommended</span>
          </Label>
          <p className="text-xs text-muted-foreground">Upload a photo of yourself to add credibility • Max 2MB</p>
          {!avatarPreview ? (
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <label htmlFor="avatar-upload" className="cursor-pointer">
                <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload your avatar
                </p>
              </label>
            </div>
          ) : (
            <div className="relative flex justify-center">
              <div className="relative">
                <img 
                  src={avatarPreview} 
                  alt="Avatar" 
                  className="w-32 h-32 object-cover rounded-full border-4 border-border" 
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                  onClick={() => onAvatarChange(null, null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Video Recording - Optional */}
        <div className="space-y-2">
          <Label className="text-sm">Record Video Testimonial (Optional)</Label>
          <p className="text-xs text-muted-foreground">Share your experience on video</p>
          {!videoPreview ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={recording ? stopRecording : startRecording}
            >
              <Camera className="h-4 w-4 mr-2" />
              {recording ? 'Stop Recording' : 'Record Video'}
            </Button>
          ) : (
            <div className="relative">
              <video src={videoPreview} controls className="w-full rounded-lg bg-black" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => onVideoChange(null, null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={handleNext} 
          disabled={message.trim().length < 10}
        >
          Next
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
