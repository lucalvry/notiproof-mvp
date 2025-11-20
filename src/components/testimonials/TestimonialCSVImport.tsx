import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface TestimonialCSVImportProps {
  websiteId: string;
  onSuccess?: () => void;
}

interface CSVRow {
  author_name: string;
  author_email?: string;
  rating: string | number;
  message: string;
  author_company?: string;
  author_position?: string;
}

export function TestimonialCSVImport({ websiteId, onSuccess }: TestimonialCSVImportProps) {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null);

  function downloadTemplate() {
    const template = `author_name,author_email,rating,message,author_company,author_position
John Doe,john@example.com,5,"Great product! Highly recommend.",Tech Corp,CEO
Jane Smith,jane@example.com,4,"Very satisfied with the service.",Design Co,Designer`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'testimonials_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setResults(null);

    try {
      Papa.parse<CSVRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const errors: string[] = [];
          let successCount = 0;

          for (let i = 0; i < results.data.length; i++) {
            const row = results.data[i];
            const rowNum = i + 2; // +2 for header and 0-indexed

            // Validate required fields
            if (!row.author_name || !row.message || !row.rating) {
              errors.push(`Row ${rowNum}: Missing required fields (author_name, message, rating)`);
              continue;
            }

            const rating = parseInt(String(row.rating));
            if (isNaN(rating) || rating < 1 || rating > 5) {
              errors.push(`Row ${rowNum}: Invalid rating (must be 1-5)`);
              continue;
            }

            try {
              const { error } = await supabase.from('testimonials').insert({
                website_id: websiteId,
                source: 'import',
                author_name: row.author_name,
                author_email: row.author_email || null,
                rating,
                message: row.message,
                metadata: {
                  company: row.author_company,
                  position: row.author_position,
                },
                status: 'pending',
              });

              if (error) throw error;
              successCount++;
            } catch (error) {
              errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Failed to import'}`);
            }
          }

          setResults({ success: successCount, errors });
          if (successCount > 0) {
            toast.success(`Imported ${successCount} testimonial(s)`);
            onSuccess?.();
          }
          if (errors.length > 0) {
            toast.error(`${errors.length} error(s) occurred`);
          }
          setUploading(false);
        },
        error: (error) => {
          toast.error(`CSV parsing failed: ${error.message}`);
          setUploading(false);
        },
      });
    } catch (error) {
      console.error('Error uploading CSV:', error);
      toast.error('Failed to process CSV file');
      setUploading(false);
    }

    // Reset input
    e.target.value = '';
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Import Testimonials from CSV</h3>
          <p className="text-sm text-muted-foreground">
            Upload a CSV file with testimonials. Download the template to see the required format.
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>

          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={uploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <Button disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload CSV
                </>
              )}
            </Button>
          </div>
        </div>

        {results && (
          <div className="space-y-2">
            {results.success > 0 && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Successfully imported {results.success} testimonial(s)
              </div>
            )}
            {results.errors.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {results.errors.length} error(s):
                </div>
                <div className="bg-destructive/10 rounded p-3 space-y-1 max-h-[200px] overflow-auto">
                  {results.errors.map((error, i) => (
                    <div key={i} className="text-xs text-destructive">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
