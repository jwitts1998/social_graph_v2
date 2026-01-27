# Deploy Transcription Fix - Quick Guide

## What Was Fixed

The transcription was failing because I accidentally changed the environment variable name from `SUPABASE_SERVICE_ROLE_KEY` to `SERVICE_ROLE_KEY` when adding improvements.

**Root Cause:** Environment variable mismatch
- Original (working): `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`
- My change (broken): `Deno.env.get('SERVICE_ROLE_KEY')` (doesn't exist)
- Result: Empty API key, authentication failures

**The Fix:** Reverted to original environment variable name while keeping all improvements

## Improvements Kept

All these enhancements are now in the working code:

1. **Detailed logging** - See audio format, size, and processing steps
2. **Audio format preservation** - Keeps original MIME type from browser
3. **Better error handling** - Enhanced debugging information
4. **UI improvements** - Speaker turn grouping instead of arbitrary sections

## Deploy Command

```bash
cd /Users/jacksonwittenberg/dev/projects/social_graph_v2
supabase functions deploy transcribe-audio
```

## Expected Success Logs

After deployment, when you record audio, you should see:

```
=== Audio File Details ===
Audio file name: blob
Audio file type: audio/webm;codecs=opus
Audio file size: 151179 bytes
Audio size (KB): 147.64
Using MIME type: audio/webm;codecs=opus
Using filename: blob
✅ User authenticated: <your-user-id>
Sending request to OpenAI Whisper API...
✅ Transcription successful
First chunk, offset: 0ms
Inserting 3 segments with offset 0ms
Successfully inserted segments
```

**Key Success Indicators:**
- ✅ "User authenticated" message appears
- ✅ Audio details are logged
- ✅ "Transcription successful" message
- ✅ Segments inserted without errors
- ✅ No "Invalid API key" or "Auth session missing" errors

## UI Changes

The transcript view now shows:

**Before:**
```
# Discussion Section 1
• Speaker: text
• Speaker: text
# Discussion Section 2
```

**After:**
```
[J] Jackson Wittenberg    10:52 AM
    Text from speaker...
    More text from same speaker...

[O] Other Speaker         10:53 AM
    Their response...
```

- Groups by speaker turns (natural conversation flow)
- Avatar circles with speaker initials
- Cleaner, more readable layout
- Your messages highlighted with accent color

## Testing Checklist

1. [ ] Deploy function successfully
2. [ ] Start a new recording
3. [ ] Speak for 10+ seconds
4. [ ] Check logs show successful transcription
5. [ ] Verify segments appear in UI
6. [ ] Check speaker grouping looks correct
7. [ ] Test on mobile (responsive design)

## Rollback if Needed

If any issues occur, you can rollback to the last working commit:

```bash
git checkout HEAD -- supabase/functions/transcribe-audio/index.ts
supabase functions deploy transcribe-audio
```

But this should work now - it's using the exact same authentication pattern as before, just with better logging.

---

**Ready to deploy!** The fix is minimal and restores the original working authentication while keeping all improvements.
