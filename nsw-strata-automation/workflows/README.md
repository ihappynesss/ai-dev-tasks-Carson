# n8n Workflows

This directory contains all n8n workflow JSON files for the NSW Strata Automation system.

## Workflow Files

### Core Workflows

- **`main-ticket-processor.json`** - Main workflow for processing new Freshdesk tickets
  - Receives webhook from Freshdesk
  - Enriches ticket data
  - Performs categorization
  - Retrieves knowledge from vector database
  - Routes to appropriate decision path
  - Generates or retrieves response

- **`reply-handler.json`** - Handles customer replies and multi-turn conversations
  - Triggered by Freshdesk ticket updates
  - Fetches conversation history
  - Analyzes sentiment changes
  - Manages context tracking
  - Escalates after 3 unsuccessful attempts

- **`scheduled-maintenance.json`** - Automated maintenance operations
  - Runs nightly at 2 AM (Cron: `0 2 * * *`)
  - Deduplicates knowledge entries
  - Updates success rates
  - Flags entries for review
  - Generates optimization reports

- **`manual-trigger.json`** - On-demand processing with human review
  - Manually triggered by staff dashboard
  - Processes tickets through full workflow
  - Always routes to human review
  - Used during training phase

- **`batch-processor.json`** - Bulk knowledge base updates
  - Triggered by GitHub webhook or manually
  - Processes regulatory changes
  - Updates affected knowledge entries
  - Queues entries for human approval

### Supporting Workflows

- **`error-handler.json`** - Error handling and recovery
  - Triggered by workflow errors
  - Logs errors to database
  - Sends Slack notifications
  - Queues failed operations for retry

## Workflow Version Control

### Exporting Workflows

After modifying workflows in n8n UI, export them:

```bash
# Export all workflows
n8n export:workflow --all --output=./workflows

# Export specific workflow by ID
n8n export:workflow --id=123 --output=./workflows/main-ticket-processor.json

# Export specific workflow by name
n8n export:workflow --name="Main Ticket Processor" --output=./workflows/
```

### Importing Workflows

```bash
# Import all workflows
n8n import:workflow --input=./workflows

# Import specific workflow
n8n import:workflow --input=./workflows/main-ticket-processor.json

# Import with ID preservation (useful for restoring)
n8n import:workflow --input=./workflows/main-ticket-processor.json --separate
```

## Workflow Naming Convention

- Use lowercase with hyphens
- Be descriptive and specific
- Follow pattern: `{function}-{action}.json`

Examples:
- `main-ticket-processor.json` ✅
- `reply-handler.json` ✅
- `scheduled-maintenance.json` ✅
- `TicketProcessor.json` ❌ (use lowercase)
- `workflow1.json` ❌ (not descriptive)

## Testing Workflows

### Development Testing

1. Start local n8n:
   ```bash
   cd .. && docker-compose up -d
   ```

2. Import workflow:
   ```bash
   n8n import:workflow --input=./workflows/main-ticket-processor.json
   ```

3. Test with sample data:
   - Use "Execute Workflow" button in n8n UI
   - Provide test JSON payload
   - Check execution logs

4. Export after testing:
   ```bash
   n8n export:workflow --all --output=./workflows
   ```

### Staging Testing

1. Import to staging environment
2. Configure with 20% sample rate
3. Monitor for 2 weeks minimum
4. Review success metrics
5. Export validated version

### Production Deployment

1. Validate in staging first
2. Import to production n8n Cloud
3. Phased rollout: 10% → 50% → 100%
4. Monitor continuously
5. Keep backup of previous version

## Workflow Structure

Each workflow JSON contains:

```json
{
  "name": "Main Ticket Processor",
  "nodes": [
    {
      "id": "unique-node-id",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [x, y],
      "parameters": {
        "httpMethod": "POST",
        "path": "freshdesk-new-ticket"
      },
      "credentials": {...}
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{
        "node": "NextNode",
        "type": "main",
        "index": 0
      }]]
    }
  },
  "settings": {...},
  "staticData": {...}
}
```

## Credentials Management

**IMPORTANT:** Credentials are NOT stored in Git.

- Credentials are encrypted by n8n
- Stored separately in n8n database
- Referenced by ID in workflow JSON
- Must be recreated in each environment

### Credential Types Used

- **Freshdesk API** - HTTP Request Header Auth
- **Supabase** - Custom API authentication
- **Claude API** - HTTP Request Header Auth
- **Perplexity API** - HTTP Request Header Auth
- **OpenAI API** - HTTP Request Header Auth
- **Slack Webhook** - Webhook URL
- **Redis** - Connection string (environment variable)

## Backup and Recovery

### Automated Daily Backups

```bash
# Automated via cron (daily at 3 AM)
0 3 * * * cd /path/to/nsw-strata-automation && n8n export:workflow --all --output=./workflows && git add workflows/ && git commit -m "chore(backup): automated workflow backup $(date +%Y-%m-%d)" && git push
```

### Manual Backup

```bash
# Export and commit
n8n export:workflow --all --output=./workflows
git add workflows/
git commit -m "chore: manual workflow backup before changes"
git push
```

### Recovery

```bash
# Restore specific workflow
git checkout HEAD~1 -- workflows/main-ticket-processor.json
n8n import:workflow --input=./workflows/main-ticket-processor.json

# Restore all workflows from specific commit
git checkout abc123 -- workflows/
n8n import:workflow --input=./workflows

# Restore from tag
git checkout v1.0.0 -- workflows/
n8n import:workflow --input=./workflows
```

## Workflow Debugging

### Common Issues

**Issue:** Workflow not triggering
- Check webhook URL configuration
- Verify Freshdesk automation is active
- Check n8n execution logs

**Issue:** Credential errors
- Recreate credentials in n8n UI
- Update credential reference in workflow
- Verify API keys are valid

**Issue:** Timeout errors
- Increase timeout in workflow settings
- Check external API availability
- Review rate limiting

### Debug Mode

Enable debug logging in development:

```bash
# In .env
N8N_LOG_LEVEL=debug
```

View execution logs:
```bash
docker-compose logs -f n8n
```

## Performance Optimization

- **Minimize HTTP requests**: Cache where possible
- **Use queue mode**: For production (200+ concurrent)
- **Batch operations**: Group database queries
- **Set timeouts**: Prevent hanging workflows
- **Monitor execution time**: Target <30s for ticket processing

## Workflow Updates

When updating workflows:

1. Create feature branch
2. Test thoroughly in development
3. Export updated workflow
4. Commit with descriptive message
5. Create pull request
6. Deploy to staging first
7. Validate for 2 weeks
8. Deploy to production with phased rollout

See `CONTRIBUTING.md` for detailed Git workflow.

## Related Documentation

- [Configuration Guide](../config/environments.md)
- [API Documentation](../docs/api-documentation.md)
- [Deployment Guide](../docs/deployment-guide.md)
- [Contributing Guide](../CONTRIBUTING.md)
