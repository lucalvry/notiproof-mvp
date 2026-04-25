import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, Loader2, Star, Trash2, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ProofRow = Database["public"]["Tables"]["proof_objects"]["Row"];
type ProofStatus = Database["public"]["Enums"]["proof_status"];

export default function ProofDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentBusinessId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [proof, setProof] = useState<ProofRow | null>(null);

  useEffect(() => {
    if (!id || !currentBusinessId) return;
    setLoading(true);
    supabase.from("proof_objects").select("*").eq("id", id).eq("business_id", currentBusinessId).maybeSingle()
      .then(({ data, error }) => {
        if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
        setProof(data);
        setLoading(false);
      });
  }, [id, currentBusinessId, toast]);

  const setStatus = async (status: ProofStatus) => {
    if (!proof) return;
    setSaving(true);
    const { error } = await supabase.from("proof_objects").update({ status }).eq("id", proof.id);
    setSaving(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setProof({ ...proof, status });
    toast({ title: status === "approved" ? "Approved" : status });
  };

  const saveEdits = async () => {
    if (!proof) return;
    setSaving(true);
    const { error } = await supabase.from("proof_objects").update({
      author_name: proof.author_name,
      content: proof.content,
      rating: proof.rating,
      media_url: proof.media_url,
      verified: proof.verified,
    }).eq("id", proof.id);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Changes saved" });
  };

  const remove = async () => {
    if (!proof) return;
    const { error } = await supabase.from("proof_objects").delete().eq("id", proof.id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Proof deleted" });
    navigate("/proof");
  };

  if (loading) return <div className="space-y-4 max-w-3xl"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (!proof) return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild><Link to="/proof"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
      <Card><CardContent className="py-16 text-center text-muted-foreground">Proof not found.</CardContent></Card>
    </div>
  );

  const isApproved = proof.status === "approved";

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2"><Link to="/proof"><ArrowLeft className="h-4 w-4 mr-1" /> Back to library</Link></Button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">PROOF-02</div>
            <h1 className="text-3xl font-bold mt-1">Proof detail</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={isApproved ? "default" : "secondary"} className="capitalize">{proof.status}</Badge>
              <span className="text-sm text-muted-foreground capitalize">{proof.source ?? proof.type}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isApproved ? (
              <Button size="sm" onClick={() => setStatus("approved")} disabled={saving}><Check className="h-4 w-4 mr-1" /> Approve</Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setStatus("pending_review")} disabled={saving}><X className="h-4 w-4 mr-1" /> Unapprove</Button>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Edit content</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Author name</Label><Input value={proof.author_name ?? ""} onChange={(e) => setProof({ ...proof, author_name: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Verification</Label>
            <Select value={proof.verified ? "verified" : "unverified"} onValueChange={(v) => setProof({ ...proof, verified: v === "verified" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map((n) => (
                <button key={n} type="button" onClick={() => setProof({ ...proof, rating: n })} className="p-1">
                  <Star className={`h-5 w-5 ${n <= (proof.rating ?? 0) ? "fill-gold text-gold" : "text-muted-foreground"}`} />
                </button>
              ))}
              {proof.rating && <button type="button" onClick={() => setProof({ ...proof, rating: null })} className="ml-2 text-xs text-muted-foreground hover:text-foreground">clear</button>}
            </div>
          </div>
          <div className="space-y-2"><Label>Content</Label><Textarea rows={5} value={proof.content ?? ""} onChange={(e) => setProof({ ...proof, content: e.target.value })} /></div>
          <div className="space-y-2"><Label>Media URL</Label><Input type="url" value={proof.media_url ?? ""} onChange={(e) => setProof({ ...proof, media_url: e.target.value })} /></div>
          {proof.media_url && (
            <div className="rounded-md border bg-muted/30 p-2">
              <img src={proof.media_url} alt="media preview" className="max-h-48 rounded mx-auto" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete this proof?</AlertDialogTitle><AlertDialogDescription>This action can't be undone.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button onClick={saveEdits} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
