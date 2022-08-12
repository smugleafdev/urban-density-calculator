/**
 * @OnlyCurrentDoc
 */

function rankAllScores() {
  const spreadsheet = SpreadsheetApp.getActive();
  const sheets = spreadsheet.getSheets();
  const sheet = spreadsheet.getSheetByName("Rankings")

  let lastRow = getLastNonEmptyRowByColumnArray(sheet)
  if (lastRow > 1) {
    Logger.log("Clearing " + lastRow-1 + " rows...")
    sheet.getRange(2, 1, lastRow - 1, 3).clearContent()
  }

  const fillArray = []

  sheets.forEach(s => {
    Logger.log("Checking sheet " + s.getSheetName())
    const r2 = s.getRange("R2").getValue()
    if (s.getRange("R1").getValue() == "POIs" && r2 > 1) {
      const a1 = s.getRange("A1").getValue()
      const s2 = s.getRange("S2").getValue()
      Logger.log(a1 + " " + r2 + " " + s2)
      fillArray.push([a1,r2,s2])
    }
  })

  fillArray.sort(function(a, b) {
    return a[2] - b[2]
  })

  sheet.getRange(2, 1, fillArray.length, fillArray[0].length).setValues(fillArray)
}

function populateSheet() {
  const startTime = new Date().getTime()
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet()
  Logger.log("Sheet: " + sheet.getName())

  let currRow = 3
  while (getCategoryOrCoord(currRow)) {
    const column = getCategoryOrCoord(currRow)
    if (column == 17) {
      getNearest(currRow)
    } else if (column == 15) {
      getTravelTime(currRow)
    } else {
      Logger.log("Empty row. Exiting...")
    }
    currRow++
  }

  toggleRows()

  const endTime = new Date().getTime()
  Logger.log("Execution time: " + (endTime-startTime) + "ms")
}

function toggleRows() {
  const startTime = new Date().getTime()
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet()
  const lastRow = getLastNonEmptyRowByColumnArray()
  
  if (lastRow < 3) {
    return
  }

  const range = sheet.getRange(1, 1, lastRow, 1)
  let values = range.getValues()

  const rowsToToggle = []
  let currRow = 2
  let currRowValue = values[currRow]
  let shouldShow = false
  let toggleSet = false
  while (currRowValue && !shouldShow) {
    if (currRowValue == "None" || currRowValue == "None within range") { // "None within range"
      if (!toggleSet) {
        shouldShow = sheet.isRowHiddenByUser(currRow+1)
        toggleSet = true
      }
      rowsToToggle.push(currRow)
    }
    currRow++
    currRowValue = values[currRow]
  }

  if (shouldShow) {
    sheet.showRows(3, lastRow)
  } else {
    Logger.log("Rows to hide: " + rowsToToggle)
    let i = 0
    while (i < rowsToToggle.length) {
      let currItem = rowsToToggle[i]
      let currItem2 = rowsToToggle[i]+1
      let numRows = 1
      while (i < rowsToToggle.length && rowsToToggle[i+1] - currItem == 1) {
        numRows++
        i++
        currItem = rowsToToggle[i]
      }
      Logger.log("Hiding row " + currItem2 + " and numRows " + numRows)
      sheet.hideRows(currItem2, numRows)
      i++
    }
  }

  const endTime = new Date().getTime()
  Logger.log("Execution time: " + (endTime-startTime) + "ms")
}

function getLastNonEmptyRowByColumnArray(sht) {
  const sheet = sht || SpreadsheetApp.getActiveSpreadsheet().getActiveSheet()
  let column = sheet.getRange('A:A');
  let values = column.getValues();
  let ct = 0;
  while ( values[ct] && values[ct][0] != "" ) {
    ct++;
  }
  return ct
}

function getCategoryOrCoord(row) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet()
  let column = sheet.getRange(row, 17).getValue() // 16 = P/Category ("bar"), 17 = Q/ID (563)
  if (column && column != "#N/A") {
    return 17
  }
  column = sheet.getRange(row, 15).getValue() // 15 = O/Lat/Long
  if (column) {
    return 15
  }
  Logger.log("Neither found. End of run.")
  return null
}

function getNearest(row) {
  if (!row) {
    row = 3
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet()
  const startLatLongCell = sheet.getRange("B2").getValue()

  let category = sheet.getRange(row, 17).getValue()

  let lat = startLatLongCell.substr(0, startLatLongCell.indexOf(','))
  let long = startLatLongCell.substr(startLatLongCell.indexOf(' ')+1, startLatLongCell.length)

///////////////////////////////////////////////////////////////////////////

  const urlPoi = 'https://api.openrouteservice.org/pois'
  const apiKey = sheet.getRange("Z1").getValue()

  let body = {
    request: 'pois',
    geometry: {
        buffer: 2000,
        geojson: {
            type: 'Point',
            coordinates: [
                +long,+lat
            ]
        }
    },
    filters: {
        category_ids: category.split(',').map(s => +s)
    },
    limit: 2,
    sortby: 'distance'
  }

  let options = {
    'method': 'post',
    'muteHttpExceptions': true,
    'contentType': 'application/json',
    'headers': {
      'Authorization': apiKey
    },
    'payload': JSON.stringify(body)
  }

  let poiResponse = UrlFetchApp.fetch(urlPoi, options)

  Logger.log("poiResponse: " + poiResponse)

///////////////////////////////////////////////////////////////////////////

  poiResponse = JSON.parse(poiResponse)

  const name = poiResponse?.features?.[0]?.properties?.osm_tags?.name
  if (!name) {
    Logger.log("None within range")
    sheet.getRange(row, 1).setValue("None within range")
    return
  }

  Logger.log("Name: " + name)
  const nearestLong = poiResponse.features[0].geometry.coordinates[0]
  const nearestLat = poiResponse.features[0].geometry.coordinates[1]

  const nearestLatLong = nearestLat + ", " + nearestLong

  sheet.getRange(row, 15).setValue(nearestLatLong) // Set O latlong
  sheet.getRange(row, 1).setValue(name) // Set A location name

  Logger.log("Waiting for 500ms...")
  Utilities.sleep(500) // Rate limit is 60 per minute (and 500 per day)
  getTravelTime(row)
}

function getTravelTime(row) {
  if (!row) {
    row = 3
  }
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet()
  var startLatLongCell = sheet.getRange("B2").getValue()
  var endLatLongCell = sheet.getRange(row, 15).getValue()

  latA = startLatLongCell.substr(0, startLatLongCell.indexOf(','))
  longA = startLatLongCell.substr(startLatLongCell.indexOf(' ')+1, startLatLongCell.length)

  latB = endLatLongCell.substr(0, endLatLongCell.indexOf(','))
  longB = endLatLongCell.substr(endLatLongCell.indexOf(' ')+1, endLatLongCell.length)

///////////////////////////////////////////////////////////////////////////

  var urlCar = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson'
  var urlBike = 'https://api.openrouteservice.org/v2/directions/cycling-regular/geojson'
  let apiKey = sheet.getRange("Z1").getValue()

  var body = {
    'coordinates': [
      [longA, latA],
      [longB, latB]
    ],
    'elevation':'true'
  }

  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': {
      'Authorization': apiKey
    },
    'payload': JSON.stringify(body)
  }

  var carResponse = UrlFetchApp.fetch(urlCar, options)
  var bikeResponse = UrlFetchApp.fetch(urlBike, options)

  Logger.log("Waiting for 100ms...")
  Utilities.sleep(100) // Rate limit is 40 per minute (and 2000 per day)

///////////////////////////////////////////////////////////////////////////

  carResponse = JSON.parse(carResponse)
  bikeResponse = JSON.parse(bikeResponse)

  var carDur = carResponse.features[0].properties.segments[0].duration
  var carDis = carResponse.features[0].properties.segments[0].distance

  var bikeDur = bikeResponse.features[0].properties.segments[0].duration
  var bikeDis = bikeResponse.features[0].properties.segments[0].distance

  var bikeAscent = bikeResponse.features[0].properties.segments[0].ascent
  var bikeDescent = bikeResponse.features[0].properties.segments[0].descent

///////////////////////////////////////////////////////////////////////////

  sheet.getRange(row, 3).setValue(carDur)
  sheet.getRange(row, 4).setValue(carDis)
  sheet.getRange(row, 7).setValue(bikeDur)
  sheet.getRange(row, 8).setValue(bikeDis)
  sheet.getRange(row, 11).setValue(bikeAscent)
  sheet.getRange(row, 12).setValue(bikeDescent)
}

function clearData() {
  const startTime = new Date().getTime()
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet()
  const lastRow = getLastNonEmptyRowByColumnArray()
  
  if (lastRow < 3) {
    return
  }

  sheet.getRange(3, 3, lastRow - 2, 2).clearContent() // C:D
  sheet.getRange(3, 7, lastRow - 2, 2).clearContent() // G:H
  sheet.getRange(3, 11, lastRow - 2, 2).clearContent() // K:L

  const range = sheet.getRange(3, 16, lastRow - 2)
  let values = range.getValues()
  Logger.log("Last row: " + lastRow)
  Logger.log("Values: " + values)
  const noneArray = []

  let offset = 3
  for (let i = 0; i < values.length; i++) {
    if (values[i]) {
      noneArray.push(i + offset)
    }
  }

  Logger.log("Rows to hide: " + noneArray)
  for (let i = 0; i < noneArray.length; i++) {
    let currItem = noneArray[i]
    let currItem2 = noneArray[i]
    let numRows = 1
    while (i < noneArray.length && noneArray[i+1] - currItem == 1) {
      numRows++
      i++
      currItem = noneArray[i]
    }
    Logger.log("Clearing row " + currItem2 + " and numRows " + numRows)
    sheet.getRange(currItem2, 1, numRows).clearContent() // A
    sheet.getRange(currItem2, 15, numRows).clearContent() // O
    i++
  }

  Logger.log("Clearing complete")
  const endTime = new Date().getTime()
  Logger.log("Execution time: " + (endTime-startTime) + "ms")
}
