
// --- CONFIGURATION ---
var SCRIPT_PROP = PropertiesService.getScriptProperties();

// Sheets Setup
function setup() {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    SCRIPT_PROP.setProperty("key", doc.getId());
    return "Setup Complete. ID: " + doc.getId();
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
    // Shorter lock wait for login, longer for concurrent writes
    lock.waitLock(30000);

    try {
        var action = e.parameter.action;

        // 0. HANDLE LOGIN (No Database/Sheet access needed)
        if (action === "login") {
            lock.releaseLock();
            return handleLogin(e.parameter);
        }

        // 1. GET SPREADSHEET
        // Try getting ID from Properties Service
        var docId = SCRIPT_PROP.getProperty("key");
        var doc;

        if (docId) {
            try {
                doc = SpreadsheetApp.openById(docId);
            } catch (err) {
                // If stored ID is invalid, fall through to try ActiveSpreadsheet
                console.error("Stored ID invalid: " + err);
            }
        }

        // Fallback: If no ID or invalid, try ActiveSpreadsheet (works for Container-Bound scripts)
        if (!doc) {
            try {
                doc = SpreadsheetApp.getActiveSpreadsheet();
            } catch (err) {
                // Ignore
            }
        }

        if (!doc) {
            throw new Error("Could not find Spreadsheet. Please run the setup() function in the script editor.");
        }

        // 2. INVENTORY ACTIONS
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

            // 3. EMPLOYEE ACTIONS
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
        // Ensure lock is released
        if (lock.hasLock()) {
            lock.releaseLock();
        }
    }
}

// --- HELPER FUNCTIONS ---

// --- INVENTORY FUNCTIONS ---
function getInventory(doc) {
    var sheet = doc.getSheetByName("Inventory");
    if (!sheet) return jsonResponse({ "inventory": [] });
    var rows = sheet.getDataRange().getValues();
    var headers = rows[0];
    var data = [];
    for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        var obj = {};
        for (var j = 0; j < headers.length; j++) {
            obj[headers[j]] = row[j];
        }
        data.push(obj);
    }
    return jsonResponse({ "inventory": data });
}

function addStock(doc, params) {
    var sheet = doc.getSheetByName("Inventory");
    if (!sheet) {
        sheet = doc.insertSheet("Inventory");
        sheet.appendRow(["color", "quantity", "notes", "timestamp"]);
    }
    sheet.appendRow([params.color, params.quantity, params.notes, new Date()]);
    return jsonResponse({ "result": "success" });
}

function useStock(doc, params) {
    var sheet = doc.getSheetByName("Inventory");
    if (!sheet) {
        return jsonResponse({ "error": "Inventory sheet not found" });
    }
    sheet.appendRow([params.color, "-" + params.quantity, "Used", new Date()]);
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
    var sheet = doc.getSheetByName("Colors");
    if (!sheet) return jsonResponse({ "error": "Colors sheet not found" });

    var colorName = params.colorName;
    var rows = sheet.getDataRange().getValues();

    // Loop through rows to find the color
    for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]).toLowerCase() === String(colorName).toLowerCase()) {
            sheet.deleteRow(i + 1); // Delete the row (1-indexed)

            // Also optionally delete associated inventory?
            // For now, just delete the color definition as requested.
            // If strict integrity is needed, we should also clear inventory checks, 
            // but usually this is enough.

            return jsonResponse({ "result": "success" });
        }
    }
    return jsonResponse({ "error": "Color not found" });
}


// --- EMPLOYEE FUNCTIONS ---

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
            if (row[0]) {
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

    var id = new Date().getTime().toString();
    sheet.appendRow([
        id,
        params.name,
        params.position,
        params.salaryPerDay,
        params.dateOfJoining,
        params.photo
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
            sheet.deleteRow(i + 1);
            return jsonResponse({ "result": "success" });
        }
    }
    return jsonResponse({ "error": "Employee not found" });
}

function markAttendance(doc, params) {
    var sheet = doc.getSheetByName("Attendance");
    if (!sheet) {
        sheet = doc.insertSheet("Attendance");
        sheet.appendRow(["date", "attendanceData"]);
    }

    var date = params.date;
    var newData = params.attendance;

    var rows = sheet.getDataRange().getValues();
    var rowIndex = -1;

    for (var i = 1; i < rows.length; i++) {
        var rowDate = rows[i][0];
        if (rowDate instanceof Date) {
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
        sheet.getRange(rowIndex, 2).setValue(newData);
    } else {
        sheet.appendRow([date, newData]);
    }

    return jsonResponse({ "result": "success" });
}

function getAttendance(doc, params) {
    var sheet = doc.getSheetByName("Attendance");
    if (!sheet) return jsonResponse({ "attendance": [] });

    var rows = sheet.getDataRange().getValues();
    var result = [];
    var startDate = params.startDate;
    var endDate = params.endDate;

    for (var i = 1; i < rows.length; i++) {
        var rowDate = rows[i][0];
        var dataStr = rows[i][1];
        var dateStr = "";

        if (rowDate instanceof Date) {
            dateStr = Utilities.formatDate(rowDate, doc.getSpreadsheetTimeZone(), "yyyy-MM-dd");
        } else {
            dateStr = String(rowDate).trim();
        }

        var include = true;

        // Improve Filter logic:
        if (startDate && endDate) {
            // String comparison assumption (YYYY-MM-DD)
            if (dateStr < startDate || dateStr > endDate) {
                include = false;
            }
        }

        if (include) {
            try {
                var attendanceObj = JSON.parse(dataStr);
                result.push({
                    date: dateStr,
                    attendance: attendanceObj
                });
            } catch (e) {
                // ignore bad json
            }
        }
    }

    return jsonResponse({ "attendance": result });
}

function updateEmployee(doc, params) {
    var sheet = doc.getSheetByName("Employee List");
    if (!sheet) return jsonResponse({ "error": "Sheet not found" });

    var id = params.id;
    var newSalary = params.salaryPerDay;

    var rows = sheet.getDataRange().getValues();
    var headers = rows[0];
    var salaryIndex = headers.indexOf("salaryPerDay");

    if (salaryIndex === -1) return jsonResponse({ "error": "Salary column not found" });

    for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(id)) {
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
    var startDate = params.startDate;
    var endDate = params.endDate;

    var rows = sheet.getDataRange().getValues();
    var updated = false;

    // Check last 200 rows for efficiency
    var startRow = Math.max(1, rows.length - 200);
    for (var i = startRow; i < rows.length; i++) {
        var row = rows[i];
        if (String(row[1]) === String(employeeId) &&
            row[4] === startDate &&
            row[5] === endDate) {

            // Update existing record
            sheet.getRange(i + 1, 3).setValue(amount);
            sheet.getRange(i + 1, 4).setValue(note);
            sheet.getRange(i + 1, 1).setValue(timestamp);
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

    // Returns ALL payments for valid calculation. 
    // Filtering should optionally happen in frontend or logic if needed, 
    // but for 'Lifetime Balance' we need everything.

    for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        payments.push({
            employeeId: row[1],
            amount: row[2],
            note: row[3],
            startDate: row[4],
            endDate: row[5],
            timestamp: row[0]
        });
    }

    return jsonResponse({ "payments": payments });
}

function handleLogin(params) {
    var usernameRaw = params.username || params.Username || "";
    var passwordRaw = params.password || params.Password || "";
    var username = String(usernameRaw).trim().toLowerCase();
    var password = String(passwordRaw).trim();

    if (username === "a.ansarhussain2004@gmail.com" && password === "9344122601") {
        return jsonResponse({ "result": "success" });
    }
    if (username === "admin" && password === "admin") {
        return jsonResponse({ "result": "success" });
    }
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": "Invalid credentials" })).setMimeType(ContentService.MimeType.JSON);
}

function jsonResponse(data) {
    return ContentService
        .createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}
