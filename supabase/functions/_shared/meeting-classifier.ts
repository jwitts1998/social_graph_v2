/**
 * Shared utilities for classifying calendar meetings
 */

interface Attendee {
  email: string;
  displayName?: string;
  responseStatus?: string;
}

/**
 * Determines if a meeting has external attendees (different email domain than user)
 * @param userEmail - The user's email address
 * @param attendees - Array of meeting attendees
 * @returns true if meeting has external attendees and is not a solo meeting
 */
export function isExternalMeeting(
  userEmail: string,
  attendees: Attendee[]
): boolean {
  // Must have at least one other attendee besides user
  if (!attendees || attendees.length <= 1) {
    return false;
  }

  // Extract user's domain
  const userDomain = userEmail.split('@')[1]?.toLowerCase();
  if (!userDomain) {
    return false;
  }

  // Check if any attendees are from external domains
  const hasExternalAttendees = attendees.some((attendee) => {
    if (!attendee.email) return false;
    
    const attendeeDomain = attendee.email.split('@')[1]?.toLowerCase();
    if (!attendeeDomain) return false;
    
    // Different domain = external
    return attendeeDomain !== userDomain;
  });

  return hasExternalAttendees;
}

/**
 * Extracts external attendees from a meeting
 * @param userEmail - The user's email address
 * @param attendees - Array of meeting attendees
 * @returns Array of external attendees
 */
export function getExternalAttendees(
  userEmail: string,
  attendees: Attendee[]
): Attendee[] {
  if (!attendees || attendees.length === 0) {
    return [];
  }

  const userDomain = userEmail.split('@')[1]?.toLowerCase();
  if (!userDomain) {
    return [];
  }

  return attendees.filter((attendee) => {
    if (!attendee.email) return false;
    
    const attendeeDomain = attendee.email.split('@')[1]?.toLowerCase();
    if (!attendeeDomain) return false;
    
    return attendeeDomain !== userDomain && attendee.email.toLowerCase() !== userEmail.toLowerCase();
  });
}
