# CSV Upload Guide

This guide explains how to use CSV files to bulk upload data to the Weekly Rota Allocator.

## Operators CSV Format

Use this format to bulk upload operators with their skill capabilities.

### CSV Structure

```csv
Name,FLT,Canning,MAB1,MAB2,Corona,Kegging Inside,Kegging Outside,Keg Loading,WMS,SAP,SAY,Packaging,Loaders,Pilots,SAP VL31N,SAP VT01N,SAP VL71,SAP VL33N,SAP VL03N,SAP VT03N,SAP COR3,SAP ZC30
John Smith,C,S,B,B,N,C,C,C,S,C,B,N,C,B,B,B,N,C,C,B,N,B
Jane Doe,S,C,N,N,B,N,N,B,C,S,C,B,S,C,C,C,B,B,B,C,B,C
```

### Field Descriptions

| Field | Required | Values | Description |
|-------|----------|--------|-------------|
| Name | Yes | Text | Operator's full name |
| FLT | No | N/B/C/S | Forklift skill level |
| Canning | No | N/B/C/S | Canning line skill level |
| MAB1 | No | N/B/C/S | MAB1 line skill level |
| MAB2 | No | N/B/C/S | MAB2 line skill level |
| Corona | No | N/B/C/S | Corona line skill level |
| Kegging Inside | No | N/B/C/S | Kegging inside skill level |
| Kegging Outside | No | N/B/C/S | Kegging outside skill level |
| Keg Loading | No | N/B/C/S | Keg loading skill level |
| WMS | No | N/B/C/S | Warehouse Management System skill level |
| SAP | No | N/B/C/S | SAP system skill level |
| SAY | No | N/B/C/S | SAY system skill level |
| Packaging | No | N/B/C/S | Packaging skill level |
| Loaders | No | N/B/C/S | Loaders skill level |
| Pilots | No | N/B/C/S | Pilots skill level |
| SAP VL31N | No | N/B/C/S | Create inbound delivery |
| SAP VT01N | No | N/B/C/S | Create shipment |
| SAP VL71 | No | N/B/C/S | Reprint delivery notes |
| SAP VL33N | No | N/B/C/S | Display inbound delivery |
| SAP VL03N | No | N/B/C/S | Display outbound delivery |
| SAP VT03N | No | N/B/C/S | Display outbound shipment |
| SAP COR3 | No | N/B/C/S | Display process order |
| SAP ZC30 | No | N/B/C/S | Progress monitor/yield reports |

### Skill Level Ratings

- **N** - None (no skill in this area)
- **B** - Basic (beginner level)
- **C** - Competent (proficient)
- **S** - Specialist (expert level)

### SAP Transaction Skills by Role

The SAP transaction fields track specific SAP system competencies. Different transactions are typically associated with different job areas:

**Packaging Transactions:**
- **VL31N** - Create inbound delivery
- **VT01N** - Create shipment

**Distop/Pilot Transactions:**
- **VL71** - Reprint delivery notes
- **VL33N** - Display inbound delivery
- **VL03N** - Display outbound delivery
- **VT03N** - Display outbound shipment
- **COR3** - Display process order
- **ZC30** - Progress monitor/yield reports
- **VL31N** - Create inbound delivery (shared with Packaging)
- **VT01N** - Create shipment (shared with Packaging)

These transaction skills help identify operators who can perform specific SAP-dependent tasks and support training planning to develop broader SAP competencies across the team.

### How to Upload

1. Go to the **Operators** page
2. Click **Download CSV Template** to get a template file
3. Fill in your operator data following the format above
4. Save the file as a `.csv` file
5. Click **Upload CSV** and select your file
6. The system will import all operators and their capabilities

## Staff Plan CSV Format

Use this format to bulk upload weekly staff availability data.

### CSV Structure

```csv
Week Commencing,Operator Name,Day1,Day2,Night1,Night2
2026-01-06,John Smith,Y,Y,Y,H
2026-01-06,Jane Doe,Y,H,Y,Y
2026-01-06,Bob Wilson,Y,Y,H,H
```

### Field Descriptions

| Field | Required | Values | Description |
|-------|----------|--------|-------------|
| Week Commencing | Yes | Date (YYYY-MM-DD) | Monday of the target week |
| Operator Name | Yes | Text | Must match an existing operator name exactly |
| Day1 | No | Y/H | First day availability (Y=Working, H=Holiday) |
| Day2 | No | Y/H | Second day availability |
| Night1 | No | Y/H | First night availability |
| Night2 | No | Y/H | Second night availability |

### Availability Codes

- **Y** - Working (operator is available)
- **H** - Holiday (operator is unavailable/on holiday)

### How to Upload

1. Go to the **Staff Plan** page
2. Select the week you want to upload data for
3. Click **Download CSV Template** to get a template with the correct week
4. Fill in availability for each operator
5. Save the file as a `.csv` file
6. Click **Upload CSV** and select your file
7. The system will import all staff availability data

## Important Notes

- Operator names in the Staff Plan CSV must match existing operators exactly (case-insensitive)
- If an operator doesn't exist, that row will be skipped with a warning
- Week Commencing dates should be Mondays
- All dates should be in YYYY-MM-DD format
- CSV files should use standard comma delimiters
- If you need to include commas in names, wrap the field in double quotes

## Tips

- Download the template files first to ensure correct formatting
- Test with a small batch of data first
- Check the browser console for any import errors or warnings
- The upload will skip invalid rows and continue with valid ones
- After uploading operators, you can edit their skills individually on the Operators page
- After uploading staff plans, you can adjust availability individually on the Staff Plan page
