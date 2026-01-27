# 🚀 Quick Start: Validate Matching System

**Goal**: Validate that the matching algorithm produces high-quality results

**Time Required**: 20-30 minutes

**Prerequisites**: Dev server running, user logged in

---

## Step 1: Create Test Data (5 minutes)

### 1.1 Get Your User ID

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Run this query:
   ```sql
   
   

   ```
5. **Copy the UUID** (e.g., `12345678-1234-1234-1234-123456789012`)

### 1.2 Update TEST_DATASET.sql

1. Open `TEST_DATASET.sql` in your editor
2. Use **Find & Replace** (Cmd+F or Ctrl+F in most editors)
3. Find: `'YOUR_USER_ID_HERE'`
4. Replace with: `'6aa9b704-375d-420b-9750-297c9dedfe7e'` (use your actual UUID from step 1.1)
5. Replace **all occurrences** (there should be ~40 instances)
6. Save the file
### 1.3 Run the SQL Script

1. Copy the **entire file contents** of your updated `TEST_DATASET.sql`
2. Go back to Supabase SQL Editor
3. Paste and click **Run**
4. Wait for completion (~10 seconds)

### 1.4 Verify Data Created

Run this query in SQL Editor:
```sql
SELECT name, title FROM contacts WHERE owned_by_profile = auth.uid();
```

**Expected**: Should see 10 contacts including:
- Sarah Chen (Partner, BioVentures Capital)
- Michael Rodriguez (Managing Partner, Cloud Capital Partners)
- Alex Kumar (VP Engineering, TechCorp)
- Robert Smith (Angel Investor)

✅ If you see these, **data creation succeeded**!

❌ If empty, check that you replaced the user_id correctly

---

## Step 2: Generate Matches (10 minutes)

### 2.1 Open Your App

Go to: http://localhost:3000 (or wherever your dev server is running)

### 2.2 Navigate to Each Test Conversation

Find these 5 conversations in your app:

1. **Biotech Seed Round Discussion**
   - Open conversation page: `/conversation/{id}`
   - Click **"Regenerate Matches"** button
   - Wait 10-20 seconds
   - ✅ Should see matches appear

2. **CTO Search Discussion**
   - Open conversation page
   - Click **"Regenerate Matches"**
   - Wait 10-20 seconds

3. **Fintech Investor Introduction**
   - Open conversation page
   - Click **"Regenerate Matches"**
   - Wait 10-20 seconds

4. **Enterprise SaaS Product Strategy**
   - Open conversation page
   - Click **"Regenerate Matches"**
   - Wait 10-20 seconds

5. **Office Logistics Discussion**
   - Open conversation page
   - Click **"Regenerate Matches"**
   - Wait 10-20 seconds

### 2.3 Check for Errors

Open browser DevTools (F12) → Console tab

✅ **Good**: No red errors  
⚠️ **Warning**: Some warnings OK (like embed-conversation 400 if no API key)  
❌ **Bad**: Red errors about auth, database, or crashes  

---

## Step 3: Validate Results (10 minutes)

### 3.1 Quick Validation

Open `VALIDATION_CHECKLIST.md` and go through each test:

**Test 1**: Biotech → Sarah Chen (3⭐)
- [ ] Sarah Chen is top match? 
- [ ] Has 3 stars?
- [ ] Click "View Details" → See score breakdown?

**Test 2**: CTO → Alex Kumar (3⭐)
- [ ] Alex Kumar is top match?
- [ ] Has 3 stars?
- [ ] Role match score high?

**Test 3**: Name Match → Robert Smith (3⭐)
- [ ] Robert Smith appears (even though mentioned as "Bob")?
- [ ] Has 3 stars?
- [ ] Name match boost visible in breakdown?

**Test 4**: SaaS → Michael Rodriguez (2-3⭐)
- [ ] Michael Rodriguez in top 3?
- [ ] Has 2 or 3 stars?

**Test 5**: Office Logistics → No Matches
- [ ] Zero matches OR all 1 star or less?
- [ ] No 2-3 star false positives?

### 3.2 Pass/Fail

**If 4 or 5 tests pass**: ✅ VALIDATION SUCCESSFUL  
**If 3 or fewer pass**: ❌ NEEDS INVESTIGATION

---

## Step 4: Document Results (5 minutes)

### Create Results File

Create `MATCH_VALIDATION_RESULTS.md` with this template:

```markdown
# Match Validation Results

**Date**: 2026-01-17  
**Status**: PASS / FAIL

## Results

| Test | Expected | Actual | Pass |
|------|----------|--------|------|
| Biotech | Sarah Chen 3⭐ | [actual] | ✅/❌ |
| CTO | Alex Kumar 3⭐ | [actual] | ✅/❌ |
| Name Match | Robert Smith 3⭐ | [actual] | ✅/❌ |
| SaaS | Michael Rodriguez 2-3⭐ | [actual] | ✅/❌ |
| Office | No matches | [actual] | ✅/❌ |

**Pass Rate**: X/5

## Issues Found

[List any issues]

## Conclusion

[Validation passed / needs work]
```

---

## Troubleshooting

### Issue: No test conversations visible in app

**Fix**:
1. Check SQL ran successfully
2. Verify logged in as correct user
3. Check conversations table in Supabase

### Issue: Regenerate Matches button doesn't work

**Fix**:
1. Check browser console for errors
2. Verify dev server is running
3. Check Network tab for API failures

### Issue: Embeddings failing (400 error)

**This is OK!** System falls back to keyword matching. To fix:
1. Go to Supabase Dashboard → Edge Functions → Secrets
2. Add `OPENAI_API_KEY` with your OpenAI key
3. Redeploy embed-conversation function

### Issue: Poor match quality (wrong top matches)

**Investigation**:
1. Check if contacts have rich bios
2. Check if theses were created
3. Check if entities were extracted (Supabase → conversation_entities table)
4. Review `MANUAL_VALIDATION_GUIDE.md` troubleshooting section

---

## Success!

If your validation passes:

1. ✅ Mark the todo as completed
2. Save `MATCH_VALIDATION_RESULTS.md`
3. Optional: Take screenshots of top matches
4. Consider testing with real data

## Need More Detail?

- **Full guide**: See `MANUAL_VALIDATION_GUIDE.md`
- **SQL queries**: See `VERIFY_TEST_DATA.sql`
- **Automated script**: Run `npx tsx scripts/validate-matching.ts`
- **Summary**: See `VALIDATION_IMPLEMENTATION_SUMMARY.md`

---

**Total Time**: ~30 minutes from start to finish

**You've got this!** 🚀
