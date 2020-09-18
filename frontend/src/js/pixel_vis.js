/* global d3, $ */

/**
 * dg2pix as a JS class
 * @author Eren Cakmak eren.cakmak@uni-konstanz.de
 */

const margin = { top: 0, right: 30, bottom: 10, left: 0 };

/**
 * Class for the pixel based visualization. The class is used for the main view
 */
export class PixelVis {
  /**
   * Constructor for the level class
   * @param {svg} g svg group to add the pixel vis
   * @param {Number} width width of the group element
   * @param {Number} height height of the group element
   * @param {Array} data array of embeddings
   */
  constructor(g, width, height, data) {
    this._svg = g;
    this._width = width - margin['right'] - margin['left'];
    this._height = height - margin['top'] - margin['bottom'];
    this._data = data['embeddings'];
    this._order = data['ordering'];
    this._clusterIdx = data['cluster_idx'];

    // add a a clipping path around the group
    this._clip = this._svg
      .append('defs')
      .append('clipPath')
      .attr('id', 'clip-pixel')
      .append('rect')
      .attr('x', margin['left'])
      .attr('y', margin['top'])
      .attr('width', this._width)
      .attr('height', this._height);

    this._zoom = this._svg
      .append('g')
      .attr('class', 'zoom-group')
      .attr('clip-path', 'url(#clip-pixel)');

    // append zoom rectangle to the zoom group
    // a rectangle to active the zoom every where in the group
    this._selectionRect = this._zoom
      .append('rect')
      .attr('class', 'selection-group-rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this._width)
      .attr('height', this._height);

    // append the g for the group
    this._g = this._zoom
      .append('g')
      .attr('class', 'pixel-vis')
      .attr(
        'transform',
        'translate(' + margin['left'] + ', ' + margin['top'] + ')'
      );
  }

  /**
   * Draw the pixel based visualization
   */
  draw() {
    const that = this;

    let extent = d3.extent(d3.merge(this._data), Number);
    extent = [extent[0], 0, extent[1]];

    const color = d3
      .scaleLinear()
      .domain(extent)
      .range(['#67001f', '#f7f7f7', '#053061']);

    let rectWidth =
      Math.floor(this._width / this._data.length) > 0
        ? Math.floor(this._width / this._data.length)
        : 1;
    let rectHeight =
      Math.floor(this._height / this._data[0].length) > 0
        ? Math.floor(this._height / this._data[0].length)
        : 1;

    const xScale = d3
      .scaleLinear()
      .domain([0, this._data.length])
      .range([0, this._width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, this._data[0].length])
      .range([0, this._height]);

    // append brush
    const brush = d3
      .brushX() // Add the brush feature using the d3.brush function
      .extent([
        [0, 0],
        [this._width, this._height],
      ])
      .on('end', function() {
        // Selection check
        const selection = d3.event.selection;

        // one click on a pixel bar
        if (!d3.event.sourceEvent || !selection) {
          const x = d3.mouse(this)[0];
          const idx = Math.floor(xScale.invert(x));
          const idx2 = that._g.select('#col-g-' + idx).attr('position');

          if (!that._g.select('#col-g-' + idx).classed('selected')) {
            that._g.select('#col-g-' + idx).classed('selected', true);
            that._g.select('#zoom-rect-' + idx2).classed('selected', true);
          } else {
            that._g.select('#col-g-' + idx).classed('selected', false);
            that._g.select('#zoom-rect-' + idx2).classed('selected', false);
          }
          return;
        }

        // highlight the selection
        const [x0, x1] = selection.map((d) => Math.floor(xScale.invert(d)));

        for (let i = x0; i < x1; i++) {
          const idx2 = that._g.select('#col-g-' + i).attr('position');

          if (!that._g.select('#col-g-' + i).classed('selected')) {
            that._g.select('#col-g-' + i).classed('selected', true);
            that._g.select('#zoom-rect-' + idx2).classed('selected', true);
          } else {
            that._g.select('#col-g-' + i).classed('selected', false);
            that._g.select('#zoom-rect-' + idx2).classed('selected', false);
          }
        }
        that._zoom.call(brush.move, null);
      });

    this._zoom.call(brush);

    this._zoom
      .select('.overlay')
      .on('mouseout', function() {
        that._g.selectAll('.col-g').classed('highlighted', false);
        d3.selectAll('.zoom-rect').classed('highlighted', false);
        d3.select('#tooltip').classed('hide', true);
      })
      .on('mousemove', function() {
        // mouse over the d3 overlay which computes the positions backwards for mouse over effect
        const x = d3.mouse(this)[0];
        const idx = Math.floor(xScale.invert(x));
        const idx2 = that._g.select('#col-g-' + idx).attr('position');

        if (!that._g.select('#col-g-' + idx).classed('highlighted')) {
          that._g.selectAll('.col-g').classed('highlighted', false);
          that._g.select('#col-g-' + idx).classed('highlighted', true);

          d3.selectAll('.zoom-rect').classed('highlighted', false);
          d3.select('#zoom-rect-' + idx2).classed('highlighted', true);
        }

        const t1 = d3.select('#zoom-rect-' + idx2).attr('time-1');
        const t2 = d3.select('#zoom-rect-' + idx2).attr('time-2');
        // show tooltip
        d3.select('#tooltip')
          .style('left', that._width / 2 + 'px')
          .style('top', '-40px')
          .classed('hide', false)
          .select('p')
          .html('Start: ' + t1 + '<br/>End: ' + t2);
      });

    // JOIN the svg groups
    const colGroups = this._g.selectAll('.col-g').data(this._data);

    this._colGroupsEnter = colGroups
      .enter()
      .append('g')
      .merge(colGroups)
      .attr('class', 'col-g')
      .attr('id', function(d, i) {
        return 'col-g-' + i;
      })
      .attr('position', function(d, i) {
        return that._order[i];
      });

    this._colGroupsEnter
      .transition()
      .delay(function(d, i) {
        return i * 10;
      })
      .attr('transform', function(d, i) {
        return 'translate(' + xScale(i) + ',0)';
      });

    // EXIT the groups
    colGroups.exit().remove();

    const cells = this._colGroupsEnter.selectAll('.cell').data(function(d) {
      return d;
    });

    // ENTER add rects
    this._cellsEnter = cells
      .enter()
      .append('rect')
      .merge(cells)
      .attr('class', 'cell')
      .attr('width', rectWidth)
      .attr('height', rectHeight)
      .style('fill', function(d) {
        return color(d);
      });

    this._cellsEnter
      .transition()
      .delay(function(d, i) {
        return i * 10;
      })
      .attr('x', 0)
      .attr('y', function(d, i) {
        return yScale(i);
      });

    // EXIT cells
    cells.exit().remove();

    // append the bounding boxes for the cluster rectangles
    const clusterRect = this._g
      .selectAll('.cluster-rect')
      .data(this._clusterIdx);

    clusterRect
      .enter()
      .append('rect')
      .merge(clusterRect)
      .attr('class', 'cluster-rect')
      .attr('x', function(d) {
        return xScale(d[0]);
      })
      .attr('width', function(d) {
        return xScale(Math.abs(d[1] - d[0]));
      })
      .attr('height', this._height);

    // EXIT cells
    clusterRect.exit().remove();
    // hide the spinner
    $('#spinner').hide();
  }

  /**
   * Update the x scale
   */
  xScale(newXScale) {
    this._colGroupsEnter
      .transition()
      .delay(function(d, i) {
        return i * 10;
      })
      .attr('transform', function(d, i) {
        return 'translate(' + newXScale(i) + ',0)';
      });

    const newRectWidth = Math.abs(newXScale(0) - newXScale(1));

    this._cellsEnter
      .transition()
      .delay(function(d, i) {
        return i * 10;
      })
      .attr('width', newRectWidth);
  }
  /**
   * SETTER AND GETTER
   */

  /**
   * Set the data
   */
  set data(data) {
    this._data = data['embeddings'];
    this._order = data['ordering'];
    this._clusterIdx = data['cluster_idx'];
  }
}
