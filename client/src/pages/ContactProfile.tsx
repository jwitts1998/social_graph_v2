import { useRoute, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import RoleTag from "@/components/RoleTag";
import {
  ArrowLeft,
  Mail,
  Linkedin,
  MapPin,
  Building2,
  Sparkles,
  Pencil,
  MessageSquare,
  Lightbulb,
  Target,
  GraduationCap,
  Briefcase,
  Heart,
  ExternalLink,
  Users,
  Calendar,
  Mic,
  Loader2,
  Share2,
} from "lucide-react";
import { useContactProfileData } from "@/hooks/useContacts";
import { format } from "date-fns";
import { useCallback, useEffect, useRef, useState } from "react";
import ContactDialog from "@/components/ContactDialog";
import EnrichmentDialog from "@/components/EnrichmentDialog";
import { formatCheckSizeRange } from "@/lib/currencyFormat";
import { enrichContactSocial, embedContact, researchContact } from "@/lib/edgeFunctions";
import { useToast } from "@/hooks/use-toast";

// Auto-detect contact types from title (aligned with ContactCard)
function detectContactTypesFromTitle(
  title: string | null | undefined
): ("LP" | "GP" | "Angel" | "FamilyOffice" | "Startup" | "PE" | "Other")[] {
  if (!title) return [];
  const t = title.toLowerCase();
  const out: ("LP" | "GP" | "Angel" | "FamilyOffice" | "Startup" | "PE" | "Other")[] = [];
  const rules: { keywords: string[]; type: "LP" | "GP" | "Angel" | "FamilyOffice" | "Startup" | "PE" | "Other" }[] = [
    { keywords: ["general partner", " gp", "gp "], type: "GP" },
    { keywords: ["limited partner", " lp", "lp "], type: "LP" },
    { keywords: ["angel investor", "angel"], type: "Angel" },
    { keywords: ["family office"], type: "FamilyOffice" },
    { keywords: ["startup", "founder", " ceo", "ceo ", " cto", "cto ", "cofounder", "co-founder"], type: "Startup" },
    { keywords: ["private equity", " pe", "pe "], type: "PE" },
  ];
  for (const { keywords, type } of rules) {
    if (keywords.some((k) => t.includes(k))) out.push(type);
  }
  return out;
}

function relationshipLabel(strength: number | null | undefined): string {
  if (strength == null) return "";
  if (strength >= 75) return "Strong";
  if (strength >= 50) return "Medium";
  if (strength >= 25) return "Light";
  return "New";
}

export default function ContactProfile() {
  const [, params] = useRoute("/contacts/:id");
  const [, setLocation] = useLocation();
  const contactId = params?.id ?? "";
  const [editOpen, setEditOpen] = useState(false);
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [socialEnriching, setSocialEnriching] = useState(false);
  const [embedding, setEmbedding] = useState(false);
  const { toast } = useToast();

  const { contact, thesis, suggestedIn, participantIn } = useContactProfileData(contactId);
  const c = contact.data;
  const matches = suggestedIn.data ?? [];
  const conversations = participantIn.data ?? [];

  // Background re-enrichment: if contact data is stale (>3 months), refresh silently
  const reenrichTriggered = useRef(false);
  useEffect(() => {
    if (!c || reenrichTriggered.current) return;
    const lastEnriched = c.lastEnrichedAt ? new Date(c.lastEnrichedAt).getTime() : 0;
    const threeMonthsAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    const isStale = lastEnriched < threeMonthsAgo;
    const hasName = !!c.name;

    if (isStale && hasName) {
      reenrichTriggered.current = true;
      console.log('[ContactProfile] Data stale, triggering background re-enrichment for', c.name);
      researchContact(contactId)
        .then(() => { contact.refetch(); })
        .catch((err) => { console.log('[ContactProfile] Background re-enrichment failed:', err.message); });
    }
  }, [c, contactId, contact]);

  const displayTypes =
    (c?.contactType && c.contactType.length > 0 ? c.contactType : detectContactTypesFromTitle(c?.title ?? undefined)) as (
      | "LP"
      | "GP"
      | "Angel"
      | "FamilyOffice"
      | "Startup"
      | "PE"
      | "Other"
    )[];

  const handleEdit = useCallback(() => {
    setEditOpen(true);
  }, []);
  const handleEnrich = useCallback(() => {
    setEnrichOpen(true);
  }, []);
  const handleEnrichSocial = useCallback(async () => {
    if (!contactId || socialEnriching) return;
    setSocialEnriching(true);
    try {
      await enrichContactSocial(contactId);
      toast({ title: "Social enrichment complete", description: "Personal interests and social data updated." });
      contact.refetch();
    } catch (err: any) {
      toast({ title: "Social enrichment failed", description: err.message || "Could not enrich social data.", variant: "destructive" });
    } finally {
      setSocialEnriching(false);
    }
  }, [contactId, socialEnriching, contact, toast]);
  const handleEmbed = useCallback(async () => {
    if (!contactId || embedding) return;
    setEmbedding(true);
    try {
      const result = await embedContact(contactId);
      toast({
        title: "Embedding generated",
        description: `Bio embedding ${result?.hasBioEmbedding ? "created" : "skipped"}, thesis embedding ${result?.hasThesisEmbedding ? "created" : "skipped"}.`,
      });
    } catch (err: any) {
      toast({ title: "Embedding failed", description: err.message || "Could not generate embedding.", variant: "destructive" });
    } finally {
      setEmbedding(false);
    }
  }, [contactId, embedding, toast]);
  const handleStartConversation = useCallback(() => {
    if (!c) return;
    try {
      sessionStorage.setItem(
        "recordingFromContact",
        JSON.stringify({ contactName: c.name, contactId: c.id })
      );
    } catch (_) {}
    setLocation("/");
  }, [c]);

  if (!contactId) {
    return (
      <div className="p-4 md:p-8">
        <Link href="/contacts" className="inline-flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent rounded-md">
          <ArrowLeft className="w-4 h-4" />
          Contacts
        </Link>
        <p className="text-muted-foreground mt-4">No contact selected.</p>
      </div>
    );
  }

  if (contact.isLoading || contact.isError) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-40 w-full mb-6" />
        <Skeleton className="h-24 w-full mb-6" />
        <div className="flex gap-4">
          <Skeleton className="h-32 flex-1" />
          <Skeleton className="h-32 flex-1" />
        </div>
      </div>
    );
  }

  if (!c) {
    return (
      <div className="p-4 md:p-8">
        <Link href="/contacts" className="inline-flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent rounded-md">
          <ArrowLeft className="w-4 h-4" />
          Contacts
        </Link>
        <p className="text-muted-foreground mt-4">Contact not found.</p>
      </div>
    );
  }

  const lastSuggested = matches[0];
  const suggestedCount = matches.length;
  const participantCount = conversations.length;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-16">
      <div className="mb-6">
        <Link
          href="/contacts"
          className="inline-flex items-center gap-2 px-2 py-1.5 -ml-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Contacts
        </Link>
      </div>

      {/* Hero */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {displayTypes.map((type) => (
                <RoleTag key={type} type={type} />
              ))}
              {c.dataCompletenessScore != null && (
                <Badge
                  variant={c.dataCompletenessScore >= 70 ? "default" : c.dataCompletenessScore >= 40 ? "secondary" : "outline"}
                  className="text-xs"
                >
                  {c.dataCompletenessScore}% complete
                </Badge>
              )}
              {c.relationshipStrength != null && (
                <span className="text-xs text-muted-foreground">
                  {relationshipLabel(c.relationshipStrength)}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold">{c.name}</h1>
            {(c.title || c.company) && (
              <p className="text-muted-foreground mt-1">
                {[c.title, c.company].filter(Boolean).join(" at ")}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={handleStartConversation}
              title="Start a conversation recording with this contact"
              data-testid="button-start-conversation"
            >
              <Mic className="w-4 h-4 mr-2" />
              Start conversation
            </Button>
            {c.email && (
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${c.email}`}>
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </a>
              </Button>
            )}
            {c.linkedinUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="w-4 h-4 mr-2" />
                  LinkedIn
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleEnrich} title="Enrich contact data">
              <Sparkles className="w-4 h-4 mr-2" />
              Enrich
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnrichSocial}
              disabled={socialEnriching}
              title="Enrich social media data (Twitter, Instagram)"
              data-testid="button-enrich-social"
            >
              {socialEnriching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
              {socialEnriching ? "Enriching..." : "Social"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEmbed}
              disabled={embedding}
              title="Generate AI embedding for semantic matching"
            >
              {embedding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lightbulb className="w-4 h-4 mr-2" />}
              {embedding ? "Embedding..." : "Embed"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleEdit} title="Edit contact">
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
      </Card>

      {/* Smart insights */}
      <Card className="p-4 mb-6">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          Insights
        </h2>
        <ul className="space-y-2 text-sm">
          {suggestedCount > 0 && (
            <li className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span>
                Suggested in <strong>{suggestedCount}</strong> conversation{suggestedCount !== 1 ? "s" : ""}
              </span>
            </li>
          )}
          {participantCount > 0 && (
            <li className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span>
                In <strong>{participantCount}</strong> recorded conversation{participantCount !== 1 ? "s" : ""}
              </span>
            </li>
          )}
          {lastSuggested && (
            <li className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span>
                Last suggested for:{" "}
                <Link href={`/conversation/${lastSuggested.conversationId}`}>
                  <span className="text-primary hover:underline cursor-pointer">
                    {lastSuggested.conversationTitle || "Conversation"}
                  </span>
                </Link>
                {lastSuggested.recordedAt && (
                  <span className="text-muted-foreground ml-1">
                    ({format(new Date(lastSuggested.recordedAt), "MMM d, yyyy")})
                  </span>
                )}
              </span>
            </li>
          )}
          {suggestedCount === 0 && participantCount === 0 && (
            <li className="text-muted-foreground">No conversation context yet.</li>
          )}
        </ul>
      </Card>

      {/* At a glance */}
      <Card className="p-4 mb-6">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          At a glance
        </h2>
        <div className="grid gap-3 text-sm">
          {c.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span>{c.location}</span>
            </div>
          )}
          {c.companyUrl && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <a
                href={c.companyUrl.startsWith("http") ? c.companyUrl : `https://${c.companyUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                {c.companyUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          {thesis.data &&
            (thesis.data.sectors?.length > 0 ||
              thesis.data.stages?.length > 0 ||
              thesis.data.geos?.length > 0 ||
              thesis.data.checkSizes?.length > 0) && (
              <div className="flex flex-wrap items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground mr-1">Focus:</span>
                {[
                  ...(thesis.data.sectors ?? []),
                  ...(thesis.data.stages ?? []),
                  ...(thesis.data.geos ?? []),
                  ...(thesis.data.checkSizes ?? []),
                ]
                  .slice(0, 8)
                  .map((x) => (
                    <Badge key={x} variant="secondary" className="text-xs font-normal">
                      {x}
                    </Badge>
                  ))}
              </div>
            )}
          {c.expertiseAreas && c.expertiseAreas.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Lightbulb className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              {c.expertiseAreas.slice(0, 5).map((a) => (
                <Badge key={a} variant="outline" className="text-xs font-normal">
                  {a}
                </Badge>
              ))}
            </div>
          )}
          {c.portfolioCompanies && c.portfolioCompanies.length > 0 && (
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span>
                <span className="text-muted-foreground">Portfolio: </span>
                {c.portfolioCompanies.slice(0, 6).join(", ")}
                {c.portfolioCompanies.length > 6 && ` +${c.portfolioCompanies.length - 6}`}
              </span>
            </div>
          )}
          {c.personalInterests && c.personalInterests.length > 0 && (
            <div className="flex items-start gap-2">
              <Heart className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span>
                <span className="text-muted-foreground">Interests: </span>
                {c.personalInterests.slice(0, 4).join(", ")}
              </span>
            </div>
          )}
          {c.isInvestor && (c.checkSizeMin != null || c.checkSizeMax != null) && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Check size:</span>
              <span>{formatCheckSizeRange(c.checkSizeMin, c.checkSizeMax)}</span>
            </div>
          )}
          {!c.location &&
            !c.companyUrl &&
            !(thesis.data && (thesis.data.sectors?.length || thesis.data.stages?.length)) &&
            !(c.expertiseAreas?.length) &&
            !(c.portfolioCompanies?.length) &&
            !(c.personalInterests?.length) && (
              <p className="text-muted-foreground text-sm">Add or enrich this contact to see at-a-glance details.</p>
            )}
        </div>
      </Card>

      {/* Shared context: conversations */}
      <Card className="p-4 mb-6">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Shared context
        </h2>
        <ScrollArea className="h-[200px] pr-4">
          <ul className="space-y-2 text-sm">
            {matches.slice(0, 10).map((m) => (
              <li key={m.conversationId}>
                <Link href={`/conversation/${m.conversationId}`} className="flex items-center justify-between gap-2 text-primary hover:underline cursor-pointer">
                  <span className="truncate">{m.conversationTitle || "Conversation"}</span>
                  <span className="text-muted-foreground flex-shrink-0">
                    {m.recordedAt ? format(new Date(m.recordedAt), "MMM d, yyyy") : ""} · suggested
                  </span>
                </Link>
              </li>
            ))}
            {conversations.slice(0, 10).map((conv) => (
              <li key={conv.id}>
                <Link href={`/conversation/${conv.id}`} className="flex items-center justify-between gap-2 text-primary hover:underline cursor-pointer">
                  <span className="truncate">{conv.title || "Conversation"}</span>
                  <span className="text-muted-foreground flex-shrink-0">
                    {conv.recordedAt ? format(new Date(conv.recordedAt), "MMM d, yyyy") : ""} · participant
                  </span>
                </Link>
              </li>
            ))}
            {matches.length === 0 && conversations.length === 0 && (
              <li className="text-muted-foreground">No conversations yet.</li>
            )}
          </ul>
        </ScrollArea>
      </Card>

      {/* Deeper context: bio, thesis, education, career */}
      <Card className="p-4 mb-6">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Deeper context
        </h2>
        <div className="space-y-4 text-sm">
          {c.bio && (
            <div>
              <p className="text-muted-foreground mb-1">Bio</p>
              <p className="whitespace-pre-wrap">{c.bio}</p>
            </div>
          )}
          {thesis.data?.notes && (
            <div>
              <p className="text-muted-foreground mb-1">Thesis notes</p>
              <p className="whitespace-pre-wrap">{thesis.data.notes}</p>
            </div>
          )}
          {c.investorNotes && (
            <div>
              <p className="text-muted-foreground mb-1 flex items-center gap-2">
                Investor notes
                {(c as any).thesisSource && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {(c as any).thesisSource === 'extracted' ? 'From public sources'
                      : (c as any).thesisSource === 'portfolio-inferred' ? 'Portfolio-derived'
                      : (c as any).thesisSource === 'minimal' ? 'Limited data'
                      : 'AI-generated'}
                  </Badge>
                )}
              </p>
              <p className="whitespace-pre-wrap">{c.investorNotes}</p>
            </div>
          )}
          {c.education && Array.isArray(c.education) && c.education.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1 flex items-center gap-1">
                <GraduationCap className="w-4 h-4" />
                Education
              </p>
              <ul className="list-disc list-inside space-y-1">
                {(c.education as { school?: string; degree?: string; field?: string; year?: number }[]).map(
                  (e, i) => (
                    <li key={i}>
                      {[e.school, e.degree, e.field, e.year].filter(Boolean).join(", ")}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}
          {c.careerHistory && Array.isArray(c.careerHistory) && c.careerHistory.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1 flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                Career
              </p>
              <ul className="space-y-2">
                {(c.careerHistory as { company?: string; role?: string; years?: string; description?: string }[]).map(
                  (h, i) => (
                    <li key={i}>
                      <span className="font-medium">{h.role ?? "Role"}</span>
                      {h.company && ` at ${h.company}`}
                      {h.years && ` (${h.years})`}
                      {h.description && (
                        <p className="text-muted-foreground mt-0.5">{h.description}</p>
                      )}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}
          {!c.bio && !thesis.data?.notes && !c.investorNotes && !(c.education?.length) && !(c.careerHistory?.length) && (
            <p className="text-muted-foreground">Use Enrich to add bio, education, and career history.</p>
          )}
        </div>
      </Card>

      <ContactDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        contact={c}
      />
      {contactId && (
        <EnrichmentDialog
          contactId={contactId}
          contactName={c.name}
          open={enrichOpen}
          onOpenChange={setEnrichOpen}
        />
      )}
    </div>
  );
}
