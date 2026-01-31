/**
 * listFilesInFolderBatch()
 *
 * - Mục đích: Lấy thông tin file từ thư mục Google Drive và ghi vào Google Sheet, nhưng được tối ưu để xử lý số lượng file lớn bằng cách chia nhỏ công việc.
 * - Tính năng nổi bật:
 *   1. Chia nhỏ công việc: Mỗi lần chỉ xử lý một số lượng file tối đa (được thiết lập là 100) để tránh lỗi thời gian thực thi của Google Apps Script.
 *   2. Lưu và khôi phục trạng thái: Sử dụng PropertiesService để lưu trạng thái của file cuối cùng đã xử lý, cho phép tiếp tục từ file còn lại trong lần chạy sau.
 *   3. Kiểm tra và tránh trùng lặp: Kiểm tra nếu file đã được ghi vào Google Sheet trước khi ghi để tránh việc ghi trùng lặp thông tin file.
 *   4. Tự động xóa trigger và trạng thái: Sau khi tất cả các file đã được xử lý, hàm sẽ tự động xóa các trạng thái và trigger không cần thiết để tránh lãng phí tài nguyên.
 *   5. Thông báo chi tiết: Ghi log về những property và trigger đã được xóa, giúp người dùng theo dõi trạng thái của hệ thống.
 * - Chức năng chính:
 *   - Nếu Google Sheet chưa có dữ liệu, thiết lập hàng tiêu đề.
 *   - Lấy danh sách tất cả các file trong thư mục và sắp xếp theo tên để đảm bảo thứ tự xử lý nhất quán.
 *   - Lưu trạng thái của file cuối cùng đã xử lý để sử dụng trong lần chạy tiếp theo.
 *   - Duyệt qua danh sách file và ghi thông tin vào Google Sheet.
 *   - Nếu đạt đến giới hạn số file cần xử lý, lưu trạng thái và thoát khỏi hàm.
 *   - Khi tất cả các file đã được xử lý, xóa các property và trigger không cần thiết.
 * - Ưu điểm so với Version 1:
 *   1. Xử lý hiệu quả số lượng file lớn nhờ chia nhỏ công việc thành các lô (batch).
 *   2. Tránh lặp lại các file đã ghi và duy trì trạng thái để xử lý liên tục.
 *   3. Tự động xóa các trigger và property để tránh dư thừa tài nguyên sau khi hoàn thành.
 */

function listFilesInFolderBatch() {
  var folderId = '1DIdrik-vZEaoMHKdrPMXXIpk'; // Folder ID đã được thay thế
  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFiles();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Nếu sheet trống (chưa có dữ liệu), đặt header
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['File Name', 'File Type', 'Size (MB)', 'Video ID', 'Location (Full Path)', 'Created Date', 'Modified Date', 'Sharing Link', 'Permissions', 'Download URL']);
  }

  // Khai báo thời gian thực thi tối đa và thời điểm bắt đầu
  var maxExecutionTime = 5.5 * 60 * 1000; // 5.5 phút để giữ lại dư thời gian lưu trạng thái
  var startTime = new Date().getTime();

  // Initialize counters for tracking success and failure
  var totalFiles = 0;
  var successCount = 0;
  //var failedFiles = [];
  var processed = 0;
  var maxFilesPerRun = 300; // Thêm giới hạn số tệp xử lý mỗi lần chạy để tránh lỗi thời gian thực thi quá giới hạn

  // Lấy trạng thái đã xử lý từ PropertiesService
  var properties = PropertiesService.getScriptProperties();
  var failedFiles = JSON.parse(properties.getProperty('failedFiles') || '[]');
  var lastProcessedFileIndex = parseInt(properties.getProperty('lastProcessedFileIndex') || '0');
  var cumulativeTotalFiles = parseInt(properties.getProperty('cumulativeTotalFiles') || '0');
  var cumulativeSuccessCount = parseInt(properties.getProperty('cumulativeSuccessCount') || '0');

  // Get list of all files in the folder
  var allFiles = [];
  while (files.hasNext()) {
    allFiles.push(files.next());
  }

  // Sort files by name to ensure consistent order
  allFiles.sort(function(a, b) {
    return a.getName().localeCompare(b.getName());
  });

  // Iterate through files starting from the last processed index
  for (var i = lastProcessedFileIndex; i < allFiles.length; i++) {
    var file = allFiles[i];
    totalFiles++;

    try {
      var fileName = file.getName();
      var fileType = file.getMimeType();
      var fileSizeMB = (file.getSize() / (1024 * 1024)).toFixed(2); // Chuyển đổi từ bytes sang MB và làm tròn 2 chữ số thập phân
      var createdDate = file.getDateCreated();
      var modifiedDate = file.getLastUpdated();
      var fullPath = getFullPath(file); // Lấy đường dẫn đầy đủ của file
    
      // Kiểm tra nếu quyền chia sẻ chưa được thiết lập hoặc đang là PRIVATE
      if (file.getSharingAccess() == DriveApp.Access.NONE || file.getSharingAccess() == DriveApp.Access.PRIVATE) {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); // Thiết lập quyền chỉ xem
      }
    
      // Lấy liên kết chia sẻ và Video ID
      var sharingLink = file.getUrl();
      var videoID = extractVideoID(sharingLink); // Lấy video ID từ URL
    
      var permissions = file.getSharingAccess();
    
      // Lấy URL tải xuống
      var downloadUrl = file.getDownloadUrl();

      // Chèn thông tin file vào sheet nếu chưa tồn tại
      if (!isFileAlreadyLogged(sheet, fileName)) {
        sheet.appendRow([fileName, fileType, fileSizeMB, videoID, fullPath, createdDate, modifiedDate, sharingLink, permissions, downloadUrl]);
        successCount++;
      } else {
        Logger.log(fileName + '- không được thêm vào do bị trùng');
      }
      
      processed++;
    } catch (error) {
      // Thêm lỗi vào mảng failedFiles và lưu vào PropertiesService
      failedFiles.push({ fileName: file.getName(), error: error.message });
      properties.setProperty('failedFiles', JSON.stringify(failedFiles));
    }

    // Nếu đã đạt đến giới hạn tệp xử lý mỗi lần chạy, lưu trạng thái và thoát khỏi hàm
    if (processed >= maxFilesPerRun) {
      properties.setProperty('lastProcessedFileIndex', i + 1);
      properties.setProperty('cumulativeTotalFiles', cumulativeTotalFiles + totalFiles);
      properties.setProperty('cumulativeSuccessCount', cumulativeSuccessCount + successCount);


      Logger.log('--- REACHING MAX FILES PER RUN ---');
      Logger.log('Current total files processed: ' + (cumulativeTotalFiles + totalFiles));

      // Log detailed information of failed files
      if (failedFiles.length > 0) {
        Logger.log('Details of failed files:');
        failedFiles.forEach(function(failedFile) {
          Logger.log('File Name: ' + failedFile.fileName + ', Error: ' + failedFile.error);
        });
      }
      return;
    }

    // Check execution time limit and save state if approaching limit
    if (new Date().getTime() - startTime > maxExecutionTime) {
      properties.setProperty('lastProcessedFileIndex', i + 1);
      properties.setProperty('cumulativeTotalFiles', cumulativeTotalFiles + totalFiles);
      properties.setProperty('cumulativeSuccessCount', cumulativeSuccessCount + successCount);

      Logger.log('--- EXCEED TIME EXECUTION ---');
      Logger.log('Current total files processed: ' + (cumulativeTotalFiles + totalFiles));

      // Log detailed information of failed files
      if (failedFiles.length > 0) {
        Logger.log('Details of failed files:');
        failedFiles.forEach(function(failedFile) {
          Logger.log('File Name: ' + failedFile.fileName + ', Error: ' + failedFile.error);
        });
      }
      return;
    }
  }

  // Cập nhật tổng số file và số file thành công sau khi hoàn thành
  properties.setProperty('cumulativeTotalFiles', cumulativeTotalFiles + totalFiles);
  properties.setProperty('cumulativeSuccessCount', cumulativeSuccessCount + successCount);

  // Log the summary to the console
  Logger.log('--- COMPLETED ---')
  Logger.log('Total files processed: ' + (cumulativeTotalFiles + totalFiles));
  Logger.log('Successfully processed: ' + (cumulativeSuccessCount + successCount));
  Logger.log('Failed files: ' + (totalFiles - successCount));

  // Log detailed information of failed files
  if (failedFiles.length > 0) {
    Logger.log('Details of failed files:');
    failedFiles.forEach(function(failedFile) {
      Logger.log('File Name: ' + failedFile.fileName + ', Error: ' + failedFile.error);
    });
  }
  
  // Xóa trạng thái sau khi hoàn thành hết
  properties.deleteProperty('lastProcessedFileIndex');
  properties.deleteProperty('cumulativeTotalFiles');
  properties.deleteProperty('cumulativeSuccessCount');
  properties.deleteProperty('failedFiles');
  Logger.log('Deleted all properties');

  // Xóa trigger khi tất cả các tệp đã được xử lý xong
  deleteTriggers();
}

// Function to extract video ID from the sharing link
function extractVideoID(url) {
  var videoID = url.split('/d/')[1].split('/')[0]; // Lấy ID từ URL theo định dạng /d/<ID>/
  return videoID;
}

// Function to get full path of the file
function getFullPath(file) {
  var folders = [];
  var parentFolders = file.getParents();
  
  while (parentFolders.hasNext()) {
    var folder = parentFolders.next();
    folders.push(folder.getName()); // Thêm tên từng thư mục vào danh sách
    parentFolders = folder.getParents(); // Lấy thư mục cha của thư mục hiện tại
  }
  
  // Đảo ngược thứ tự để bắt đầu từ gốc
  folders.reverse();
  
  // Nối tên thư mục để tạo đường dẫn đầy đủ
  var fullPath = folders.join('/');
  
  return fullPath;
}

// Function to check if a file is already logged in the sheet
function isFileAlreadyLogged(sheet, fileName) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) { // Bỏ qua dòng tiêu đề
    if (data[i][0] === fileName) {
      return true;
    }
  }
  return false;
}

// Function to delete all triggers
function deleteTriggers() {
  var allTriggers = ScriptApp.getProjectTriggers();
  if (allTriggers.length === 0) {
    Logger.log('No triggers found to delete.');
  }
  
  allTriggers.forEach(function(trigger) {
    Logger.log('Deleting trigger: ' + trigger.getHandlerFunction());
    ScriptApp.deleteTrigger(trigger);
  });
}
