# Checkpoint Template

This template is used to create checkpoints when context reaches 85%, enabling seamless resumption by autonomous agents.

## Checkpoint Format

```markdown
# Checkpoint - {TIMESTAMP}

## Context Status
- **Usage:** {CURRENT_TOKENS} / 200,000 tokens ({PERCENTAGE}%)
- **Session started:** {START_TIME}
- **Duration:** {DURATION}
- **Agent number:** {AGENT_NUMBER}

## Last Completed Task
- **Task:** {TASK_NUMBER}.{SUBTASK_NUMBER}
- **Description:** {SUBTASK_DESCRIPTION}
- **Files modified:** {LIST_OF_FILES}
- **Commit hash:** {COMMIT_HASH}
- **Status:** ✅ Complete

## Next To Start
- **Task:** {NEXT_TASK}.{NEXT_SUBTASK}
- **Description:** {NEXT_SUBTASK_DESCRIPTION}
- **Files to modify:** {LIST_OF_FILES}
- **Estimated complexity:** {LOW|MEDIUM|HIGH}

## Important Context to Preserve

### Workflows Created (5 total)
1. **main-ticket-processor.json** - Main ticket processing with 5-path routing
2. **reply-handler.json** - Multi-turn conversation management
3. **scheduled-maintenance.json** - Nightly maintenance at 2 AM
4. **manual-trigger.json** - Manual testing and reprocessing
5. **batch-processor.json** - Bulk operations

### Database Schema
- **4 tables:** knowledge_base, training_examples, conversation_state, system_metrics
- **HNSW indexes:** m=16, ef_construction=64
- **Extensions:** pgvector, pg_trgm, uuid-ossp
- **Supabase Pro Plan required**

### Knowledge Base
- **6 initial entries** across 6 categories
- **8 main categories,** 34 subcategories
- **GitHub Actions** for automated versioning
- **Directory structure:** `/knowledge/{category}/{subcategory}/{entry-id}.md`

### Key Implementation Details
- **Hybrid search:** Vector (pgvector) + Keyword (pg_trgm) with RRF
- **Decision engine:** 5 routing paths based on similarity and training samples
- **Sentiment analysis:** Keyword-based in reply-handler
- **Webhook security:** HMAC-SHA256 signature verification
- **Rate limiting:** Redis DB 2, per-requester and global limits

### Pending Implementations
- **Claude AI integration:** Required for response generation (Task 6.0)
- **Perplexity API:** Required for deep research path (Task 6.0)
- **Redis caching:** Documented, needs implementation in workflows
- **pgBouncer:** Documented, needs configuration

## Files Modified This Session

### Created
- {LIST_OF_NEW_FILES}

### Modified
- {LIST_OF_MODIFIED_FILES}

### Deleted
- {LIST_OF_DELETED_FILES}

## Git Status
- **Current branch:** main
- **Last commit:** {COMMIT_HASH}
- **Commit message:** {COMMIT_MESSAGE}
- **Uncommitted changes:** {YES|NO}

## Tasks Completed This Session

- [x] Task X.Y - {DESCRIPTION}
- [x] Task X.Z - {DESCRIPTION}
- ...

## Tasks Remaining (High Priority)

1. **Task {N}.{M}** - {DESCRIPTION} (Next to start)
2. **Task {N}.{M+1}** - {DESCRIPTION}
3. **Task {N+1}.1** - {DESCRIPTION}

## Known Issues / Blockers

- {ISSUE_1}
- {ISSUE_2}

## Notes for Next Agent

- {NOTE_1}
- {NOTE_2}
- Remember to commit after every 3-5 subtasks
- Run tests if available before committing
- Update task file with [x] markers
- Create new checkpoint at 85% context

## Agent Launch Instructions

When reaching 85% context, the next agent should be launched with:

```javascript
Task({
  subagent_type: "general-purpose",
  description: "Continue Task {NEXT_TASK}",
  prompt: `
Read the checkpoint file CHECKPOINT-{TIMESTAMP}.md and the task file tasks/tasks-0001-prd-nsw-strata-automation.md.

Continue from Task {NEXT_TASK}.{NEXT_SUBTASK}: {DESCRIPTION}

Work autonomously through subtasks:
1. Complete each subtask fully
2. Commit changes after every 3-5 subtasks
3. Update task file with [x] markers
4. Log progress

When context reaches 85% (~170k/200k tokens):
1. Create new checkpoint: CHECKPOINT-{NEW_TIMESTAMP}.md
2. Commit all changes
3. Launch next autonomous agent with same instructions
4. Pass checkpoint information forward

Continue until all 200+ subtasks are complete or context reaches 85%.
  `
})
```

## Performance Metrics

- **Subtasks completed:** {COUNT}
- **Files created:** {COUNT}
- **Lines of code:** {COUNT}
- **Commits:** {COUNT}
- **Average time per subtask:** {DURATION}

## Verification Checklist

Before launching next agent:
- [ ] All changes committed to git
- [ ] Task file updated with [x] markers
- [ ] Checkpoint file created and committed
- [ ] No uncommitted changes remaining
- [ ] Next task identified and documented
- [ ] Context usage confirmed at 85%+

---

**Checkpoint created:** {TIMESTAMP}
**Next agent:** Agent {NUMBER + 1}
**Estimated remaining work:** {X} tasks, {Y} subtasks
```

## Usage Instructions

### When to Create Checkpoint

Create checkpoint when:
1. **Context reaches 85%** (170k / 200k tokens)
2. **Natural task boundary** (end of major task like 3.0, 4.0, etc.)
3. **Before complex task** that may consume lots of context
4. **Manual request** from user

### How to Create Checkpoint

1. **Fill in template** with current session information
2. **Save as:** `CHECKPOINT-{YYYY-MM-DD-HH-MM-SS}.md`
3. **Commit:**
   ```bash
   git add CHECKPOINT-*.md
   git commit -m "checkpoint: save progress at {XX}% context - Task X.Y complete"
   ```
4. **Launch next agent** using Task tool with detailed prompt

### How to Resume from Checkpoint

1. **Read latest checkpoint:**
   ```bash
   # Find latest checkpoint
   ls -lt CHECKPOINT-*.md | head -1
   ```

2. **Review task file:**
   - Check last [x] marked task
   - Identify next [ ] unmarked task

3. **Continue work:**
   - Start from "Next To Start" section
   - Follow same procedures
   - Create new checkpoint at 85%

## Example Checkpoint

```markdown
# Checkpoint - 2025-10-15-02-30-00

## Context Status
- **Usage:** 170,500 / 200,000 tokens (85.3%)
- **Session started:** 2025-10-15 00:00:00
- **Duration:** 2 hours 30 minutes
- **Agent number:** 1

## Last Completed Task
- **Task:** 4.13
- **Description:** Target <200ms query latency optimization
- **Files modified:** config/pgbouncer-config.md, config/redis-caching-strategy.md
- **Commit hash:** 8e624e5
- **Status:** ✅ Complete

## Next To Start
- **Task:** 4.14
- **Description:** Implement lazy loading for knowledge content (summaries in metadata)
- **Files to modify:** database/schema.sql, workflows/main-ticket-processor.json
- **Estimated complexity:** MEDIUM

...
```

## Related Documentation

- [Progress Summary](./PROGRESS-SUMMARY.md)
- [Task List](./tasks/tasks-0001-prd-nsw-strata-automation.md)
- [Contributing Guide](./CONTRIBUTING.md)
