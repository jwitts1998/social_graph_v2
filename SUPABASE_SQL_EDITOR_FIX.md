# SQL Editor Error Fix

## The Issue

The `TEST_DATASET.sql` file was using `\set` command which only works in the PostgreSQL command-line tool (psql), not in Supabase SQL Editor.

**Error you saw**:
```
ERROR: 42601: syntax error at or near "\" LINE 15: \set user_id '6aa9b704-375d-420b-9750-297c9dedfe7e'
```

## The Fix

✅ **I've updated the file** to use a simple find-and-replace approach instead.

## How to Proceed Now

### Step 1: Update TEST_DATASET.sql with Your User ID

You already have your user ID: `6aa9b704-375d-420b-9750-297c9dedfe7e`

Now do a **Find & Replace** in `TEST_DATASET.sql`:

1. Open `TEST_DATASET.sql` in your code editor
2. Press **Cmd+H** (Mac) or **Ctrl+H** (Windows) to open Find & Replace
3. Find: `'YOUR_USER_ID_HERE'`
4. Replace with: `'6aa9b704-375d-420b-9750-297c9dedfe7e'`
5. Click **Replace All** (should replace ~40 instances)
6. Save the file

### Step 2: Run the Updated Script

1. Copy the **entire contents** of your updated `TEST_DATASET.sql`
2. Go back to Supabase SQL Editor
3. Clear the editor and paste the updated SQL
4. Click **Run**
5. Should complete successfully in ~10 seconds

### Step 3: Verify Data Created

Run this query in Supabase SQL Editor:

```sql
SELECT name, title FROM contacts WHERE owned_by_profile = auth.uid();
```

**Expected**: Should see 10 contacts including:
- Sarah Chen (Partner, BioVentures Capital)
- Michael Rodriguez (Managing Partner, Cloud Capital Partners)
- Alex Kumar (VP Engineering, TechCorp)
- Robert Smith (Angel Investor)

## What Changed

**Before** (didn't work in Supabase):
```sql
\set user_id '6aa9b704-375d-420b-9750-297c9dedfe7e'
-- later in file:
owned_by_profile = :'user_id'::uuid
```

**After** (works in Supabase):
```sql
-- Instructions to find & replace 'YOUR_USER_ID_HERE' with actual UUID
-- later in file:
owned_by_profile = 'YOUR_USER_ID_HERE'::uuid
```

After you do the find & replace, it becomes:
```sql
owned_by_profile = '6aa9b704-375d-420b-9750-297c9dedfe7e'::uuid
```

## Continue Validation

Once the SQL script runs successfully, continue with the validation guide at **Step 2: Generate Matches** in `QUICK_START_VALIDATION.md`.

---

**Quick Reference**:
- Your User ID: `6aa9b704-375d-420b-9750-297c9dedfe7e`
- File to edit: `TEST_DATASET.sql`
- Find: `'YOUR_USER_ID_HERE'`
- Replace with: `'6aa9b704-375d-420b-9750-297c9dedfe7e'`
- Replace count: ~40 instances
