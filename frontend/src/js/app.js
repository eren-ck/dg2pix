/* global d3, $, document*/

/**
 * Main controller for the dg2pix prototype
 * @author Eren Cakmak eren.cakmak@uni-konstanz.de
 */

import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/style.css';
import 'bootstrap';
import 'bootstrap-select/js/bootstrap-select';
import 'bootstrap-select/dist/css/bootstrap-select.css';
import '../../../static/materialdesignicons.min.css';

import { initSVG, updateGraphEmbeddingNames } from './init.js';

import {
  getEmbeddings,
  loadDataset,
  getMetaData,
  getZoomLevels,
} from './data.js';

import { PixelVis } from './pixel_vis.js';

import { ZoomNavigator } from './zoom_nav.js';

import { GraphVis } from './graph_vis.js';

// DOM Selector
const selector = '#main-vis svg';
const selectorGraphSVG = '#graph-vis svg';
const selectorGraph = '#graph-vis';

const margin = { top: 0, right: 10, bottom: 10, left: 10 };
const zoomGroupSize = 0.05; // 5 % of the height

let svg, g, zoomGroup, pixelGroup, graphSvg, graphGroup;
let height, width, gHeight, gWidth;
let zoomVis;

export let pixelVis;

/**
 * Document ready functionality
 */
$(document).ready(function() {
  initSVG();
  initViews();
});

/**
 * Initilaize the views
 */
function initViews() {
  // get the svg data
  svg = d3.select(selector);

  // regex for floats
  const floatValues = /[+-]?([0-9]*[.])?[0-9]+/;
  height =
    +svg.style('height').match(floatValues)[0] -
    margin['bottom'] -
    margin['top'];
  width =
    +svg.style('width').match(floatValues)[0] -
    margin['left'] -
    margin['right'];

  g = svg
    .append('g')
    .attr(
      'transform',
      'translate(' + margin['left'] + ', ' + margin['top'] + ')'
    );

  zoomGroup = g.append('g').attr('class', 'zoom-group');

  pixelGroup = g
    .append('g')
    .attr('class', 'pixel-group')
    .attr('transform', 'translate(0, ' + height * zoomGroupSize + ')');

  // load initial data
  const promise = getEmbeddings();
  promise.then(function(data) {
    // init the pixel based visualization and redraw it
    pixelVis = new PixelVis(
      pixelGroup,
      width,
      height * (1 - zoomGroupSize),
      data
    );
    pixelVis.draw();
  });

  // load the zoom navigator vis data
  const promiseMeta = getMetaData();
  promiseMeta.then(function(metaData) {
    // load initial data
    const promiseZoom = getZoomLevels();
    promiseZoom.then(function(data) {
      // init the pixel based visualization and redraw it
      zoomVis = new ZoomNavigator(
        zoomGroup,
        width,
        height * zoomGroupSize,
        metaData,
        data
      );
      zoomVis.draw();
    });
  });

  // initialize the graph vis view
  graphSvg = d3.select(selectorGraphSVG);
  gHeight =
    +graphSvg.style('height').match(floatValues)[0] -
    margin['bottom'] -
    margin['top'];
  gWidth =
    +graphSvg.style('width').match(floatValues)[0] -
    margin['left'] -
    margin['right'];

  graphGroup = graphSvg
    .append('g')
    .attr('class', 'graph-vis-group')
    .attr(
      'transform',
      'translate(' + margin['left'] + ', ' + margin['top'] + ')'
    );

  $(selectorGraph).hide();
}

/**
 * Update the visualization
 */
export function updateVis() {
  // show the spinner
  $('#spinner').show();

  // get the updated embeddings
  const promise = getEmbeddings();
  promise.then(function(data) {
    pixelVis.data = data;
    pixelVis.draw();
  });

  const promiseZoom = getZoomLevels();
  promiseZoom.then(function(data) {
    zoomVis.data = data;
    zoomVis.draw();
  });
}

/**
 * Change the dataset
 */
export function updateDataset() {
  // show the spinner
  $('#spinner').show();

  const newData = +$('#dataset-option')
    .find('option:selected')
    .attr('data');

  loadDataset(newData).then(function() {
    updateVis();
    updateGraphEmbeddingNames();

    $(selectorGraph).hide();
  });
}

/**
 * Draw the graph
 */
export function drawGraphVis(data) {
  // show the spinner
  $('#spinner').show();

  // delete old graph vis
  graphGroup.selectAll('*').remove();
  $(selectorGraph).show();

  new GraphVis(graphGroup, gWidth, gHeight, data);
}
