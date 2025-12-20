
// --- CONFIGURATION ---
var SCRIPT_PROP = PropertiesService.getScriptProperties();

// Sheets Setup
function setup() {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    SCRIPT_PROP.setProperty("key", doc.getId());
}

// --- DO GET ---
function doGet(e) {
    return handleRequest(e);
}

// --- DO POST ---
function doPost(e) {
    return handleRequest(e);
}

// --- HANDLE REQUEST ---
function handleRequest(e) {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);

    try {
        var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
        var action = e.parameter.action;

        // 1. INVENTORY ACTIONS
        if (action === "getInventory") {
            return getInventory(doc);
        } else if (action === "addStock") {
            return addStock(doc, e.parameter);
        } else if (action === "useStock") {
            return useStock(doc, e.parameter);
        } else if (action === "getColors") {
            return getColors(doc);
        } else if (action === "addColor") {
            return addColor(doc, e.parameter);
        } else if (action === "deleteColor") {
            return deleteColor(doc, e.parameter);

            // 2. EMPLOYEE ACTIONS
        } else if (action === "getEmployees") {
            return getEmployees(doc);
        } else if (action === "addEmployee") {
            return addEmployee(doc, e.parameter);
        } else if (action === "deleteEmployee") {
            return deleteEmployee(doc, e.parameter);
        } else if (action === "updateEmployee") {
            return updateEmployee(doc, e.parameter);
        } else if (action === "markAttendance") {
            return markAttendance(doc, e.parameter);
        } else if (action === "getAttendance") {
            return getAttendance(doc, e.parameter);
        } else if (action === "login") {
            return handleLogin(e.parameter);
        } else if (action === "savePayment") {
            return savePayment(doc, e.parameter);
        } else if (action === "getPayments") {
            return getPayments(doc, e.parameter);
        }

        // Default
        return ContentService
            .createTextOutput(JSON.stringify({ "result": "error", "error": "Invalid action" }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (e) {
        return ContentService
            .createTextOutput(JSON.stringify({ "result": "error", "error": e.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    } finally {
        lock.releaseLock();
    }
}

// --- HELPER FUNCTIONS ---

// --- INVENTORY FUNCTIONS ---

function getInventory(doc) {
    var sheet = doc.getSheetByName("Inventory");
    if (!sheet) return jsonResponse({ "inventory": [] });
    var rows = sheet.getDataRange().getValues();

    // Aggregate stock by color
    var stockMap = {};

    // Start from 1 to skip header
    for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        var color = String(row[0]).trim(); // Normalize color name
        // Ensure quantity is treated as number (handle "-5" etc)
        var quantity = parseFloat(row[1]);
        if (isNaN(quantity)) quantity = 0;

        if (!stockMap[color]) {
            stockMap[color] = 0;
        }
        stockMap[color] += quantity;
    }

    var data = [];
    for (var color in stockMap) {
        data.push({
            "color": color,
            "quantity": stockMap[color]
        });
    }

    return jsonResponse({ "inventory": data });
}

function addStock(doc, params) {
    var sheet = doc.getSheetByName("Inventory");
    if (!sheet) {
        sheet = doc.insertSheet("Inventory");
        sheet.appendRow(["color", "quantity", "notes", "timestamp"]);
    }
    // Append positive quantity
    sheet.appendRow([params.color, params.quantity, params.notes, new Date()]);
    return jsonResponse({ "result": "success" });
}

function useStock(doc, params) {
    var sheet = doc.getSheetByName("Inventory");
    if (!sheet) {
        return jsonResponse({ "error": "Inventory sheet not found" });
    }
    // Append negative quantity for usage
    // Ensure we store it as a number or string that parseFloat can read
    var qty = params.quantity;
    var negQty = (typeof qty === 'number') ? -qty : "-" + qty;

    sheet.appendRow([params.color, negQty, "Used", new Date()]);
    return jsonResponse({ "result": "success" });
}

function getColors(doc) {
    var sheet = doc.getSheetByName("Colors");
    if (!sheet) return jsonResponse({ "colors": [] });
    var rows = sheet.getDataRange().getValues();
    var colors = [];
    if (rows.length > 1) {
        for (var i = 1; i < rows.length; i++) {
            colors.push({ name: rows[i][0], image: rows[i][1] });
        }
    }
    return jsonResponse({ "colors": colors });
}

function addColor(doc, params) {
    var sheet = doc.getSheetByName("Colors");
    if (!sheet) {
        sheet = doc.insertSheet("Colors");
        sheet.appendRow(["name", "image"]);
    }
    sheet.appendRow([params.colorName, params.imageData]);
    return jsonResponse({ "result": "success" });
}

function deleteColor(doc, params) {
    var colorName = params.colorName;
    var result = { "result": "success", "deletedFrom": [] };

    // 1. Delete from Colors sheet
    var colorSheet = doc.getSheetByName("Colors");
    if (colorSheet) {
        var rows = colorSheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
            if (String(rows[i][0]).toLowerCase() === String(colorName).toLowerCase()) {
                colorSheet.deleteRow(i + 1);
                result.deletedFrom.push("Colors");
                break;
            }
        }
    }

    // 2. Delete from Inventory sheet (Optional: Remove this if you want to keep history)
    // For "Available Stock" calculation, if we delete the color master, 
    // the inventory rows might still exist but getInventory aggregates them.
    // However, if the user "Deletes" a color, they likely want it gone from the dashboard.
    // getInventory iterates distinct colors found in Inventory sheet.
    // So if we don't delete from Inventory, it might still show up if it has stock.
    // Let's keep the logic to remove from Inventory as well to be clean.
    var invSheet = doc.getSheetByName("Inventory");
    if (invSheet) {
        var rows = invSheet.getDataRange().getValues();
        // Iterate backwards
        for (var i = rows.length - 1; i >= 1; i--) {
            if (String(rows[i][0]).toLowerCase() === String(colorName).toLowerCase()) {
                invSheet.deleteRow(i + 1);
            }
        }
        result.deletedFrom.push("Inventory");
    }

    return jsonResponse(result);
}

// --- NEW EMPLOYEE FUNCTIONS ---

function getEmployees(doc) {
    var sheet = doc.getSheetByName("Employee List");
    if (!sheet) {
        sheet = doc.insertSheet("Employee List");
        sheet.appendRow(["id", "name", "position", "salaryPerDay", "dateOfJoining", "photo"]);
    }

    var rows = sheet.getDataRange().getValues();
    var headers = rows[0];
    var employees = [];

    if (rows.length > 1) {
        for (var i = 1; i < rows.length; i++) {
            var row = rows[i];
            if (row[0]) { // Check if ID exists (not deleted)
                var emp = {};
                for (var j = 0; j < headers.length; j++) {
                    emp[headers[j]] = row[j];
                }
                employees.push(emp);
            }
        }
    }
    return jsonResponse({ "employees": employees });
}

function addEmployee(doc, params) {
    var sheet = doc.getSheetByName("Employee List");
    if (!sheet) {
        sheet = doc.insertSheet("Employee List");
        sheet.appendRow(["id", "name", "position", "salaryPerDay", "dateOfJoining", "photo"]);
    }

    var id = new Date().getTime().toString(); // Simple ID generation
    sheet.appendRow([
        id,
        params.name,
        params.position,
        params.salaryPerDay,
        params.dateOfJoining,
        params.photo // Base64 string
    ]);

    return jsonResponse({ "result": "success", "id": id });
}

function deleteEmployee(doc, params) {
    var sheet = doc.getSheetByName("Employee List");
    if (!sheet) return jsonResponse({ "error": "Sheet not found" });

    var id = params.id;
    var rows = sheet.getDataRange().getValues();

    for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(id)) {
            sheet.deleteRow(i + 1); // deleteRow is 1-indexed
            return jsonResponse({ "result": "success" });
        }
    }
    return jsonResponse({ "error": "Employee not found" });
}

function markAttendance(doc, params) {
    var sheet = doc.getSheetByName("Attendance");
    if (!sheet) {
        sheet = doc.insertSheet("Attendance");
        sheet.appendRow(["date", "attendanceData"]); // attendanceData sent as JSON string
    }

    var date = params.date;
    var newData = params.attendance; // JSON string like {"emp123": "FULL", "emp456": "HALF"}

    // Check if date already exists to update it
    var rows = sheet.getDataRange().getValues();
    var rowIndex = -1;

    for (var i = 1; i < rows.length; i++) {
        // Basic date comparison (assuming string format YYYY-MM-DD matches)
        // You might need more robust date handling if formats vary
        var rowDate = rows[i][0];
        if (rowDate instanceof Date) {
            // Convert JS Date to YYYY-MM-DD string for comparison if needed
            var isoDate = rowDate.toISOString().split('T')[0];
            if (isoDate === date) {
                rowIndex = i + 1;
                break;
            }
        } else if (String(rowDate) === date) {
            rowIndex = i + 1;
            break;
        }
    }

    if (rowIndex > 0) {
        // Update existing row
        // Merge new data with old data if you want partial updates, or just overwrite
        // Here we overwrite for simplicity, assuming frontend sends full state for that date
        // Or we should parse existing JSON and merge. Let's start with overwrite.
        sheet.getRange(rowIndex, 2).setValue(newData);
    } else {
        // Append new row
        sheet.appendRow([date, newData]);
    }

    return jsonResponse({ "result": "success" });
}

function getAttendance(doc, params) {
    var sheet = doc.getSheetByName("Attendance");
    if (!sheet) return jsonResponse({ "attendance": [] });

    var month = params.month; // "2024-12"
    var rows = sheet.getDataRange().getValues();
    var result = [];

    // Debug: Collect scanned dates to see what the script is actually reading
    var scannedDates = [];

    for (var i = 1; i < rows.length; i++) {
        var rowDate = rows[i][0];
        var dataStr = rows[i][1];
        var dateStr = "";

        if (rowDate instanceof Date) {
            // Use spreadsheet timezone
            dateStr = Utilities.formatDate(rowDate, doc.getSpreadsheetTimeZone(), "yyyy-MM-dd");
        } else {
            // Handle string dates, trim whitespace
            dateStr = String(rowDate).trim();
        }

        // Log first 5 dates for debugging
        if (scannedDates.length < 5) scannedDates.push(dateStr);

        // Filter by Date Range (startDate, endDate) OR Month
        var startDate = params.startDate;
        var endDate = params.endDate;

        var include = false;

        if (startDate && endDate) {
            // String comparison "2025-12-01"
            if (dateStr >= startDate && dateStr <= endDate) {
                include = true;
            }
        } else if (month) {
            if (dateStr.indexOf(month) === 0) {
                include = true;
            }
        }

        // If no filters are provided, do we return everything? 
        // Typically yes, or maybe limit to recent? 
        // Let's default to FALSE if specific filters are expected, but for now allow ALL if no filter?
        // Actually, the API seems to always send startDate/endDate. 
        // If someone calls it without params, let's return everything (uncomment below if desired).
        // if (!startDate && !endDate && !month) include = true;

        if (include) {
            try {
                var attendanceObj = JSON.parse(dataStr);
                result.push({
                    date: dateStr, // Return the normalized date string
                    attendance: attendanceObj
                });
            } catch (e) {
                // ignore bad json
            }
        }
    }

    return jsonResponse({
        "attendance": result,
        "debug": {
            "receivedStart": startDate,
            "receivedEnd": endDate,
            "scannedSample": scannedDates,
            "timezone": doc.getSpreadsheetTimeZone()
        }
    });
}

function jsonResponse(data) {
    return ContentService
        .createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}

function updateEmployee(doc, params) {
    var sheet = doc.getSheetByName("Employee List");
    if (!sheet) return jsonResponse({ "error": "Sheet not found" });

    var id = params.id;
    var newSalary = params.salaryPerDay;

    // Optional: Support updating other fields if needed in future
    // var newName = params.name; 

    var rows = sheet.getDataRange().getValues();
    var headers = rows[0];
    var salaryIndex = headers.indexOf("salaryPerDay");

    if (salaryIndex === -1) return jsonResponse({ "error": "Salary column not found" });

    for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(id)) {
            // Update the specific cell. Row is i + 1 (1-indexed), Column is salaryIndex + 1
            sheet.getRange(i + 1, salaryIndex + 1).setValue(newSalary);
            return jsonResponse({ "result": "success" });
        }
    }
    return jsonResponse({ "error": "Employee not found" });
}

function savePayment(doc, params) {
    var sheet = doc.getSheetByName("Payments");
    if (!sheet) {
        sheet = doc.insertSheet("Payments");
        sheet.appendRow(["timestamp", "employeeId", "amount", "note", "startDate", "endDate"]); // Header
    }

    var timestamp = new Date().toISOString();
    var employeeId = params.employeeId;
    var amount = params.amount;
    var note = params.note;
    var startDate = params.startDate; // Filter context
    var endDate = params.endDate;     // Filter context

    // Check if a payment for this context already exists to update it?
    // For simplicity, let's just append. A more advanced version might update.
    // Actually, user wants to "maintain account", so usually simple ledger (append) is best.
    // BUT, if they edit the "Paid" field in the UI, they probably expect it to update that specific entry?
    // Let's assume one "Payment Record" per "Salary Calculation Period" per "Employee".
    // That requires checking for existing.

    var rows = sheet.getDataRange().getValues();
    var updated = false;

    // Check last 200 rows for efficiency
    var startRow = Math.max(1, rows.length - 200);
    for (var i = startRow; i < rows.length; i++) {
        var row = rows[i];
        // Match by Employee + Period
        if (String(row[1]) === String(employeeId) &&
            row[4] === startDate &&
            row[5] === endDate) {

            // Found existing record for this period, update it
            sheet.getRange(i + 1, 3).setValue(amount); // Column 3: amount
            sheet.getRange(i + 1, 4).setValue(note);   // Column 4: note
            sheet.getRange(i + 1, 1).setValue(timestamp); // Update timestamp
            updated = true;
            break;
        }
    }

    if (!updated) {
        sheet.appendRow([timestamp, employeeId, amount, note, startDate, endDate]);
    }

    return jsonResponse({ "result": "success" });
}

function getPayments(doc, params) {
    var sheet = doc.getSheetByName("Payments");
    if (!sheet) return jsonResponse({ "payments": [] });

    var rows = sheet.getDataRange().getValues();
    var payments = [];
    var startDate = params.startDate;
    var endDate = params.endDate;

    for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        // Filter by Period if provided
        if (startDate && endDate) {
            if (row[4] !== startDate || row[5] !== endDate) {
                continue;
            }
        }

        payments.push({
            employeeId: row[1],
            amount: row[2],
            note: row[3],
            startDate: row[4],
            endDate: row[5]
        });
    }

    return jsonResponse({ "payments": payments });
}

function handleLogin(params) {
    // Handle case sensitivity from frontend (Username vs username)
    var usernameRaw = params.username || params.Username || "";
    var passwordRaw = params.password || params.Password || "";

    var username = String(usernameRaw).trim().toLowerCase();
    var password = String(passwordRaw).trim();

    if (username === "a.ansarhussain2004@gmail.com" && password === "9344122601") {
        return jsonResponse({ "result": "success" });
    }

    // Also allow 'admin'/'admin' if previously used
    if (username === "admin" && password === "admin") {
        return jsonResponse({ "result": "success" });
    }

    return ContentService
        .createTextOutput(JSON.stringify({
            "result": "error",
            "error": "Invalid credentials. Received: " + usernameRaw + " / " + passwordRaw
        }))
        .setMimeType(ContentService.MimeType.JSON);
}
