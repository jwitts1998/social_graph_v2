#!/usr/bin/env tsx
/**
 * Matching System Validation Script
 * 
 * This script validates the matching algorithm by:
 * 1. Checking if test data exists
 * 2. Running matches for each test conversation
 * 3. Validating star ratings, scores, and explanations
 * 4. Generating a validation report
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('   Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)');
  console.error('   Found VITE_SUPABASE_URL:', !!process.env.VITE_SUPABASE_URL);
  console.error('   Found SUPABASE_ANON_KEY:', !!process.env.SUPABASE_ANON_KEY);
  process.exit(1);
}

console.log('🔑 Using Supabase with', SUPABASE_KEY.includes('service_role') ? 'service role key' : 'anon key');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface ValidationResult {
  conversation: string;
  conversationId: string;
  passed: boolean;
  issues: string[];
  matches: any[];
  expectedTopMatch?: string;
  actualTopMatch?: string;
  starRatings: { [stars: number]: number };
}

interface TestCase {
  title: string;
  expectedTopContact: string;
  expectedStars: number;
  minMatches: number;
  maxMatches: number;
  keyChecks: string[];
}

const TEST_CASES: Record<string, TestCase> = {
  'Biotech Seed Round Discussion': {
    title: 'Biotech Seed Round Discussion',
    expectedTopContact: 'Sarah Chen',
    expectedStars: 3,
    minMatches: 2,
    maxMatches: 6,
    keyChecks: [
      'Sarah Chen should be top match',
      'Sarah Chen should have 3 stars',
      'Tag overlap should include Biotech',
      'Semantic score should be > 0.5',
    ],
  },
  'CTO Search Discussion': {
    title: 'CTO Search Discussion',
    expectedTopContact: 'Alex Kumar',
    expectedStars: 3,
    minMatches: 1,
    maxMatches: 5,
    keyChecks: [
      'Alex Kumar should be top match',
      'Role match score should be high',
      'CTO/VP Engineering role should match',
    ],
  },
  'Fintech Investor Introduction': {
    title: 'Fintech Investor Introduction',
    expectedTopContact: 'Robert Smith',
    expectedStars: 3,
    minMatches: 1,
    maxMatches: 4,
    keyChecks: [
      'Robert Smith should match (Bob → Robert)',
      'Name match boost should be applied',
      'Name match score should be > 0.8',
    ],
  },
  'Enterprise SaaS Product Strategy': {
    title: 'Enterprise SaaS Product Strategy',
    expectedTopContact: 'Michael Rodriguez',
    expectedStars: 2, // Could be 3
    minMatches: 2,
    maxMatches: 6,
    keyChecks: [
      'Michael Rodriguez should be top match',
      'SaaS sector should match',
      'Series A stage should match',
    ],
  },
  'Office Logistics Discussion': {
    title: 'Office Logistics Discussion',
    expectedTopContact: 'None',
    expectedStars: 0,
    minMatches: 0,
    maxMatches: 2,
    keyChecks: [
      'Should have zero or very low matches',
      'No matches should exceed 1 star',
    ],
  },
};

async function getUserIdForTestData(): Promise<string | null> {
  // Find a user that has test conversations
  const { data: conversations } = await supabase
    .from('conversations')
    .select('owned_by_profile, title')
    .in('title', Object.keys(TEST_CASES))
    .limit(1);

  if (conversations && conversations.length > 0) {
    return conversations[0].owned_by_profile;
  }

  return null;
}

async function checkTestDataExists(userId: string): Promise<boolean> {
  console.log('\n📋 Checking test data...\n');

  // Check contacts
  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('name')
    .eq('owned_by_profile', userId);

  if (contactsError) {
    console.error('❌ Error fetching contacts:', contactsError.message);
    return false;
  }

  console.log(`✅ Found ${contacts?.length || 0} contacts`);
  if (contacts && contacts.length > 0) {
    const testContacts = ['Sarah Chen', 'Michael Rodriguez', 'Alex Kumar', 'Robert Smith'];
    const foundContacts = testContacts.filter(tc => 
      contacts.some(c => c.name === tc)
    );
    console.log(`   Test contacts found: ${foundContacts.join(', ') || 'none'}`);
  }

  // Check conversations
  const { data: conversations, error: convsError } = await supabase
    .from('conversations')
    .select('id, title')
    .eq('owned_by_profile', userId);

  if (convsError) {
    console.error('❌ Error fetching conversations:', convsError.message);
    return false;
  }

  console.log(`✅ Found ${conversations?.length || 0} conversations`);
  if (conversations && conversations.length > 0) {
    const testConvTitles = Object.keys(TEST_CASES);
    const foundConvs = conversations.filter(c => testConvTitles.includes(c.title));
    console.log(`   Test conversations found: ${foundConvs.length}/${testConvTitles.length}`);
    foundConvs.forEach(c => console.log(`     - ${c.title}`));
  }

  return (contacts?.length || 0) > 0 && (conversations?.length || 0) > 0;
}

async function validateConversationMatches(
  conversation: any,
  testCase: TestCase
): Promise<ValidationResult> {
  const result: ValidationResult = {
    conversation: conversation.title,
    conversationId: conversation.id,
    passed: true,
    issues: [],
    matches: [],
    starRatings: { 1: 0, 2: 0, 3: 0 },
  };

  console.log(`\n🔍 Validating: ${conversation.title}`);
  console.log(`   ID: ${conversation.id}`);

  // Fetch matches for this conversation
  const { data: matches, error } = await supabase
    .from('match_suggestions')
    .select(`
      id,
      score,
      reasons,
      justification,
      ai_explanation,
      score_breakdown,
      confidence_scores,
      match_version,
      contacts:contact_id (name, title, company)
    `)
    .eq('conversation_id', conversation.id)
    .order('score', { ascending: false });

  if (error) {
    result.passed = false;
    result.issues.push(`Error fetching matches: ${error.message}`);
    return result;
  }

  result.matches = matches || [];
  console.log(`   Found ${result.matches.length} matches`);

  // Count star ratings
  result.matches.forEach(m => {
    if (m.score >= 1 && m.score <= 3) {
      result.starRatings[m.score]++;
    }
  });

  console.log(`   Star distribution: 3⭐: ${result.starRatings[3]}, 2⭐: ${result.starRatings[2]}, 1⭐: ${result.starRatings[1]}`);

  // Check match count
  if (result.matches.length < testCase.minMatches) {
    result.passed = false;
    result.issues.push(
      `Too few matches: expected at least ${testCase.minMatches}, got ${result.matches.length}`
    );
  }

  if (result.matches.length > testCase.maxMatches) {
    result.issues.push(
      `Warning: More matches than expected: ${result.matches.length} (max ${testCase.maxMatches})`
    );
  }

  // Check top match
  if (result.matches.length > 0) {
    const topMatch = result.matches[0];
    result.actualTopMatch = topMatch.contacts?.name || 'Unknown';
    result.expectedTopMatch = testCase.expectedTopContact;

    console.log(`   Top match: ${result.actualTopMatch} (${topMatch.score}⭐)`);

    if (testCase.expectedTopContact !== 'None') {
      if (result.actualTopMatch !== testCase.expectedTopContact) {
        result.passed = false;
        result.issues.push(
          `Top match mismatch: expected "${testCase.expectedTopContact}", got "${result.actualTopMatch}"`
        );
      }

      // Check star rating of top match
      if (topMatch.score < testCase.expectedStars) {
        result.passed = false;
        result.issues.push(
          `Star rating too low: expected ${testCase.expectedStars}⭐, got ${topMatch.score}⭐`
        );
      }

      // Check score breakdown exists
      if (!topMatch.score_breakdown) {
        result.issues.push('Warning: Missing score_breakdown');
      } else {
        console.log('   Score breakdown components:', Object.keys(topMatch.score_breakdown).join(', '));
      }

      // Check confidence scores
      if (!topMatch.confidence_scores) {
        result.issues.push('Warning: Missing confidence_scores');
      } else {
        const overallConf = topMatch.confidence_scores.overall;
        console.log(`   Confidence: ${(overallConf * 100).toFixed(0)}% (${overallConf >= 0.7 ? 'High' : overallConf >= 0.5 ? 'Medium' : 'Low'})`);
      }

      // Check AI explanation (for 2+ star matches)
      if (topMatch.score >= 2 && !topMatch.ai_explanation) {
        result.issues.push('Warning: Missing AI explanation for 2+ star match');
      } else if (topMatch.ai_explanation) {
        console.log(`   AI explanation: "${topMatch.ai_explanation.slice(0, 80)}..."`);
      }

      // Check match version
      if (topMatch.match_version !== 'v1.1-transparency') {
        result.issues.push(`Warning: Unexpected match version: ${topMatch.match_version}`);
      }
    }
  } else if (testCase.expectedTopContact !== 'None') {
    result.passed = false;
    result.issues.push('No matches found (expected at least one)');
  }

  // Special validations based on conversation type
  if (conversation.title === 'Fintech Investor Introduction') {
    // Check for name match boost
    const robertMatch = result.matches.find(m => m.contacts?.name === 'Robert Smith');
    if (robertMatch && robertMatch.score_breakdown?.nameMatch) {
      console.log(`   ✅ Name match boost detected: ${robertMatch.score_breakdown.nameMatch.toFixed(2)}`);
    } else if (robertMatch) {
      result.issues.push('Warning: Robert Smith match missing nameMatch boost');
    }
  }

  if (conversation.title === 'Office Logistics Discussion') {
    // Should have no high-scoring matches
    const highMatches = result.matches.filter(m => m.score >= 2);
    if (highMatches.length > 0) {
      result.passed = false;
      result.issues.push(`False positives: found ${highMatches.length} 2+ star matches for irrelevant conversation`);
    }
  }

  return result;
}

async function generateReport(results: ValidationResult[]): Promise<void> {
  const reportPath = path.join(__dirname, '../MATCH_VALIDATION_RESULTS.md');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(0);

  let report = `# Match Quality Validation Results\n\n`;
  report += `**Date**: ${new Date().toISOString()}\n`;
  report += `**Overall**: ${passed}/${total} tests passed (${passRate}%)\n\n`;

  report += `## Summary\n\n`;
  report += `| Conversation | Status | Top Match | Stars | Issues |\n`;
  report += `|-------------|--------|-----------|-------|--------|\n`;

  results.forEach(r => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    const topMatch = r.actualTopMatch || 'None';
    const stars = r.matches[0]?.score || 0;
    const issueCount = r.issues.length;

    report += `| ${r.conversation} | ${status} | ${topMatch} | ${stars}⭐ | ${issueCount} |\n`;
  });

  report += `\n## Detailed Results\n\n`;

  results.forEach(r => {
    report += `### ${r.conversation}\n\n`;
    report += `- **Status**: ${r.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
    report += `- **Conversation ID**: \`${r.conversationId}\`\n`;
    report += `- **Matches Found**: ${r.matches.length}\n`;
    report += `- **Star Distribution**: 3⭐: ${r.starRatings[3]}, 2⭐: ${r.starRatings[2]}, 1⭐: ${r.starRatings[1]}\n`;

    if (r.expectedTopMatch) {
      report += `- **Expected Top Match**: ${r.expectedTopMatch}\n`;
      report += `- **Actual Top Match**: ${r.actualTopMatch || 'None'}\n`;
    }

    if (r.issues.length > 0) {
      report += `\n**Issues Found**:\n`;
      r.issues.forEach(issue => {
        report += `- ${issue}\n`;
      });
    }

    if (r.matches.length > 0) {
      report += `\n**Top 3 Matches**:\n\n`;
      r.matches.slice(0, 3).forEach((m, i) => {
        report += `${i + 1}. **${m.contacts?.name || 'Unknown'}** (${m.score}⭐)\n`;
        if (m.contacts?.title) report += `   - Title: ${m.contacts.title}\n`;
        if (m.contacts?.company) report += `   - Company: ${m.contacts.company}\n`;
        if (m.reasons && m.reasons.length > 0) {
          report += `   - Reasons: ${m.reasons.join(', ')}\n`;
        }
        if (m.score_breakdown) {
          const breakdown = m.score_breakdown;
          report += `   - Score breakdown:\n`;
          if (breakdown.embedding !== undefined) {
            report += `     - Embedding: ${(breakdown.embedding * 100).toFixed(0)}%\n`;
          }
          if (breakdown.semantic !== undefined) {
            report += `     - Semantic: ${(breakdown.semantic * 100).toFixed(0)}%\n`;
          }
          if (breakdown.tagOverlap !== undefined) {
            report += `     - Tag Overlap: ${(breakdown.tagOverlap * 100).toFixed(0)}%\n`;
          }
          if (breakdown.roleMatch !== undefined) {
            report += `     - Role Match: ${(breakdown.roleMatch * 100).toFixed(0)}%\n`;
          }
          if (breakdown.geoMatch !== undefined) {
            report += `     - Geo Match: ${(breakdown.geoMatch * 100).toFixed(0)}%\n`;
          }
          if (breakdown.relationship !== undefined) {
            report += `     - Relationship: ${(breakdown.relationship * 100).toFixed(0)}%\n`;
          }
          if (breakdown.nameMatch !== undefined) {
            report += `     - **Name Match Boost**: ${(breakdown.nameMatch * 100).toFixed(0)}%\n`;
          }
        }
        if (m.confidence_scores?.overall) {
          const conf = m.confidence_scores.overall;
          const level = conf >= 0.7 ? 'High' : conf >= 0.5 ? 'Medium' : 'Low';
          report += `   - Confidence: ${(conf * 100).toFixed(0)}% (${level})\n`;
        }
        if (m.ai_explanation) {
          report += `   - AI Explanation: "${m.ai_explanation}"\n`;
        }
        report += `\n`;
      });
    }

    report += `\n`;
  });

  report += `## Next Steps\n\n`;
  if (passed === total) {
    report += `✅ All tests passed! The matching system is working as expected.\n\n`;
    report += `Recommended next steps:\n`;
    report += `1. Review AI explanations for quality\n`;
    report += `2. Test with real user data\n`;
    report += `3. Monitor performance in production\n`;
    report += `4. Collect user feedback on match quality\n`;
  } else {
    report += `⚠️ Some tests failed. Address the issues above before deploying.\n\n`;
    report += `Priority fixes:\n`;
    results.forEach(r => {
      if (!r.passed) {
        report += `- **${r.conversation}**: ${r.issues.join('; ')}\n`;
      }
    });
  }

  fs.writeFileSync(reportPath, report);
  console.log(`\n📊 Report saved to: ${reportPath}\n`);
}

async function main() {
  console.log('🚀 Starting Match Quality Validation\n');
  console.log('=' .repeat(60));
  
  // Note: This script validates existing matches in the database
  // Make sure test conversations have been created and matches generated
  console.log('ℹ️  This script validates matches that already exist in the database');
  console.log('ℹ️  Make sure you have run "Regenerate Matches" for test conversations\n');

  // Find user with test data
  const userId = await getUserIdForTestData();
  if (!userId) {
    console.error('\n❌ No test data found. Please run TEST_DATASET.sql first.\n');
    console.error('Instructions:');
    console.error('1. Log in to Supabase dashboard');
    console.error('2. Open SQL Editor');
    console.error('3. Run: SELECT auth.uid(); to get your user ID');
    console.error('4. Update TEST_DATASET.sql with your user ID');
    console.error('5. Run the entire TEST_DATASET.sql script\n');
    process.exit(1);
  }

  console.log(`✅ Found test user: ${userId}\n`);

  // Check test data exists
  const hasData = await checkTestDataExists(userId);
  if (!hasData) {
    console.error('\n❌ Test data incomplete. Please run TEST_DATASET.sql.\n');
    process.exit(1);
  }

  // Get test conversations
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('id, title')
    .eq('owned_by_profile', userId)
    .in('title', Object.keys(TEST_CASES));

  if (error || !conversations || conversations.length === 0) {
    console.error('\n❌ Failed to fetch test conversations:', error?.message);
    process.exit(1);
  }

  console.log(`\n✅ Found ${conversations.length} test conversations to validate\n`);
  console.log('=' .repeat(60));

  // Validate each conversation
  const results: ValidationResult[] = [];
  for (const conversation of conversations) {
    const testCase = TEST_CASES[conversation.title];
    if (testCase) {
      const result = await validateConversationMatches(conversation, testCase);
      results.push(result);

      // Print immediate result
      if (result.passed) {
        console.log(`   ✅ PASSED`);
      } else {
        console.log(`   ❌ FAILED`);
        result.issues.forEach(issue => console.log(`      - ${issue}`));
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Validation Complete\n');

  // Print summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Results:`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📈 Pass Rate: ${((passed / results.length) * 100).toFixed(0)}%\n`);

  // Generate detailed report
  await generateReport(results);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
