# Google Drive File Lister - Batch Processing

A Google Apps Script that exports file information from a Google Drive folder to Google Sheets with optimized batch processing for handling large numbers of files.

## Features

- **Batch Processing**: Processes files in batches (default: 300 files per run) to avoid Google Apps Script's 6-minute execution limit
- **State Persistence**: Automatically saves progress using `PropertiesService`, allowing you to resume from where you left off
- **Duplicate Prevention**: Checks if a file is already logged before adding it to the sheet
- **Auto Sharing**: Automatically sets sharing permissions to "Anyone with link can view" for private files
- **Detailed Logging**: Tracks successful and failed file operations with comprehensive logs
- **Auto Cleanup**: Removes triggers and saved states after completion

## Exported Data

The script exports the following information for each file:

| Column | Description |
|--------|-------------|
| File Name | Name of the file |
| File Type | MIME type (e.g., `video/mp4`, `application/pdf`) |
| Size (MB) | File size in megabytes |
| Video ID | Extracted ID from the Google Drive URL |
| Location (Full Path) | Complete folder path from root |
| Created Date | File creation date |
| Modified Date | Last modification date |
| Sharing Link | Google Drive sharing URL |
| Permissions | Current sharing access level |
| Download URL | Direct download link |

## Setup Instructions

### Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Give it a meaningful name (e.g., "Drive File Inventory")

### Step 2: Open Google Apps Script

1. In your Google Sheet, click **Extensions** → **Apps Script**
2. A new Apps Script editor window will open

### Step 3: Add the Script

1. In the Apps Script editor, you'll see a file named `Code.gs`
2. Delete any default code in this file
3. Copy and paste the contents of `Code.gs` from this repository

### Step 4: Configure the Folder ID

1. Find your target folder's ID from its Google Drive URL:
   ```
   https://drive.google.com/drive/folders/YOUR_FOLDER_ID_HERE
   ```
2. In the script, replace the `folderId` value:
   ```javascript
   var folderId = 'YOUR_FOLDER_ID_HERE';
   ```
3. Save the script (**Ctrl+S** or **Cmd+S**)

### Step 5: Run the Script

1. Select `listFilesInFolderBatch` from the function dropdown
2. Click the **Run** button (▶️)
3. **First run only**: You'll be prompted to authorize the script
   - Click **Review Permissions**
   - Select your Google account
   - Click **Advanced** → **Go to [Project Name]**
   - Click **Allow**

### Step 6: Check Results

- Return to your Google Sheet to see the exported file data
- Check the **Execution log** (View → Execution log) for progress details

## Handling Large Folders

For folders with many files (hundreds or thousands), the script uses batch processing:

### How It Works

1. The script processes up to **300 files** per run
2. Progress is automatically saved after each batch
3. If time limit is approaching (~5.5 minutes), the script saves state and exits
4. **Run the script again** to continue from where it left off
5. Repeat until you see `--- COMPLETED ---` in the logs

### Monitoring Progress

Check the execution log for status messages:

| Message | Meaning |
|---------|---------|
| `--- REACHING MAX FILES PER RUN ---` | Batch limit reached, run again to continue |
| `--- EXCEED TIME EXECUTION ---` | Time limit approaching, run again to continue |
| `--- COMPLETED ---` | All files have been processed |

## Automation with Triggers

You can set up automatic runs using Google Apps Script triggers:

### Setting Up a Time-Based Trigger

1. In the Apps Script editor, click the **clock icon** (Triggers) in the left sidebar
2. Click **+ Add Trigger**
3. Configure:
   - **Function**: `listFilesInFolderBatch`
   - **Event source**: Time-driven
   - **Type**: Choose your preferred frequency (e.g., every 10 minutes for large folders)
4. Click **Save**

### Recommended Trigger Settings for Large Folders

- Set trigger to run every **10 minutes** until completion
- The script will automatically delete all triggers once processing is complete

## Limitations

| Resource | Limit |
|----------|-------|
| Script execution time | 6 minutes per run |
| Google Sheet cells | ~10 million cells |
| Daily Drive API calls | Varies by account type |

## Troubleshooting

### "Exceeded maximum execution time"
- This is normal for large folders
- Simply run the script again - it will resume from where it stopped

### Files not appearing in the sheet
- Check if the file was already logged (duplicate prevention is active)
- Review the execution log for any error messages

### Permission errors
- Ensure you have access to the target folder
- Re-authorize the script if permissions were revoked

## License

This project is open source and available for personal and commercial use.
