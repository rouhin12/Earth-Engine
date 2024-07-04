// Load the table
var table = ee.FeatureCollection('projects/amrutvahini-watergis/assets/Bhandara_Boundary_shape_file');

// Function to calculate water area for a given date range
var calculateWaterArea = function(startDate, endDate) {
  // Filter the image collection
  var image = imageCollection
      .filterDate(startDate, endDate)
      .filterBounds(table)
      .mosaic()
      .clip(table);
  
  // NDWI = (green - nir) / (green + nir)
  var ndwi = image.normalizedDifference(['B3', 'B8']);
  
  // NDWI > 0 -> water bodies
  var ndwi_binary = ndwi.expression(
    'b(0) > 0 ? 1 : 0',
    {b: ndwi}
  );

  var water = ndwi_binary.eq(1).selfMask();
  
  // Calculate the area of water
  var waterArea = water.multiply(ee.Image.pixelArea())
                      .reduceRegion({
                        reducer: ee.Reducer.sum(),
                        geometry: table,
                        scale: 30,
                        maxPixels: 1e8
                      });

  return ee.Feature(null, {
    'date': startDate,
    'water_area': waterArea.get('constant')
  });
};

// Generate date ranges for each month from 2017 to 2024
var startDate = ee.Date('2017-01-01');
var endDate = ee.Date('2024-01-01');
var dateList = ee.List.sequence(0, endDate.difference(startDate, 'month').subtract(1))
                      .map(function(monthOffset) {
                        var start = startDate.advance(monthOffset, 'month');
                        var end = start.advance(1, 'month');
                        return ee.List([start.format('YYYY-MM-dd'), end.format('YYYY-MM-dd')]);
                      });

// Map the calculateWaterArea function over the date ranges
var waterAreaFeatures = dateList.map(function(dateRange) {
  dateRange = ee.List(dateRange);
  return calculateWaterArea(dateRange.get(0), dateRange.get(1));
});

var waterAreaCollection = ee.FeatureCollection(waterAreaFeatures);

// Export the results as a CSV file to Google Drive
Export.table.toDrive({
  collection: waterAreaCollection,
  description: 'monthly_water_area_2017_2024',
  fileFormat: 'CSV',
  folder: 'EarthEngineExports'  // Name of the folder in your Google Drive
});
