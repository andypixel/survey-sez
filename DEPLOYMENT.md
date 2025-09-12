# Production Deployment Guide

## Overview
Survey-Sez is deployed on Railway with Redis database and automatic CI/CD from GitHub.

## Production Environment

### Infrastructure
- **Platform**: Railway (railway.app)
- **Runtime**: Node.js 20.x with npm 9.x
- **Database**: Redis (Railway-managed instance)
- **Domain**: Auto-generated `.railway.app` subdomain
- **SSL**: Automatic HTTPS via Railway

### Environment Variables
| Variable | Value | Source |
|----------|-------|--------|
| `NODE_ENV` | `production` | Manual |
| `REDIS_URL` | `redis://...` | Auto-generated |
| `PORT` | Auto-assigned | Railway |

## Initial Setup

### 1. Railway Account Setup
```bash
# Install Railway CLI (optional)
npm install -g @railway/cli
railway login
```

### 2. Create New Project
1. Go to [railway.app](https://railway.app)
2. Sign up/login with GitHub account
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your survey-sez repository
5. Choose production environment

### 3. Add Redis Database
1. In Railway project dashboard
2. Click "New" → "Database" → "Redis"
3. Wait for provisioning (1-2 minutes)
4. `REDIS_URL` automatically added to app environment

### 4. Configure Environment
1. Go to app service (not Redis service)
2. Click "Variables" tab
3. Add variable: `NODE_ENV` = `production`
4. Verify `REDIS_URL` is present

### 5. Generate Public Domain
1. App service → Settings → Networking
2. Click "Generate Domain"
3. Note the generated URL (e.g., `survey-sez-production.railway.app`)

## Deployment Process

### Automatic Deployment
- **Trigger**: Push to `main` branch on GitHub
- **Build Time**: 2-3 minutes
- **Process**:
  1. Railway detects changes
  2. Pulls latest code
  3. Runs `npm ci` (install dependencies)
  4. Runs `npm run build` (builds React frontend)
  5. Starts server with `npm start`
  6. Health check on startup

### Manual Deployment
```bash
# Using Railway CLI
railway link  # Link to existing project
railway deploy
```

### Build Configuration
Railway uses `railway.json` for deployment settings:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start"
  }
}
```

## Database Management

### Redis Structure
```
categories          # JSON string - all category data
room:{roomId}       # JSON string - individual room state  
user:{userId}       # JSON string - user session data
```

### Data Initialization
Production data is automatically initialized on first startup:
- 70 universal categories loaded
- Empty rooms and users collections
- Used category tracking initialized

### Database Access
- **Internal**: App connects via `REDIS_URL` environment variable
- **External**: Not directly accessible (Railway internal network)
- **Debugging**: Use `/admin` endpoints on deployed app

## Monitoring & Debugging

### Railway Dashboard
- **Logs**: Deployments → View Logs
- **Metrics**: CPU, Memory, Network usage
- **Variables**: Environment variable management
- **Deployments**: Build history and status

### Application Endpoints
| Endpoint | Purpose | Access |
|----------|---------|--------|
| `/admin` | Admin dashboard | Public |
| `/debug/state` | App state (JSON) | Public |
| `/debug/pretty` | App state (HTML) | Public |
| `/debug/redis-safe` | DB overview (no spoilers) | Production only |
| `/debug/redis` | Full DB contents | Production only |

### Log Analysis
```bash
# Using Railway CLI
railway logs --follow

# Common log patterns to watch for:
# "Server running on port" - Successful startup
# "Redis error" - Database connection issues
# "User connected/disconnected" - WebSocket activity
# "Game started in room" - Gameplay events
```

## Troubleshooting

### Common Issues

#### Build Failures
- **Symptom**: Deployment fails during build
- **Check**: Railway build logs for npm/React build errors
- **Fix**: Ensure all dependencies in `package.json`, fix build errors locally first

#### App Won't Start
- **Symptom**: Build succeeds but app doesn't respond
- **Check**: Runtime logs for startup errors
- **Fix**: Verify `NODE_ENV=production` is set, check Redis connection

#### Redis Connection Errors
- **Symptom**: "ECONNREFUSED" or "Redis error" in logs
- **Check**: Redis service status in Railway dashboard
- **Fix**: Restart Redis service, verify `REDIS_URL` is correct

#### 404 Errors on Routes
- **Symptom**: React routes return 404
- **Check**: Static file serving configuration
- **Fix**: Ensure React build completed, check Express static middleware

### Emergency Procedures

#### Rollback Deployment
```bash
# Via Railway dashboard
1. Go to Deployments tab
2. Find previous working deployment
3. Click "Redeploy"

# Via CLI
railway rollback
```

#### Database Reset
```bash
# Access admin panel
https://your-app.railway.app/admin

# Click "Reinitialize Categories" to reset to defaults
# Note: This will lose all game data
```

#### Force Restart
```bash
# Via Railway CLI
railway restart

# Via dashboard
# App service → Settings → Restart
```

## Security Considerations

### Environment Variables
- Never commit `REDIS_URL` or other secrets to git
- Use Railway's variable management system
- Rotate Redis credentials if compromised

### Network Security
- Railway provides automatic HTTPS
- Redis is on internal network (not publicly accessible)
- No additional firewall configuration needed

### Application Security
- Debug endpoints are production-only
- No authentication on admin endpoints (consider adding for sensitive operations)
- WebSocket connections are stateless and session-based

## Scaling Considerations

### Current Limits
- Single Railway instance (vertical scaling only)
- Redis shared across all rooms
- In-memory room state (doesn't persist across restarts)

### Scaling Options
1. **Vertical**: Upgrade Railway plan for more CPU/memory
2. **Horizontal**: Multiple app instances sharing Redis (requires session store changes)
3. **Database**: Separate Redis instances for different data types
4. **CDN**: Add CloudFlare or similar for static asset delivery

### Performance Monitoring
- Monitor Railway metrics for CPU/memory usage
- Watch Redis memory usage and connection counts
- Track WebSocket connection counts and room activity
- Set up alerts for error rates and response times

## Backup & Recovery

### Data Backup
- Redis data persists automatically on Railway
- No manual backup process currently implemented
- Consider implementing periodic Redis dumps for critical data

### Disaster Recovery
1. **Code**: All code in GitHub (source of truth)
2. **Database**: Railway handles Redis persistence and backups
3. **Configuration**: Environment variables documented here
4. **Recovery Time**: ~10 minutes to redeploy from scratch

## Cost Management

### Railway Pricing (as of deployment)
- **Hobby Plan**: $5/month for app + database
- **Usage-based**: Additional charges for high CPU/memory usage
- **Free Tier**: 500 hours/month (sufficient for development)

### Cost Optimization
- Monitor usage in Railway dashboard
- Implement auto-scaling policies
- Consider upgrading only when needed
- Use development environment for testing to minimize production usage