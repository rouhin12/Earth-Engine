// Load Sentinel-2 image collection
var imageCollection = ee.ImageCollection('COPERNICUS/S2')
                          .filterDate("2022-11-01", "2022-11-20");

// Cloud masking function using Sentinel-2 QA60 band
function maskClouds(image) {
  var cloudBitMask = ee.Number(2).pow(10).int();
  var cirrusBitMask = ee.Number(2).pow(11).int();
  
  // Get QA60 band for cloud and cirrus bitmasks
  var qa = image.select('QA60');
  
  // Mask cloudy and cirrus areas
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
               .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  
  return image.updateMask(mask);
}

// Apply cloud masking and mosaic the images
var image = imageCollection.map(maskClouds)
                           .mosaic();

Map.addLayer(image, {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000}, 'True Color Composite');

// 1. Calculate NDWI = (Green - NIR) / (Green + NIR)
var ndwi = image.normalizedDifference(['B3', 'B8']);
Map.addLayer(ndwi, {min: -1, max: 1, palette: ['blue', 'white', 'green']}, 'NDWI');

// 2. Thresholding NDWI for water bodies
var ndwi_binary = ndwi.gt(0).selfMask();
Map.addLayer(ndwi_binary, {palette: ['blue']}, 'Water Bodies');

// 3. Calculate NDVI = (NIR - Red) / (NIR + Red) to analyze vegetation
var ndvi = image.normalizedDifference(['B8', 'B4']);
Map.addLayer(ndvi, {min: -1, max: 1, palette: ['brown', 'white', 'green']}, 'NDVI');

// 4. Calculate Normalized Burn Ratio (NBR) = (NIR - SWIR2) / (NIR + SWIR2) for burned areas
var nbr = image.normalizedDifference(['B8', 'B12']);
Map.addLayer(nbr, {min: -1, max: 1, palette: ['yellow', 'white', 'black']}, 'NBR (Burned Areas)');

// 5. Edge Detection using Sobel operator (on the NDWI result)
var sobelX = ee.Kernel.fixed(3, 3, [
  [-1, 0, 1],
  [-2, 0, 2],
  [-1, 0, 1]
]);

var sobelY = ee.Kernel.fixed(3, 3, [
  [-1, -2, -1],
  [ 0,  0,  0],
  [ 1,  2,  1]
]);

// Apply the Sobel filter to detect edges in both X and Y directions
var edgesX = ndwi.convolve(sobelX).abs();
var edgesY = ndwi.convolve(sobelY).abs();
var edges = edgesX.add(edgesY);

Map.addLayer(edges, {min: 0, max: 0.3, palette: ['white', 'black']}, 'Edges (NDWI)');

// 6. Convert NDWI to integer for entropy calculation
var ndwi_int = ndwi.multiply(10000).toInt32(); // Scale NDWI values for entropy
var entropy = ndwi_int.entropy(ee.Kernel.square(5));
Map.addLayer(entropy, {min: 0, max: 5, palette: ['black', 'white']}, 'Texture (Entropy)');
// Define the ROI (region of interest)
var roi = ee.FeatureCollection('projects/amrutvahini-watergis/assets/Bhandara_Boundary_shape_file');
print(roi);

// Add the ROI boundary with no fill, only the border
Map.addLayer(roi.style({fillColor: '00000000', color: 'FF0000', width: 2}), {}, 'ROI Border');

// Center the map on the ROI
Map.centerObject(roi);
