import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Papa from "papaparse";

interface CSVUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  websiteId: string;
  widgetId?: string;
  onSuccess: () => void;
}

interface CSVRow {
  message_template: string;
  user_name?: string;
  user_location?: string;
  event_type?: string;
  [key: string]: any;
}

export function CSVUploadDialog({
  open,
  onOpenChange,
  websiteId,
  widgetId,
  onSuccess,
}: CSVUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<CSVRow[]>([]);
  const [error, setError] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError("Please select a CSV file");
      return;
    }

    setFile(selectedFile);
    setError("");

    // Parse CSV for preview
    Papa.parse(selectedFile, {
      header: true,
      preview: 5,
      complete: (results) => {
        setPreview(results.data as CSVRow[]);
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
      },
    });
  };

  const handleUpload = async () => {
    if (!file || !websiteId) return;

    setUploading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get widget for this website
      let targetWidgetId = widgetId;
      if (!targetWidgetId) {
        const { data: widgets } = await supabase
          .from('widgets')
          .select('id')
          .eq('website_id', websiteId)
          .limit(1);

        if (!widgets || widgets.length === 0) {
          throw new Error("Please create a notification first before importing CSV data");
        }
        
        targetWidgetId = widgets[0].id;
      }

      // Parse full CSV
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          const rows = results.data as CSVRow[];
          const validRows = rows.filter(row => row.message_template && row.message_template.trim());

          if (validRows.length === 0) {
            setError("No valid rows found. Ensure 'message_template' column exists.");
            setUploading(false);
            return;
          }

          // Prepare events for bulk insert
          const events = validRows.map(row => ({
            widget_id: targetWidgetId,
            website_id: websiteId,
            event_type: row.event_type || 'manual_upload',
            event_data: { ...row, imported_from: 'csv' },
            message_template: row.message_template,
            user_name: row.user_name || null,
            user_location: row.user_location || null,
            source: 'manual' as const,
            moderation_status: 'approved' as const,
          }));

          // Insert in batches of 100
          const batchSize = 100;
          for (let i = 0; i < events.length; i += batchSize) {
            const batch = events.slice(i, i + batchSize);
            const { error: insertError } = await supabase
              .from('events')
              .insert(batch);

            if (insertError) {
              console.error('Batch insert error:', insertError);
              throw insertError;
            }
          }

          toast.success(`Successfully imported ${events.length} events!`);
          onSuccess();
          onOpenChange(false);
          setFile(null);
          setPreview([]);
        },
        error: (err) => {
          setError(`Failed to parse CSV: ${err.message}`);
          setUploading(false);
        },
      });
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload CSV");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        message_template: "John from New York just made a purchase",
        user_name: "John",
        user_location: "New York, USA",
        event_type: "purchase",
      },
      {
        message_template: "Sarah signed up for our newsletter",
        user_name: "Sarah",
        user_location: "London, UK",
        event_type: "signup",
      },
      {
        message_template: "Someone from Tokyo just viewed this product",
        user_name: "",
        user_location: "Tokyo, Japan",
        event_type: "view",
      },
    ];

    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notiproof-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Import via CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple notification events at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Required column:</strong> message_template</p>
                <p><strong>Optional columns:</strong> user_name, user_location, event_type</p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Download Template</Label>
            <Button
              variant="outline"
              className="w-full"
              onClick={downloadTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-file">Upload CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {preview.length > 0 && (
            <div className="space-y-2">
              <Label>Preview (First 5 rows)</Label>
              <div className="rounded-lg border p-3 bg-muted/50 max-h-64 overflow-auto">
                <div className="space-y-2">
                  {preview.map((row, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">{row.message_template}</p>
                        {(row.user_name || row.user_location) && (
                          <p className="text-xs text-muted-foreground">
                            {row.user_name && `👤 ${row.user_name}`}
                            {row.user_name && row.user_location && ' • '}
                            {row.user_location && `📍 ${row.user_location}`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-pulse" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Events
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
