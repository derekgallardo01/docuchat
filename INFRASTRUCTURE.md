# Infrastructure — DocuChat

## Monthly Cost: ~$90/month idle

## Quick Shutdown
```powershell
# Delete AI Search ($75/month) — the biggest cost
az group delete --name ragchat-rg --yes --no-wait

# Delete SQL Database ($15/month) — on shared server in rg-operations-tracker
az sql db delete --server rg-operations-tracker-server-2 --resource-group rg-operations-tracker --name docuchat-db --yes
```

## Azure Resources

**Resource Group 1:** `ragchat-rg` (westus2)

| Resource | Type | SKU | Monthly Cost |
|----------|------|-----|-------------|
| docuchat-search-dg | Azure AI Search | **Basic** | **~$75** |

**Resource Group 2:** `rg-operations-tracker` (eastus) — **SHARED** with business-operations-tracker

| Resource | Type | SKU | Monthly Cost |
|----------|------|-----|-------------|
| docuchat-db | SQL Database (on shared server) | Standard S0 | **~$15** |

## Cost Saving Tips
- Azure AI Search has **no free tier** for persistent indexes. The Basic tier ($75/month) is the minimum.
- Delete the search service when not actively developing. Re-index when you resume (~10-15 min).
- The SQL S0 ($15/month) can be downgraded to Basic ($5/month) if query performance isn't critical.

## Recreation Steps

```powershell
# 1. Create resource group for AI Search
az group create --name ragchat-rg --location westus2

# 2. Create AI Search service
az search service create --name docuchat-search-dg --resource-group ragchat-rg --sku basic --location westus2

# 3. Create SQL Database (on shared server — must exist first)
# Prerequisites: rg-operations-tracker resource group and SQL server must exist
az sql db create --server rg-operations-tracker-server-2 --resource-group rg-operations-tracker --name docuchat-db --service-objective S0

# 4. Add SQL firewall rule if needed
az sql server firewall-rule create --resource-group rg-operations-tracker --server rg-operations-tracker-server-2 --name AllowMyIP --start-ip-address <YOUR-IP> --end-ip-address <YOUR-IP>

# 5. Run SQL schema scripts from the repo
# 6. Re-index documents into AI Search (see repo setup instructions)
# 7. Update app configuration with Search API key and SQL connection string
```
