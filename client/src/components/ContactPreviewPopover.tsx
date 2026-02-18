import { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useContact, useContactThesis } from "@/hooks/useContacts";
import { Link } from "wouter";
import {
  Briefcase,
  Building2,
  GraduationCap,
  MapPin,
  Mail,
  Linkedin,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface ContactPreviewPopoverProps {
  contactId: string;
  children: ReactNode;
}

interface EducationEntry {
  school?: string;
  degree?: string;
  field?: string;
  year?: number;
}

function ContactPreviewContent({ contactId }: { contactId: string }) {
  const { data: contact, isLoading } = useContact(contactId);
  const { data: thesis } = useContactThesis(contactId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contact) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Contact not found
      </p>
    );
  }

  const education = (contact.education ?? []) as EducationEntry[];
  const expertise = (contact.expertiseAreas ?? []) as string[];
  const interests = (contact.personalInterests ?? []) as string[];
  const portfolio = (contact.portfolioCompanies ?? []) as string[];
  const contactTypes = (contact.contactType ?? []) as string[];
  const thesisSectors = thesis?.sectors ?? [];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold leading-tight">{contact.name}</h4>
          {contactTypes.map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">
              {t}
            </Badge>
          ))}
        </div>
        {(contact.title || contact.company) && (
          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {contact.title && (
              <div className="flex items-center gap-1">
                <Briefcase className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{contact.title}</span>
              </div>
            )}
            {contact.company && (
              <div className="flex items-center gap-1">
                <Building2 className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{contact.company}</span>
              </div>
            )}
          </div>
        )}
        {contact.location && (
          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span>{contact.location}</span>
          </div>
        )}
      </div>

      {/* Bio */}
      {contact.bio && (
        <>
          <Separator />
          <p className="text-xs text-muted-foreground line-clamp-3">
            {contact.bio}
          </p>
        </>
      )}

      {/* Expertise */}
      {expertise.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Expertise
          </p>
          <div className="flex flex-wrap gap-1">
            {expertise.slice(0, 5).map((area) => (
              <Badge key={area} variant="outline" className="text-[10px] px-1.5 py-0">
                {area}
              </Badge>
            ))}
            {expertise.length > 5 && (
              <span className="text-[10px] text-muted-foreground">
                +{expertise.length - 5}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Thesis sectors */}
      {thesisSectors.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Focus Areas
          </p>
          <div className="flex flex-wrap gap-1">
            {thesisSectors.slice(0, 5).map((s) => (
              <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Interests */}
      {interests.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Interests
          </p>
          <div className="flex flex-wrap gap-1">
            {interests.slice(0, 4).map((item) => (
              <Badge key={item} variant="secondary" className="text-[10px] px-1.5 py-0">
                {item}
              </Badge>
            ))}
            {interests.length > 4 && (
              <span className="text-[10px] text-muted-foreground">
                +{interests.length - 4}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Portfolio */}
      {portfolio.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Portfolio
          </p>
          <div className="flex flex-wrap gap-1">
            {portfolio.slice(0, 5).map((co) => (
              <Badge key={co} variant="secondary" className="text-[10px] px-1.5 py-0">
                {co}
              </Badge>
            ))}
            {portfolio.length > 5 && (
              <span className="text-[10px] text-muted-foreground">
                +{portfolio.length - 5}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Education */}
      {education.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Education
          </p>
          <div className="space-y-0.5">
            {education.slice(0, 2).map((ed, i) => (
              <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                <GraduationCap className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">
                  {[ed.degree, ed.field].filter(Boolean).join(" in ")}
                  {ed.school ? ` — ${ed.school}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact links */}
      {(contact.email || contact.linkedinUrl) && (
        <>
          <Separator />
          <div className="flex items-center gap-2">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="w-3.5 h-3.5" />
              </a>
            )}
            {contact.linkedinUrl && (
              <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Linkedin className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </>
      )}

      {/* View profile link */}
      <Link href={`/contacts/${contactId}`}>
        <Button variant="outline" size="sm" className="w-full text-xs h-7 mt-1">
          <ExternalLink className="w-3 h-3 mr-1" />
          View Full Profile
        </Button>
      </Link>
    </div>
  );
}

export default function ContactPreviewPopover({
  contactId,
  children,
}: ContactPreviewPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80" side="right" align="start">
        <ContactPreviewContent contactId={contactId} />
      </PopoverContent>
    </Popover>
  );
}
