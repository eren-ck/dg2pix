/* global $, d3, alert*/
'use strict';

/**
 * Initilaize svg and listerners for buttons etc.
 * @author Eren Cakmak eren.cakmak@uni-konstanz.de
 */

import { updateDataset, updateVis } from './app.js';
import {
  getEmbeddingNames,
  loadEmbedding,
  zoomIn,
  zoomOut,
  getGraphs,
} from './data.js';

// DOM Selector
const selector = '#main-vis';
const selectorGraph = '#graph-vis';

/**
 * Initilaize the responsive SVGs in the overview and details div
 */
export function initSVG() {
  _appendResponsiveSVG(selector);
  _appendResponsiveSVG(selectorGraph);
  _initToolbar();
}

/**
 * Append responsive SVGs to the selector div
 * @param {selector} selector of the div to which the svg should be added
 */
function _appendResponsiveSVG(selector) {
  const elm = $(selector)
    .parent()
    .parent();
  const width = parseInt(elm.width());
  const height = parseInt(elm.height()) * 0.95;

  d3.select(selector)
    .append('div')
    .classed('svg-container', true)
    .append('svg')
    .attr('preserveAspectRatio', 'xMinYMin meet')
    .attr('viewBox', '0 0 ' + width + ' ' + height + '')
    .classed('svg-content-responsive', true);

  /* depends on svg ratio, for  1240/1900 = 0.65 so padding-bottom = 65% */
  const percentage = Math.ceil((height / width) * 100);
  $(selector).append(
    $(
      '<style>' +
        selector +
        '::after {padding-top: ' +
        percentage +
        '%;display: block;content: "";}</style> '
    )
  );
}

/**
 * Initilaize the toolbar
 */
function _initToolbar() {
  $('#dataset-option').on('change', function() {
    updateDataset();
  });

  $('#reordering-option').on('change', function() {
    updateVis();
  });

  $('#temporal-reordering-option').on('change', function() {
    updateVis();
  });

  // show graphs listener and remover
  $('#button-show-graphs').click(function() {
    $(selectorGraph).show();

    const selected = d3.selectAll('.col-g.selected');

    if (selected.empty()) {
      alert('Please select a pixel bar first.');
    } else {
      const positions = [];
      selected.each(function() {
        positions.push(d3.select(this).attr('position'));
      });
      d3.selectAll('.selected').classed('selected', false);

      getGraphs(positions);
    }
  });

  $('#button-remove-graphs').click(function() {
    $(selectorGraph).hide();
  });

  updateGraphEmbeddingNames();

  _zoomButtons();
}

/**
 * Update the embeddings list names
 */
export function updateGraphEmbeddingNames() {
  // remove old text
  $('#graph-embedding-option').empty();

  const promise = getEmbeddingNames();
  promise.then(function(names) {
    const nameOptions = names
      .map(function(name) {
        return '<option id="' + name + '">' + name + '</option>';
      })
      .join();

    $('#graph-embedding-option')
      .append(nameOptions)
      .selectpicker('refresh')
      .selectpicker('selectAll');

    /**
     * On click listener for the nodes filter option
     */
    $('#graph-embedding-option').on('change', function() {
      const name = $.map($(this).find('option:selected'), function(o) {
        return o['id'];
      });
      loadEmbedding(name);
    });
  });
}

/**
 * Initialize the zoom button functionality
 */
export function _zoomButtons() {
  $('#button-zoom-in').click(function() {
    // get all selected indices
    const selected = d3.selectAll('.col-g.selected');

    if (selected.empty()) {
      alert('Please select a pixel bar first.');
    } else {
      const positions = [];
      selected.each(function() {
        positions.push(d3.select(this).attr('position'));
      });
      d3.selectAll('.selected').classed('selected', false);

      zoomIn(positions);
    }
  });

  $('#button-zoom-out').click(function() {
    // get all selected indices
    const selected = d3.selectAll('.col-g.selected');

    if (selected.empty()) {
      alert('Please select a pixel bar first.');
    } else {
      const positions = [];
      selected.each(function() {
        positions.push(d3.select(this).attr('position'));
      });
      d3.selectAll('.selected').classed('selected', false);

      zoomOut(positions);
    }
  });
}

// init bootstrap tooltips
$(function() {
  $('[data-toggle="tooltip"]').tooltip();
});
