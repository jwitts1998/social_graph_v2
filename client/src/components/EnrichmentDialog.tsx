import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { deepResearchContact, researchContact } from "@/lib/edgeFunctions";
import type { DeepResearchResult } from "@/lib/edgeFunctions";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Globe, Search, FileSearch, Link2 } from "lucide-react";

interface EnrichmentDialogProps {
  contactId: string;
  contactName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: 'hunter' | 'pdl' | 'auto';
}

export default function EnrichmentDialog({
  contactId,
  contactName,
  open,
  onOpenChange,
  provider = 'auto',
}: EnrichmentDialogProps) {
  console.log('[EnrichmentDialog] Rendering - open:', open, 'contactName:', contactName);
  
  const [result, setResult] = useState<DeepResearchResult | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Trigger enrichment when dialog opens
  useEffect(() => {
    if (open && !result && !isEnriching) {
      console.log('[EnrichmentDialog] Dialog opened via useEffect, triggering enrichment...');
      handleEnrich();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleEnrich = async () => {
    console.log('[EnrichmentDialog] Starting deep research for contact:', contactId, contactName);
    setIsEnriching(true);
    setError(null);
    try {
      console.log('[EnrichmentDialog] Calling deepResearchContact...');
      const data = await deepResearchContact(contactId);
      console.log('[EnrichmentDialog] Deep research complete:', data);
      setResult(data);
      
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', contactId] });
      
      if (data.updated && data.fields.length > 0) {
        toast({
          title: "Contact enriched!",
          description: `Updated ${data.fields.length} fields from ${data.deepResearch?.pagesScraped || 0} web pages`,
        });
      } else {
        toast({
          title: "Contact already up to date",
          description: "No new information found",
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to enrich contact');
      console.error('Enrichment error:', err);
      toast({
        title: "Enrichment failed",
        description: err.message || 'Failed to research contact',
        variant: "destructive",
      });
    } finally {
      setIsEnriching(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    console.log('[EnrichmentDialog] Dialog state change requested:', newOpen, 'for contact:', contactName);
    onOpenChange(newOpen);
    if (!newOpen) {
      console.log('[EnrichmentDialog] Clearing results...');
      setResult(null);
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-enrichment">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Enrich Contact: {contactName}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            AI deep research: crawling web pages for rich contact data
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isEnriching && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <FileSearch className="w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
              </div>
              <div className="text-center space-y-3">
                <p className="text-sm font-medium">Deep researching {contactName}...</p>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                    Searching across Google, LinkedIn, Crunchbase
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></span>
                    Crawling and scraping discovered web pages
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></span>
                    Extracting structured data with AI
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '450ms' }}></span>
                    Following leads and synthesizing profile
                  </p>
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  This may take 20-40 seconds (visiting up to 12 pages)...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/10">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Research Failed</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          )}

          {result && !isEnriching && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium">
                    {result.updated ? 'Contact updated!' : 'Contact already up to date'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <FileSearch className="w-3 h-3" />
                    Deep Research
                  </Badge>
                  {result.bioFound && (
                    <Badge variant="secondary" className="text-xs">
                      Bio found
                    </Badge>
                  )}
                  {result.thesisFound && (
                    <Badge variant="secondary" className="text-xs">
                      Thesis found
                    </Badge>
                  )}
                </div>
              </div>

              {result.deepResearch && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {result.deepResearch.pagesScraped} pages crawled
                  </span>
                  <span className="flex items-center gap-1">
                    <Search className="w-3 h-3" />
                    {result.deepResearch.searchCalls} searches
                  </span>
                  <span className="flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    {result.deepResearch.iterations} iterations
                  </span>
                </div>
              )}

              <Separator />

              {result.updated && result.fields.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Updated Fields ({result.fields.length})</p>
                  <div className="space-y-2">
                    {result.fields.map((field: string) => (
                      <div key={field} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="capitalize">{field.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <p className="text-xs font-medium">Research summary</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {result.bioFound && (
                        <li>Professional bio extracted from web pages</li>
                      )}
                      {result.thesisFound && (
                        <li>Investment thesis and preferences found</li>
                      )}
                      {result.fields.includes('education') && (
                        <li>Education history discovered</li>
                      )}
                      {result.fields.includes('career_history') && (
                        <li>Career history extracted</li>
                      )}
                      {result.fields.includes('expertise_areas') && (
                        <li>Expertise areas identified</li>
                      )}
                      {result.fields.includes('personal_interests') && (
                        <li>Personal interests found</li>
                      )}
                      {result.fields.includes('portfolio_companies') && (
                        <li>Portfolio companies discovered</li>
                      )}
                    </ul>
                    {result.completenessScore !== undefined && (
                      <p className="text-xs text-muted-foreground pt-1">
                        Profile completeness: {result.completenessScore}%
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No new information found.</p>
                  <p className="text-xs mt-2">
                    The contact profile is already complete or public data is limited.
                  </p>
                  {result.deepResearch && result.deepResearch.pagesScraped > 0 && (
                    <p className="text-xs mt-1">
                      Searched {result.deepResearch.pagesScraped} pages across {result.deepResearch.iterations} research iterations.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => handleOpenChange(false)}
            data-testid="button-close-enrichment"
          >
            {result?.updated ? 'Done' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
