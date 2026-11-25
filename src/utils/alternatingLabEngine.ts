/**
 * Routine Type & Lab Group Parser for MSE 2K24 / Batch '24.
 * Academic cycle and odd/even calculations removed.
 * Robust categorization and shorthand group parsing.
 */

export type EventCategory = 'EXAM' | 'LAB' | 'LECTURE';

export interface RoutineMetadata {
  category: EventCategory;
  rawType: string;
  groupTag: 'GRP A' | 'GRP B' | 'GRP A/B' | null;
  groupVariant: 'A' | 'B' | 'A/B' | null;
  badgeText: string | null;
  hasReportDue: boolean;
  syllabusText: string;
  // Backwards compatibility stubs for UI
  isAlternating?: boolean;
  isActiveThisWeek?: boolean;
  designatedWeek?: string | null;
  statusKicker?: string | null;
}

export function getCalendarWeekInfo() {
  return {
    cycleLabel: 'ROUTINE ACTIVE',
  };
}

/**
 * Strict Category Parser:
 * Inspects ONLY the type column (or explicit status overrides),
 * and NEVER searches the subject, teacher, or room fields for keywords.
 */
export function parseAlternatingSchedule(
  type: string,
  subject: string = '',
  syllabus: string = ''
): RoutineMetadata {
  const rawType = (type || '').trim().toLowerCase();

  // 1. Strict Category Parser
  let category: EventCategory = 'LECTURE';
  if (rawType.includes('exam') || rawType === 'ct' || rawType.startsWith('test')) {
    category = 'EXAM';
  } else if (rawType.includes('lab') || rawType.includes('sessional')) {
    category = 'LAB';
  } else {
    category = 'LECTURE';
  }

  // 2. Shorthand Lab Group Support (for LABs only)
  let groupTag: 'GRP A' | 'GRP B' | 'GRP A/B' | null = null;
  let groupVariant: 'A' | 'B' | 'A/B' | null = null;

  if (category === 'LAB') {
    const searchCandidates = [rawType, subject || '', syllabus || ''];

    for (const text of searchCandidates) {
      if (!text) continue;
      const norm = text.toLowerCase();

      // Check Dual Group A/B first
      if (
        /lab[-_\s]?a\/b|\ba\/b\b|grp[-_\s]?a\/b|group[-_\s]?a\/b|\[a\/b\]|\(a\/b\)/i.test(norm)
      ) {
        groupTag = 'GRP A/B';
        groupVariant = 'A/B';
        break;
      }

      // Check Group A: "-a", " a", "grp-a", "group-a", "[grp-a]", "[a]"
      if (
        /[-_\s\(\[]grp[-_\s]?a[\]\)]?|[-_\s\(\[]group[-_\s]?a[\]\)]?|\bgrp[-_\s]?a\b|\bgroup[-_\s]?a\b|[-_\s]a\b|\[a\]|\(a\)/i.test(norm)
      ) {
        groupTag = 'GRP A';
        groupVariant = 'A';
        break;
      }

      // Check Group B: "-b", " b", "grp-b", "group-b", "[grp-b]", "[b]"
      if (
        /[-_\s\(\[]grp[-_\s]?b[\]\)]?|[-_\s\(\[]group[-_\s]?b[\]\)]?|\bgrp[-_\s]?b\b|\bgroup[-_\s]?b\b|[-_\s]b\b|\[b\]|\(b\)/i.test(norm)
      ) {
        groupTag = 'GRP B';
        groupVariant = 'B';
        break;
      }
    }
  }

  // If a LAB row has a non-empty syllabus entry, flag it as report due
  const cleanSyllabus = (syllabus || '').trim();
  const hasReportDue = category === 'LAB' && cleanSyllabus.length > 0;

  return {
    category,
    rawType,
    groupTag,
    groupVariant,
    badgeText: groupTag,
    hasReportDue,
    syllabusText: cleanSyllabus,
    isAlternating: false,
    isActiveThisWeek: true,
    designatedWeek: null,
    statusKicker: null,
  };
}
