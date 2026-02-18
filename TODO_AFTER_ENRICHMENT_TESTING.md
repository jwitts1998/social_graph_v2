# TODO: Post-Enrichment Testing

## Current Status: Testing Enrichment v1.2
- ✅ Database migration applied
- ✅ Functions ready to deploy
- ⏳ Waiting for testing results

## Next Priority: Explore Social Media Enrichment

**See detailed plan:** `FUTURE_SOCIAL_MEDIA_ENRICHMENT.md`

### Quick Summary

**What:** Add Instagram/Twitter data to contact profiles for better personal context

**Why:**
- Better understand contact interests beyond LinkedIn
- Improve personal affinity matching
- Find conversation icebreakers
- Personalize intro emails

**How (Recommended):**
Start with **Serper + GPT** (already have this!):
- Search "[name] Twitter bio interests"
- Search "[name] Instagram about"  
- GPT extracts: personal interests, content topics, activity level
- Cost: $0.03 per contact

**Legal & Safe:**
- ✅ Uses public search results (not direct scraping)
- ✅ Official APIs or search engines only
- ✅ Stores insights, not raw posts
- ✅ Respects privacy and TOS

### Action Items

1. **Complete current enrichment testing**
   - Test on 10-20 contacts
   - Measure data completeness improvement
   - Verify match quality improvements

2. **Review social media plan**
   - Read `FUTURE_SOCIAL_MEDIA_ENRICHMENT.md`
   - Decide: Serper+GPT vs Perplexity vs Twitter API
   - Consider privacy policy updates

3. **Implement Phase 1 MVP** (~2-3 days)
   - Add social searches to `research-contact`
   - Extract interests and topics
   - Test on public figures first

4. **Measure ROI**
   - Do social insights improve matches?
   - Is the data quality worth $0.03 extra per contact?
   - Do users find it valuable?

### Other Future Enhancements

- [ ] Automated re-enrichment (monthly background job)
- [ ] Bulk enrichment for existing contacts
- [ ] Enrichment quality dashboard
- [ ] Network overlap detection (mutual connections)
- [ ] Real-time social monitoring (alerts on relevant posts)
- [ ] Integration with intro email templates (personalization)

---

**Created:** January 27, 2025
**Next Review:** After enrichment v1.2 testing complete
