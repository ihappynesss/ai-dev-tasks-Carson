# Contributing to NSW Strata Automation

## Git Workflow and Version Control

This project follows a structured Git workflow to ensure safe workflow development and deployment.

## Repository Structure

```
nsw-strata-automation/
├── .git/                           # Git repository
├── workflows/                      # n8n workflow JSON files (version controlled)
│   ├── main-ticket-processor.json
│   ├── reply-handler.json
│   ├── scheduled-maintenance.json
│   ├── manual-trigger.json
│   └── batch-processor.json
├── credentials/                    # Encrypted credentials (NOT in Git - see .gitignore)
├── database/                       # Database schemas and migrations
│   ├── schema.sql
│   └── migrations/                 # Sequential migration files
├── config/                         # Configuration files
│   ├── redis-config.md
│   └── environments.md
├── monitoring/                     # Monitoring and metrics configuration
│   └── prometheus-config.yml
├── tests/                          # Test configurations
│   └── workflow-tests/
├── docs/                           # Documentation
│   ├── deployment-guide.md
│   └── api-documentation.md
├── knowledge/                      # Knowledge base entries (Markdown)
│   └── {category}/{subcategory}/{entry-id}.md
└── .env files                      # Environment configurations (templates tracked, secrets ignored)
```

## Branch Strategy

### Main Branches

- **`main`** - Production-ready code, protected branch
  - Requires pull request reviews
  - All tests must pass
  - Deployed to production after validation

- **`staging`** - Pre-production testing
  - Deployed to staging environment
  - 2-week validation period before merging to main

- **`develop`** - Integration branch for feature development
  - All feature branches merge here first
  - Deployed to development environment

### Feature Branches

```bash
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/add-by-law-category

# Work on feature, commit changes
git add .
git commit -m "feat: add by-law compliance category workflow"

# Push to remote
git push origin feature/add-by-law-category

# Create pull request to develop
```

### Branch Naming Convention

- **Feature branches:** `feature/description-of-feature`
- **Bug fixes:** `fix/description-of-bug`
- **Hotfixes:** `hotfix/critical-issue`
- **Documentation:** `docs/update-documentation`
- **Configuration:** `config/update-environment`

Examples:
- `feature/perplexity-deep-research`
- `fix/webhook-timeout-handling`
- `hotfix/redis-connection-error`
- `docs/add-api-documentation`
- `config/staging-environment`

## Workflow Versioning

### Exporting Workflows from n8n

After creating or modifying workflows in n8n UI:

```bash
# Method 1: Export via n8n CLI (recommended)
n8n export:workflow --all --output=./workflows

# Method 2: Export manually from n8n UI
# - Open workflow in n8n
# - Click three dots menu
# - Select "Download"
# - Save to workflows/ directory
```

### Workflow File Naming

Workflows should follow this naming convention:
- `{workflow-name}.json`
- Use lowercase with hyphens
- Be descriptive and specific

Examples:
- `main-ticket-processor.json`
- `reply-handler.json`
- `scheduled-maintenance.json`
- `knowledge-base-update.json`

### Committing Workflow Changes

```bash
# Check status
git status

# Add modified workflows
git add workflows/main-ticket-processor.json

# Commit with descriptive message
git commit -m "feat: add Perplexity API integration to ticket processor

- Integrated sonar-deep-research for novel tickets
- Added rate limiting (4.5 RPM) with Redis queue
- Configured fallback to sonar-pro for faster queries
- Related to task 6.4 in PRD"

# Push to feature branch
git push origin feature/perplexity-integration
```

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat:** New feature
- **fix:** Bug fix
- **docs:** Documentation changes
- **style:** Code style changes (formatting, no logic change)
- **refactor:** Code refactoring
- **test:** Adding or updating tests
- **chore:** Maintenance tasks (dependencies, build config)
- **config:** Configuration changes

### Examples

```bash
# Feature addition
git commit -m "feat(workflows): add Claude self-refine methodology

- Implemented 3-iteration refinement process
- Added critique and improve steps
- Configured for Path 2 routing (similarity 0.75-0.85)
- Related to PRD requirement 27"

# Bug fix
git commit -m "fix(webhooks): resolve timeout on high traffic

- Increased response timeout from 500ms to 1000ms
- Added async processing for large payloads
- Improved error handling for connection issues"

# Configuration change
git commit -m "config(redis): optimize cache TTL settings

- Set query cache TTL to 1 hour (3600s)
- Configured rate limit window to 60 seconds
- Updated memory policy to allkeys-lru"

# Documentation
git commit -m "docs(api): add Freshdesk API integration guide

- Document webhook setup procedures
- Add authentication configuration
- Include rate limit information"
```

## Pull Request Process

### Creating a Pull Request

1. **Ensure your branch is up to date:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout your-feature-branch
   git merge develop
   # Resolve any conflicts
   ```

2. **Push your branch:**
   ```bash
   git push origin your-feature-branch
   ```

3. **Create PR on GitHub/GitLab:**
   - Title: Clear, descriptive summary
   - Description: What changes were made and why
   - Link related issues or tasks
   - Add reviewers
   - Add labels (feature, bugfix, etc.)

### PR Template

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Configuration change
- [ ] Documentation update
- [ ] Breaking change

## Related Tasks
- Task 5.3: Implement Path 2 Auto-Refine routing
- Related to PRD requirement #27

## Changes Made
- Added Claude self-refine workflow nodes
- Configured 3-iteration process
- Updated decision engine thresholds

## Testing
- [ ] Tested locally with Docker
- [ ] Validated with sample tickets
- [ ] All existing workflows still function
- [ ] No breaking changes to APIs

## Checklist
- [ ] Code follows project conventions
- [ ] Commit messages follow conventional commits
- [ ] Documentation updated (if needed)
- [ ] Environment variables added to .env.example (if needed)
- [ ] Tested in development environment
```

### Review Process

- At least 1 reviewer approval required
- All automated tests must pass
- No merge conflicts
- Branch must be up-to-date with target branch

## Version Tagging

### Semantic Versioning

Follow [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

- **MAJOR:** Incompatible API changes
- **MINOR:** New functionality (backwards compatible)
- **PATCH:** Bug fixes (backwards compatible)

### Creating Releases

```bash
# Tag a release
git checkout main
git tag -a v1.0.0 -m "Release v1.0.0: Initial production deployment

- Complete NSW strata automation workflows
- All 8 categories implemented
- Progressive learning system operational
- Tested with 100+ tickets in staging"

# Push tag
git push origin v1.0.0

# Create release notes on GitHub
```

### Release Naming Convention

- **v0.1.0** - Initial development release
- **v0.5.0** - Staging validation release
- **v1.0.0** - Production launch
- **v1.1.0** - Minor feature additions
- **v1.1.1** - Patch/bugfix

## Knowledge Base Versioning

Knowledge base entries are stored as Markdown files in Git:

```bash
knowledge/
├── maintenance-repairs/
│   ├── common-property/
│   │   └── 001-roof-leak.md
│   └── emergency/
│       └── 001-fire-safety-issue.md
├── by-law-compliance/
│   ├── noise/
│   │   └── 001-late-night-noise.md
│   └── pets/
│       └── 001-unauthorized-pet.md
```

### Knowledge Entry Format

Each entry includes YAML frontmatter:

```markdown
---
id: 001-roof-leak
title: Roof Leak in Common Property
category: maintenance-repairs
subcategory: common-property
created: 2024-10-14
updated: 2024-10-14
author: system
status: active
success_rate: 0.95
version: 1.0.0
---

# Roof Leak in Common Property

## Issue Description
[Content...]
```

### Committing Knowledge Changes

```bash
# Add new knowledge entry
git add knowledge/maintenance-repairs/common-property/001-roof-leak.md

git commit -m "docs(knowledge): add roof leak handling procedure

- Added NSW legal context (SSMA Section 106)
- Documented solution steps
- Included stakeholder responsibilities
- Success rate: 95% (based on 20 historical tickets)"

# Update existing entry
git commit -m "docs(knowledge): update roof leak success rate

- Updated success rate: 0.92 → 0.95
- Refined solution steps based on feedback
- Added prevention advice"
```

## Working with Multiple Environments

### Environment-Specific Workflows

Workflows may have environment-specific variations:

```
workflows/
├── main-ticket-processor.json              # Base workflow
├── main-ticket-processor.staging.json      # Staging overrides
└── main-ticket-processor.production.json   # Production overrides
```

### Workflow Promotion

```bash
# Test in development
cp workflows/main-ticket-processor.json workflows/main-ticket-processor.staging.json
# Make staging-specific adjustments
git add workflows/main-ticket-processor.staging.json
git commit -m "config(staging): prepare main processor for staging validation"

# After 2-week validation, promote to production
cp workflows/main-ticket-processor.staging.json workflows/main-ticket-processor.production.json
# Make production-specific adjustments
git add workflows/main-ticket-processor.production.json
git commit -m "config(production): promote main processor to production"
```

## Backup and Recovery

### Automated Backups

Daily automated exports to Git:

```bash
# Automated backup script (run daily via cron)
#!/bin/bash
cd /path/to/nsw-strata-automation
n8n export:workflow --all --output=./workflows
git add workflows/
git commit -m "chore(backup): automated workflow backup $(date +%Y-%m-%d)"
git push origin backup/$(date +%Y-%m-%d)
```

### Recovery

```bash
# Restore from a specific commit
git checkout abc123 -- workflows/main-ticket-processor.json

# Restore from a tag
git checkout v1.0.0 -- workflows/

# Import to n8n
n8n import:workflow --input=./workflows/main-ticket-processor.json
```

## Best Practices

1. **Commit frequently** - Small, focused commits are easier to review and revert
2. **Write descriptive messages** - Future you will thank present you
3. **Test before committing** - Ensure workflows function correctly
4. **Keep branches short-lived** - Merge frequently to avoid conflicts
5. **Never commit secrets** - Use environment variables and .gitignore
6. **Review your own PRs first** - Check diff before requesting review
7. **Use .gitignore** - Keep repository clean of generated files
8. **Document breaking changes** - Update CHANGELOG.md
9. **Tag releases** - Makes rollback easier
10. **Backup regularly** - Automated daily exports to Git

## Getting Help

- **Git issues:** Check Git documentation or ask team
- **Workflow errors:** Test locally first, check n8n logs
- **Merge conflicts:** Resolve carefully, test afterwards
- **Lost commits:** `git reflog` can help recover

## Additional Resources

- [Git Documentation](https://git-scm.com/doc)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [n8n Workflow Documentation](https://docs.n8n.io/)
- [Semantic Versioning](https://semver.org/)
