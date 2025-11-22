import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';

interface TestimonialCSVUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (recipients: Array<{ email: string; name?: string; company?: string }>) => void;
}

interface CSVRow {
  email: string;
  name?: string;
  company?: string;
  [key: string]: any;
}

export function TestimonialCSVUpload({ open, onOpenChange, onUpload }: TestimonialCSVUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVRow[]>([]);
  const [error, setError] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx')) {
      setError('Please select a CSV or XLSX file');
      return;
    }

    setFile(selectedFile);
    setError('');

    // Parse CSV for preview
    Papa.parse(selectedFile, {
      header: true,
      preview: 5,
      complete: (results) => {
        const rows = results.data as CSVRow[];
        const validRows = rows.filter((row) => row.email || row.Email);

        if (validRows.length === 0) {
          setError('No valid email addresses found');
          return;
        }

        setPreview(validRows);
      },
      error: (err) => {
        setError(`Failed to parse file: ${err.message}`);
      },
    });
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      // Parse full CSV
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const rows = results.data as CSVRow[];
          const recipients = rows
            .filter((row) => row.email || row.Email)
            .map((row) => ({
              email: (row.email || row.Email || '').trim(),
              name: (row.name || row.Name || '').trim(),
              company: (row.company || row.Company || '').trim(),
            }))
            .filter((r) => r.email); // Filter out invalid emails

          if (recipients.length === 0) {
            setError('No valid email addresses found in file');
            return;
          }

          onUpload(recipients);
          toast.success(`Prepared ${recipients.length} recipients for invitation`);
          onOpenChange(false);
          setFile(null);
          setPreview([]);
        },
        error: (err) => {
          setError(`Failed to parse file: ${err.message}`);
        },
      });
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process file');
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        email: 'john@example.com',
        name: 'John Doe',
        company: 'Acme Corp',
      },
      {
        email: 'sarah@example.com',
        name: 'Sarah Smith',
        company: 'Tech Inc',
      },
      {
        email: 'mike@example.com',
        name: 'Mike Johnson',
        company: '',
      },
    ];

    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'testimonial-invites-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Import Recipients
          </DialogTitle>
          <DialogDescription>Upload a CSV file with customer emails to send invitations</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>
                  <strong>Required column:</strong> email
                </p>
                <p>
                  <strong>Optional columns:</strong> name, company
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Download Template</Label>
            <Button variant="outline" className="w-full" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-file">Upload CSV File</Label>
            <Input id="csv-file" type="file" accept=".csv,.xlsx" onChange={handleFileChange} />
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
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">{row.email || row.Email}</p>
                        {((row.name || row.Name) || (row.company || row.Company)) && (
                          <p className="text-xs text-muted-foreground">
                            {(row.name || row.Name) && `👤 ${row.name || row.Name}`}
                            {(row.name || row.Name) && (row.company || row.Company) && ' • '}
                            {(row.company || row.Company) && `🏢 ${row.company || row.Company}`}
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
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleUpload} disabled={!file}>
              <Upload className="h-4 w-4 mr-2" />
              Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
