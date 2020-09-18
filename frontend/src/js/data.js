/* global $, d3 */

/**
 * Load the data from the backend with ajax queries
 * @author Eren Cakmak eren.cakmak@uni-konstanz.de
 */

import { updateVis, drawGraphVis } from './app.js';

// DOM Selector
const selXReorder = '#temporal-reordering-option';
const selYReorder = '#reordering-option';

const url = 'http://127.0.0.1:8000/';
const JSONAPI_MIMETYPE = 'application/vnd.api+json';

/**
 * Return the loaded sorted embeddings
 * @return {Promise} Return promise
 */
export function getEmbeddings() {
  const xAxis = $(selXReorder)
    .find('option:selected')
    .attr('metric');
  const yAxis = $(selYReorder)
    .find('option:selected')
    .attr('metric');

  let embedding = 0;
  if (xAxis == 'rank') {
    if (!d3.select('.col-g.selected').empty()) {
      embedding = d3.select('.col-g.selected').attr('position');
    }
  }

  return $.ajax({
    url: url + 'get_embeddings',
    type: 'GET',
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    data: { x: xAxis, y: yAxis, rank_embedding: embedding },
    headers: {
      Accept: JSONAPI_MIMETYPE,
    },
  });
}

/**
 * Load the dataset with the idx with idx being the
 * index position of dataset in list of avaiable
 * @param {Number} idx Index position of the dataset
 * @return {Promise} Return promise
 */
export function loadDataset(idx) {
  return $.ajax({
    url: url + 'load_dataset/' + idx,
    type: 'POST',
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    headers: {
      Accept: JSONAPI_MIMETYPE,
    },
  });
}

/**
 * Get all the graph embeddings avaiable for a dataset
 * @return {Promise} Return promise
 */
export function getEmbeddingNames() {
  return $.ajax({
    url: url + 'get_embedding_names',
    type: 'GET',
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    headers: {
      Accept: JSONAPI_MIMETYPE,
    },
  });
}

/**
 * Load the graph embedding with the name (e.g. graph2vec)
 * @param {String} name name of the graph embedding
 */
export function loadEmbedding(name) {
  $.ajax({
    url: url + 'load_embedding/' + name,
    type: 'POST',
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    headers: {
      Accept: JSONAPI_MIMETYPE,
    },
    success: function() {
      updateVis();
    },
  });
}

/**
 * Get the array of zooms for the zoom level bar
 * @return {Promise} Return promise
 */
export function getZoomLevels() {
  return $.ajax({
    url: url + 'get_zoom_levels',
    type: 'GET',
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    headers: {
      Accept: JSONAPI_MIMETYPE,
    },
  });
}

/**
 * Get meta data to the loaded dataset
 * @return {Promise} Return promise
 */
export function getMetaData() {
  return $.ajax({
    url: url + 'get_meta_data',
    type: 'GET',
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    headers: {
      Accept: JSONAPI_MIMETYPE,
    },
  });
}

/**
 * Zoom into the pixel vis using the the positions array
 * @param {Array} positions array of positions
 */
export function zoomIn(positions) {
  $('#spinner').show();
  $.ajax({
    url: url + 'zoom_in',
    type: 'POST',
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    headers: {
      Accept: JSONAPI_MIMETYPE,
    },
    data: JSON.stringify(positions),
    success: function() {
      updateVis();
    },
  });
}

/**
 * Zoom out the pixel vis using the the positions array
 * @param {Array} positions array of positions
 */
export function zoomOut(positions) {
  $('#spinner').show();
  $.ajax({
    url: url + 'zoom_out',
    type: 'POST',
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    headers: {
      Accept: JSONAPI_MIMETYPE,
    },
    data: JSON.stringify(positions),
    success: function() {
      updateVis();
    },
  });
}

/**
 * Get the supergraph for the indicies
 * @param {Array} indices array of positions
 */
export function getGraphs(indices) {
  $('#spinner').show();
  $.ajax({
    url: url + 'graphs',
    type: 'POST',
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    headers: {
      Accept: JSONAPI_MIMETYPE,
    },
    data: JSON.stringify(indices),
    success: function(data) {
      drawGraphVis(data);
    },
  });
}
